# FolderColors - Nextcloud App

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Version](https://img.shields.io/badge/version-1.3.2-orange)](https://github.com/josericardopenase/foldercolors/releases)

> **About this port:** This repository is a fork of `foldercolors` maintained specifically for **Nextcloud 34** (tested on NC 34.0.3 / Nextcloud AIO / PostgreSQL). The original app did not keep working on modern versions of Nextcloud (broken MySQL-only DB query, disabled-by-default install, theme-incompatible UI). This port restores full functionality on NC 33-35 and fixes color persistence, so it can be used as a drop-in update for anyone running the original app on version 34.

**FolderColors** lets you give colors to your folders in the Nextcloud web interface. Right-click a folder, pick a color, and the folder icon is tinted immediately. Colors are stored in the database, so they survive page reloads and are the same for every browser you use to log in.

This project is an **updated fork** of the original `foldercolors` app. It keeps the original behavior (context menu, color picker) but fixes the parts that were broken on modern Nextcloud versions and on PostgreSQL.

---

## Table of contents

- [Functionality](#functionality)
- [Changes in this update](#changes-in-this-update)
- [Requirements](#requirements)
- [Installation](#installation)
  - [Option A - Classic Nextcloud install](#option-a---classic-nextcloud-install)
  - [Option B - Nextcloud All-in-One (AIO, Docker)](#option-b---nextcloud-all-in-one-aio-docker)
- [Usage](#usage)
- [How it works (internal)](#how-it-works-internal)
- [Troubleshooting](#troubleshooting)
- [Development / building from source](#development--building-from-source)
- [Roadmap notes](#roadmap-notes)
- [License](#license)
- [Support](#support)

---

## Functionality

| Feature | Explanation |
| --- | --- |
| **Context menu action** | Right-clicking a folder adds a **Cambiar color** entry (with a folder icon) that opens the color picker. |
| **Color picker dialog** | A small modal with a color input (`<input type="color">`), a **Submit** and a **Cancel** button. |
| **Theme-aware styling** | The dialog uses Nextcloud CSS variables (`--color-main-background`, `--color-main-text`, `--color-primary`, …), so it is readable in **both light and dark themes** and follows the look of your Nextcloud. |
| **Instant tinting** | Choosing a color recolors the folder icon in the file list right away (CSS rule keyed on `data-foldercolor`). |
| **Persistent storage** | The color is saved to the database and reloaded when the Files app is opened again. Works on **PostgreSQL, MySQL and SQLite**. |
| **Per-user, per-folder** | Colors are keyed by folder id, so each folder can have its own color. |

---

## Changes in this update

Versions 1.3.0 → 1.3.2, compared to the original `foldercolors` (0.1.x / NC 30):

### 1.3.2 - UI polish
- **Context menu icon fixed**: the action now renders its folder icon. The previous version imported the icon as a webpack asset, which did not render inside `iconSvgInline`; it is now an inline SVG string.
- **Color picker modal redesigned**: the old modal used hardcoded colors and a plain white background. On dark themes the text became invisible (white-on-white). The modal now uses Nextcloud theme variables and unique `fc-*` class names, so it no longer collides with Nextcloud's own CSS and adapts to the active theme.

### 1.3.1 - The important fix: colors were never saved
- The original code used MySQL-only SQL `INSERT ... ON DUPLICATE KEY UPDATE`.
- On **PostgreSQL** (the default DB of Nextcloud AIO, and many other installs) that statement is a **syntax error**, so saving a color always failed, the database table stayed empty, and every folder kept its default color.
- Replaced with a **portable upsert** (try `UPDATE`, and if no row was affected do an `INSERT`). Colors now save correctly on PostgreSQL, MySQL and SQLite.
- Modernized the query API (`executeQuery`/`fetchOne`/`executeStatement`) so it works on Nextcloud 33-35.

### 1.3.0 - Compatibility bump
- `info.xml` now declares **Nextcloud 33-35** and **PHP 8.3-8.5**. The app only needs to be placed in the *custom apps* directory and enabled over the CLI (see below).

---

## Requirements

- **Nextcloud**: 33, 34 or 35 (minimum/maximum declared in `appinfo/info.xml`; adjust there if you run a different major version).
- **PHP**: 8.3 to 8.5.
- **Database**: PostgreSQL, MySQL or SQLite (there is no per-database code anymore).

---

## Installation

> The app is **not on the Nextcloud app store**, so it cannot be installed from **Apps → Browse apps**, and the "Enable" button in **Apps → Disabled apps** will **not** work for it. You must install it by copying the folder and enabling it over the CLI. This is not a bug of this app - it applies to any app that is not part of the store.

### Option A - Classic Nextcloud install

```bash
# 1. copy the app folder into the custom apps directory
sudo cp -r foldercolors /var/www/html/custom_apps/foldercolor

# 2. make sure the web server user owns it
sudo chown -R www-data:www-data /var/www/html/custom_apps/foldercolor

# 3. enable the app (this also runs the migration that creates the oc_folder_colors table)
sudo -u www-data php occ app:enable foldercolor

# check it is enabled
sudo -u www-data php occ app:list | grep foldercolor
```

If your Nextcloud does not have a `custom_apps` directory configured, create it or place the app in `apps/`. After enabling, run `sudo -u www-data php occ upgrade` if Nextcloud does not run it automatically.

### Option B - Nextcloud All-in-One (AIO, Docker)

AIO runs everything as containers. The web container is usually called `nextcloud-aio-nextcloud`.

```bash
# 1. copy the folder into the container (fastest via the host /tmp)
scp -r foldercolor user@server:/tmp/foldercolor
docker cp /tmp/foldercolor nextcloud-aio-nextcloud:/var/www/html/custom_apps/foldercolor

# 2. fix ownership inside the container
docker exec nextcloud-aio-nextcloud chown -R www-data:www-data \
    /var/www/html/custom_apps/foldercolor

# 3. enable (this also runs the migration / version upgrade)
docker exec -u www-data nextcloud-aio-nextcloud php occ app:enable foldercolor
docker exec -u www-data nextcloud-aio-nextcloud php occ app:list | grep foldercolor
```

Then reload the Files page in your browser (a normal refresh is enough - every app version bump changes the `?v=` parameter of the script URLs, which busts the browser cache automatically).

---

## Usage

1. Open the **Files** app.
2. **Right-click** a folder (or use the three-dot menu).
3. Choose **Cambiar color**.
4. Pick a color and press **Submit** (or **Cancel** to discard).
5. The folder icon turns that color immediately. It stays that way after reload.

To change a color again, repeat the steps. To reset a folder to the default color, set a neutral color (e.g. the default folder color) and save.

---

## How it works (internal)

- `lib/Controller/ColorController.php` - REST endpoints `setColor` / `getColor` (routes in `appinfo/routes.php`). `setColor` performs a portable update-then-insert upsert on the `*PREFIX*folder_colors` table (`oc_folder_colors`).
- `lib/Migration/Version1000Date20241015122013.php` - creates the `folder_colors` table (folder_id, color) on install/upgrade.
- `lib/Listener/LoadAdditionalScriptsListener.php` - injects the app's JS and CSS only in the Files app.
- `src/` - TypeScript frontend: registers the file action, shows the modal, calls the API, sets `data-foldercolor` on the row.
- `css/foldercolor.css` - the row rule `tr[data-foldercolor] .files-list__row-icon ... svg path { fill: var(--foldercolor) !important; }` tints the folder icon, plus all modal styling with theme variables.
- `js/main.js` - pre-built bundle, committed, no build needed to install.

---

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Folder keeps the default color after saving | Old versions never saved colors on PostgreSQL. Make sure you run **>= 1.3.1** and that the migration ran (`occ upgrade`) - check the table `oc_folder_colors` has rows. |
| "Enable" button in Apps page does nothing / error "not found on the appstore" | Expected: not in the store. Enable over the CLI (`occ app:enable foldercolor`). |
| App shows as disabled after an AIO container update | Re-enable it: `docker exec -u www-data nextcloud-aio-nextcloud php occ app:enable foldercolor`. |
| Color modal is white / text unreadable | The old modal styling. Run **>= 1.3.2** so the dialog uses theme variables. |
| No icon next to "Cambiar color" in the context menu | Old bug, fixed in **1.3.2** (inline SVG instead of asset import). Hard-refresh (Ctrl+F5) if you still see the old bundle. |
| Wrong version after install | Check with `occ app:list`, and force a browser reload. |

---

## Development / building from source

```bash
git clone <your-fork> foldercolors
cd foldercolors
npm install
npm run build        # outputs js/main.js (webpack)
```

`npm install` may print warnings about the optional `@parcel/watcher` native build; they are harmless. The repository ships the pre-built `js/main.js`, so installation does not require Node.js. After changing `src/`, run `npm run build` and commit the generated `js/main.js` (keep `js/main.js.map` in sync - it is committed too).

---

## Roadmap notes

If you extend this fork, natural next steps:
- localize action label/title so the app is not hard-coded to Spanish,
- add a "reset to default" action,
- offer a palette of preset colors in addition to the free color input.

---

## License

This project is licensed under the terms of the [GNU AGPL v3.0 License](LICENSE). As a fork of the original AGPL-licensed `foldercolors`, any further distribution must keep this license.

## Support

For support, open an issue at the original [GitHub Issues](https://github.com/josericardopenase/foldercolors/issues) page, or on your fork's issues page.