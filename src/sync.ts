import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
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

	const updatedPaths: Set<string> = new Set();

	// Open databases.
	const folders = await index.open('folders');
	const macros = await index.open('macros');

	// Ensure the folders exist.
	await Promise.all(
		folders.getFolderPaths().map(async (name) => {
			const path = join(dumpPath, name);
			await mkdir(path, { recursive: true });
			updatedPaths.add(path);
		}),
	);

	// Update all files.
	const filePromises = [];
	for await (const macro of macros.values()) {
		filePromises.push((async () => {
			const ext = macro.type === 'script' ? '.js' : '.macro';
			const filename = `${macro.name} [${macro._id}]${ext}`;
			const path = join(dumpPath, folders.getPath(macro.folder), filename);
			await writeFile(path, macro.command);
			updatedPaths.add(path);
		})());
	}
	await Promise.all(filePromises);

	// Write metadata.
	await writeFile(metafile, JSON.stringify(metadata, null, '\t'));
	updatedPaths.add(metafile);

	// Remove any old items that are no longer needed.
	const items = await glob('**/*', {
		cwd: dumpPath,
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
