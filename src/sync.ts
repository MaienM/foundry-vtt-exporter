import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { glob } from 'glob';
import DatabaseIndex from './database/index.js';

/**
 * The metadata for a dump.
 */
interface Metadata {
	/**
	 * The versions of the databases that this dump is for.
	 *
	 * This is used to determine whether the dump even needs updating.
	 */
	versions: {
		folders: string;
		macros: string;
	};
}

/**
 * The arguments for a sync.
 */
export interface SyncOptions {
	/** Path to the directory containing the Foundry VTT databases. */
	databasePath: string;
	/** Path to the directory to store the dump in. */
	dumpPath: string;
}

/**
 * The result of a sync.
 */
export enum SyncResult {
	/** The dump has been updated. */
	Updated,
	/** No changes (the dump was already up-to-date). */
	NoChange,
}

/**
 * Update the dump so that it's contents match the macros in the databases stored in the given path.
 */
export default async (options: SyncOptions): Promise<SyncResult> => {
	// Create database index.
	const index = new DatabaseIndex(options.databasePath);

	// Check metadata to see if a sync is actually needed.
	const metadata: Metadata = {
		versions: {
			folders: await index.version('folders'),
			macros: await index.version('macros'),
		},
	};
	const metafile = join(options.dumpPath, 'metadata.json');
	try {
		const oldMetadata = JSON.parse(await readFile(metafile, 'utf-8')) as Metadata;
		if (isDeepStrictEqual(metadata, oldMetadata)) {
			return SyncResult.NoChange;
		}
	} catch (e) {
		// If we can't read the metadata we just assume a sync is needed.
	}

	const updatedPaths: Set<string> = new Set();

	// Open databases.
	const folders = await index.open('folders');
	const macros = await index.open('macros');

	// Ensure the folders exist.
	await Promise.all(
		folders.getFolderPaths().map(async (name) => {
			const path = join(options.dumpPath, name);
			await mkdir(path, { recursive: true });
			updatedPaths.add(path);
		}),
	);

	// Update all files.
	const filePromises = [];
	for await (const file of macros.getFiles()) {
		filePromises.push((async () => {
			const path = join(options.dumpPath, folders.getPath(file.folder), file.filename);
			await writeFile(path, file.contents);
			updatedPaths.add(path);
		})());
	}
	await Promise.all(filePromises);

	// Write metadata.
	await writeFile(metafile, JSON.stringify(metadata, null, '\t'));
	updatedPaths.add(metafile);

	// Remove any old items that are no longer needed.
	const items = await glob('**/*', {
		cwd: options.dumpPath,
		dot: true,
		ignore: [
			'./',
			'./.git/',
		],
		absolute: true,
	});
	const deletePromises: Record<string, Promise<unknown>> = {};
	for (const item of items) {
		if (updatedPaths.has(item)) {
			continue;
		}
		if (Object.keys(deletePromises).some((p) => !relative(p, item).startsWith('..'))) {
			continue;
		}
		deletePromises[item] = rm(item, {
			recursive: true,
		});
	}
	await Promise.all(Object.values(deletePromises));

	return SyncResult.Updated;
};
