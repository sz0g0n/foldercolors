import { FileType, registerFileAction, type IFileAction } from '@nextcloud/files';
import FolderAPI from './api';
import { FormModal } from './forms';

const FOLDER_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M10,4H4C2.89,4 2,4.89 2,6V18C2,19.1 2.9,20 4,20H20C21.1,20 22,19.1 22,18V8C22,6.9 21.1,6 20,6H12L10,4Z"/></svg>';

function isFolder(node: { type?: string; mime?: string }): boolean {
	return node.type === FileType.Folder || node.mime === 'httpd/unix-directory';
}

function getNodeId(node: { id?: string; fileid?: number }): string | undefined {
	return node.id ?? node.fileid?.toString();
}

export default function registerChangeFolderColorAction(modal: FormModal, api: FolderAPI) {
	const action: IFileAction = {
		id: 'change-folder-color',
		displayName: () => 'Cambiar color',
		enabled: ({ nodes }) => nodes.length === 1 && isFolder(nodes[0]),
		exec: async ({ nodes }) => {
			const node = nodes[0];
			if (!isFolder(node)) {
				return false;
			}

			modal.show();
			modal.handleSubmit(async (values) => {
				const result = values.color;
				const folderId = getNodeId(node);
				if (!result || !folderId) {
					return false;
				}
				await api.saveFolderColorOf(folderId, result);
				return true;
			});

			return null;
		},
		iconSvgInline: () => FOLDER_ICON,
		order: 200,
		inline: () => false,
		title: () => 'Cambiar color',
	};

	registerFileAction(action);
}
