import { join } from 'node:path';
import { Memoize } from 'typescript-memoize';
import { DatabaseClass } from './base.js';
import FoldersDatabase from './folders.js';
import MacroDatabase from './macro.js';
import DatabasePath from './path.js';

const CLASSES = {
	folders: FoldersDatabase,
	macros: MacroDatabase,
};

type InstanceTypeSpy<T> = InstanceType<{ new(): never } & T>;

type ClassTypes = {
	[K in keyof typeof CLASSES]: InstanceTypeSpy<(typeof CLASSES)[K]>;
};

/**
 * Index for a folder with FoundryVTT databases.
 */
class DatabaseIndex {
	/** The base directory that the databases are located in. */
	#baseDir: string;

	// eslint-disable-next-line jsdoc/require-jsdoc
	constructor(baseDir: string) {
		this.#baseDir = baseDir;
	}

	/**
	 * Get the {@see DatabasePath} for the given database.
	 */
	@Memoize()
	path<K extends keyof ClassTypes>(name: K): DatabasePath {
		return new DatabasePath(join(this.#baseDir, name));
	}

	/**
	 * Get the version of the given database.
	 */
	async version<K extends keyof ClassTypes>(name: K): Promise<string> {
		return this.path(name).version();
	}

	/**
	 * Open the given database.
	 */
	@Memoize()
	async open<K extends keyof ClassTypes>(name: K): Promise<ClassTypes[K]> {
		const path = this.path(name);
		return path.open(CLASSES[name] as DatabaseClass<ClassTypes[K]>);
	}
}
export default DatabaseIndex;
