import BaseDatabase from './base.js';

interface Macro {
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

/**
 * Readonly copy of the FoundryVTT 'macro' database.
 */
class MacroDatabase extends BaseDatabase<Macro> {
}
export default MacroDatabase;
