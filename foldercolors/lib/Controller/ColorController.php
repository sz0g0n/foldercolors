<?php

declare(strict_types=1);

namespace OCA\FolderColor\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\JSONResponse;
use OCP\IDBConnection;
use OCP\IRequest;

class ColorController extends Controller {
	public function __construct(
		string $AppName,
		IRequest $request,
		private IDBConnection $db,
	) {
		parent::__construct($AppName, $request);
	}

	#[NoAdminRequired]
	#[NoCSRFRequired]
	public function saveColor(string $folderId, string $color): JSONResponse {
		$updated = $this->db->executeStatement(
			'UPDATE `*PREFIX*folder_colors` SET `color` = ? WHERE `folder_id` = ?',
			[$color, $folderId],
		);

		if ($updated === 0) {
			$this->db->executeStatement(
				'INSERT INTO `*PREFIX*folder_colors` (`folder_id`, `color`) VALUES (?, ?)',
				[$folderId, $color],
			);
		}

		return new JSONResponse(['status' => 'success']);
	}

	#[NoAdminRequired]
	#[NoCSRFRequired]
	public function getColor(string $folderId): JSONResponse {
		$result = $this->db->executeQuery(
			'SELECT `color` FROM `*PREFIX*folder_colors` WHERE `folder_id` = ?',
			[$folderId],
		);
		$color = $result->fetchOne();

		return new JSONResponse(['color' => $color ?: null]);
	}
}
