import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { glob } from 'glob';
import DatabaseIndex from './database/index.js';

interface Metadata {
	versions: {
		folders: string;
		macros: string;
	};
}

export enum SyncResult {
	NoChange,
	Updated,
}

/**
 * Update the dump so that it's contents match the macros in the databases stored in the given path.
 *
 * Will clean up old macro files, but not directories (as git will ignore empty directories anyway).
 */
export default async (databasePath: string, dumpPath: string): Promise<SyncResult> => {
	// Create database index.
	const index = new DatabaseIndex(databasePath);

	// Check metadata to see if a sync is actually needed.
	const metadata: Metadata = {
		versions: {
			folders: await index.version('folders'),
			macros: await index.version('macros'),
		},
	};
	const metafile = join(dumpPath, 'metadata.json');
	try {
		const oldMetadata = JSON.parse(await readFile(metafile, 'utf-8')) as Metadata;
		if (isDeepStrictEqual(metadata, oldMetadata)) {
			return SyncResult.NoChange;
		}
	} catch (e) {
		// If we can't read the metadata we just assume a sync is needed.
	}

	// Open databases.
	const folders = await index.open('folders');
	const macros = await index.open('macros');

	// Update all files.
	await mkdir(dumpPath, {
		recursive: true,
	});
	const filePromises = [];
	for await (const macro of macros.values()) {
		filePromises.push((async () => {
			const ext = macro.type === 'script' ? '.js' : '.macro';
			const targetFile = join(dumpPath, folders.getPath(macro.folder), `${macro.name} [${macro._id}]${ext}`);
			await mkdir(dirname(targetFile), { recursive: true });
			await writeFile(targetFile, macro.command);
			return targetFile;
		})());
	}
	const updatedFiles = new Set(await Promise.all(filePromises));

	// Write metadata.
	await writeFile(metafile, JSON.stringify(metadata, null, '\t'));
	updatedFiles.add(metafile);

	// Remove any old files that are no longer needed.
	const files = await glob('**/*', {
		cwd: dumpPath,
		dot: true,
		nodir: true,
		ignore: [
			'./',
			'./.git/',
		],
		absolute: true,
	});
	const deletePromises = [];
	for (const file of files) {
		if (!updatedFiles.has(file)) {
			deletePromises.push(rm(file));
		}
	}
	await Promise.all(deletePromises);

	return SyncResult.Updated;
};
