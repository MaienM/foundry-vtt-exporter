import { join } from 'node:path';
import BaseDatabase from './base.js';

export interface Folder {
	/** The ID. */
	_id: string;

	/** The ID of the parent folder, if any. */
	folder?: string;

	/** The name of the folder. */
	name: string;
}

/**
 * Readonly copy of the FoundryVTT 'folders' database.
 */
class FoldersDatabase extends BaseDatabase<Folder> {
	/** Mapping of folder id -> folder. */
	#folders: Record<string, Folder> = {};

	protected async init() {
		for await (const entry of this.values()) {
			this.#folders[entry._id] = entry;
		}
	}

	/**
	 * Get folder & its parents as a filesystem path.
	 *
	 * Will return empty string if id is undefined.
	 */
	getPath(id: string | undefined): string {
		if (!id) {
			return '';
		}

		const folder = this.#folders[id];
		if (!folder) {
			throw new Error(`Unknown folder ${id}, known ${JSON.stringify(Object.keys(this.#folders))}.`);
		}
		return join(this.getPath(folder.folder), `${folder.name} [${id}]`);
	}
}
export default FoldersDatabase;
