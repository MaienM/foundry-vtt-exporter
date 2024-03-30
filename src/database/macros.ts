import BaseDatabase from './base.js';

export interface Macro {
	/** The ID. */
	_id: string;

	/** The ID of the folder, if any. */
	folder?: string;

	/** The name of the macro. */
	name: string;

	/** The type of the macro. */
	type: 'chat' | 'script';

	/** The contents of the macro. */
	command: string;
}

export interface MacroFile {
	/** The ID of the folder, if any. */
	folder?: string;

	/** The name of the file. */
	filename: string;

	/** The contents of the file. */
	contents: string;
}

/**
 * Readonly copy of the FoundryVTT 'macros' database.
 */
class MacrosDatabase extends BaseDatabase<Macro> {
	/**
	 * Get all macros files.
	 */
	async *getFiles(): AsyncGenerator<MacroFile> {
		for await (const macro of this.values()) {
			const ext = macro.type === 'script' ? '.js' : '.macro';
			const filename = `${macro.name} [${macro._id}]${ext}`;
			yield {
				folder: macro.folder,
				filename,
				contents: macro.command,
			};
		}
	}
}
export default MacrosDatabase;
