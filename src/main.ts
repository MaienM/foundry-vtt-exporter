/* eslint-disable no-console */

import * as fs from 'node:fs/promises';
import { dirname, join } from 'node:path';
import DatabaseIndex from './database/index.js';

/**
 * Rudimentary object deep-equals.
 */
const objectEqual = (a: object, b: object) => (
	JSON.stringify(a) === JSON.stringify(b)
);

/**
 * Get the full paths of all files in the directory, except for those inside the .git directory.
 */
const getFilesIgnoreGit = async (dir: string) => {
	const topLevel = await fs.readdir(dir, {
		withFileTypes: true,
	});
	const nested = await Promise.all(topLevel.map(async (tl) => {
		if (tl.isDirectory()) {
			if (tl.name === '.git') {
				// Ignore, don't recurse into.
				return [];
			}
			const entries = await fs.readdir(join(tl.path, tl.name), {
				recursive: true,
				withFileTypes: true,
			});
			return entries.filter((e) => e.isFile()).map((e) => join(e.path, e.name));
		} else {
			return join(tl.path, tl.name);
		}
	}));
	return nested.flat();
};

interface Metadata {
	versions: {
		folders: string;
		macros: string;
	};
}

const main = async () => {
	// Parse arguments.
	const args = process.argv.slice(2);
	const sourceDir = args[0];
	const targetDir = args[1];
	if (args.length !== 2 || targetDir === undefined) {
		console.error(`Usage: ${process.argv.slice(0, 2).join(' ')} [source] [target]`);
		process.exit(1);
	}

	// Create database index.
	const index = new DatabaseIndex(sourceDir);

	// Check metadata to see if a sync is actually needed.
	const metadata: Metadata = {
		versions: {
			folders: await index.version('folders'),
			macros: await index.version('macros'),
		},
	};
	const metafile = join(targetDir, 'metadata.json');
	try {
		const oldMetadata = JSON.parse(await fs.readFile(metafile, 'utf-8')) as Metadata;
		if (objectEqual(metadata, oldMetadata)) {
			console.log('Dump already up to date.');
			return;
		}
	} catch (e) {
		if (e instanceof Error && (e as Error & { code: string }).code === 'ENOENT') {
			// No metadata file, continue.
		} else {
			throw e;
		}
	}

	// Open databases.
	const folders = await index.open('folders');
	const macros = await index.open('macros');

	// Update all files.
	const filePromises = [];
	for await (const macro of macros.values()) {
		filePromises.push((async () => {
			const ext = macro.type === 'script' ? '.js' : '.macro';
			const targetFile = join(targetDir, folders.getPath(macro.folder), `${macro.name} [${macro._id}]${ext}`);
			await fs.mkdir(dirname(targetFile), { recursive: true });
			await fs.writeFile(targetFile, macro.command);
			return targetFile;
		})());
	}
	const updatedFiles = new Set(await Promise.all(filePromises));

	// Write metadata.
	await fs.writeFile(metafile, JSON.stringify(metadata, null, '\t'));
	updatedFiles.add(metafile);

	// Remove any old files that are no longer needed.
	const deletePromises = [];
	for (const file of await getFilesIgnoreGit(targetDir)) {
		if (!updatedFiles.has(file)) {
			deletePromises.push(fs.rm(file));
		}
	}
	await Promise.all(deletePromises);

	console.log('Updated dump.');
};

await main();

/* eslint-enable */
