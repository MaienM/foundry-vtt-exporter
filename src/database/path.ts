import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { cp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { ClassicLevel } from 'classic-level';
import { glob } from 'glob';
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
		const manifestName = await readFile(join(this.#sourceDir, 'CURRENT'), 'utf-8');
		const manifestVersion = manifestName.replace('MANIFEST-', '').trim();

		const logFiles = await glob('*.log', {
			cwd: this.#sourceDir,
		});
		assert(logFiles.length === 1, `Should have exactly one log file, got ${JSON.stringify(logFiles)}.`);
		const [logFile] = logFiles;
		const logVersion = logFile.replace('.log', '');
		const logStat = await stat(join(this.#sourceDir, logFile));
		const logSize = logStat.size;

		return `${manifestVersion}+${logVersion}+${logSize}`;
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
		const targetDir = join(tmpdir(), `foundry-vtt-database-copy-${this.name}-${version}`);
		if (!existsSync(join(targetDir, 'CURRENT'))) {
			await rm(targetDir, {
				recursive: true,
				force: true,
			});
			await cp(this.#sourceDir, targetDir, {
				recursive: true,
			});
			await rm(join(targetDir, 'LOCK'));
		}

		try {
			await ClassicLevel.repair(targetDir);
			const levelDB = new ClassicLevel(targetDir);
			await levelDB.compactRange('0', Number.MAX_SAFE_INTEGER.toString());

			return await dbClass.create(levelDB) as D;
		} catch (e) {
			await rm(join(targetDir), {
				recursive: true,
				force: true,
			});
			throw e;
		}
	}
}
export default DatabasePath;
