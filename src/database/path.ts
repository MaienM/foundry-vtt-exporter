import { existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { ClassicLevel } from 'classic-level';
import { Memoize } from 'typescript-memoize';
import BaseDatabase, { DatabaseClass } from './base.js';

/**
 * Database path & associated info.
 */
class DatabasePath {
	/** The location of the (locked) FoundryVTT database. */
	#sourceDir: string;

	// eslint-disable-next-line jsdoc/require-jsdoc
	constructor(sourceDir: string) {
		this.#sourceDir = sourceDir;
	}

	/**
	 * The version of the FoundryVTT database.
	 *
	 * This changes when either the manifest or the log changes.
	 */
	@Memoize()
	async version(): Promise<string> {
		const manifestName = await fs.readFile(join(this.#sourceDir, 'CURRENT'), 'utf-8');
		const manifestVersion = manifestName.replace('MANIFEST-', '').trim();

		const logVersion = parseInt(manifestVersion, 10) + 1;
		const logName = `${logVersion.toString(10).padStart(6, '0')}.log`;
		const logStat = await fs.stat(join(this.#sourceDir, logName));
		const logSize = logStat.size;

		return `${manifestVersion}+${logSize}`;
	}

	/**
	 * The name of the database.
	 */
	get name() {
		return basename(this.#sourceDir);
	}

	/**
	 * Open a readonly copy of the database.
	 * @see {BaseDatabase} for more information about this.
	 */
	async open<T, D extends BaseDatabase<T>>(dbClass: DatabaseClass<D>): Promise<D> {
		const version = await this.version();
		const targetDir = join(tmpdir(), 'foundry-vtt-database-copy', `${this.name}-${version}`);
		if (!existsSync(join(targetDir, 'CURRENT'))) {
			await fs.rm(targetDir, {
				recursive: true,
				force: true,
			});
			await fs.mkdir(targetDir, {
				recursive: true,
			});
			await Promise.all((await fs.readdir(this.#sourceDir)).map(async (file) => {
				if (file === 'LOCK') {
					return;
				}
				await fs.copyFile(join(this.#sourceDir, file), join(targetDir, file));
			}));
		}

		try {
			await ClassicLevel.repair(targetDir);
			const levelDB = new ClassicLevel(targetDir);
			await levelDB.open();
			await levelDB.compactRange('0', Number.MAX_SAFE_INTEGER.toString());

			return await dbClass.create(levelDB) as D;
		} catch (e) {
			await fs.rm(join(targetDir, 'CURRENT'), {
				force: true,
			});
			throw e;
		}
	}
}
export default DatabasePath;
