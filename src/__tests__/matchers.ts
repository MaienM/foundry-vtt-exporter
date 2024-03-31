/* eslint-disable jest/no-standalone-expect */

import { createHash } from 'node:crypto';
import { createReadStream, Stats } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { normalize, relative, resolve } from 'node:path';
import { glob } from 'glob';

type DirectoryContentsChecker = (path: string, stat: Stats) => Promise<void>;

const hashFile = (path: string): Promise<string> => (
	// eslint-disable-next-line @typescript-eslint/no-shadow
	new Promise((resolve, reject) => {
		const hash = createHash('md5');

		const f = createReadStream(path);
		f.on('data', (d) => hash.update(d));
		f.on('end', () => {
			resolve(hash.digest('hex'));
		});
		f.on('error', reject);
	})
);

/**
 * Helper class to gather expectations of a directory's contents.
 */
// eslint-disable-next-line import/prefer-default-export
export class DirectoryContents {
	#contents: Record<string, DirectoryContentsChecker>;

	// eslint-disable-next-line jsdoc/require-jsdoc
	constructor() {
		this.#contents = {};

		// Add check for the root directory.
		this.expectDirectory('.', async (path, _stats) => {
			const expectedPaths = new Set(Object.keys(this.#contents));
			const actualPaths = new Set(
				await glob('**', {
					cwd: path,
					dot: true,
				}),
			);

			expect(actualPaths).toStrictEqual(expectedPaths);
		});
	}

	/**
	 * Add a custom check for the given subpath.
	 */
	expect(subpath: string, checker: DirectoryContentsChecker) {
		const path = normalize(subpath);
		if (Object.hasOwn(this.#contents, path)) {
			throw new Error(`Already has check for '${path}'.`);
		}
		this.#contents[path] = checker;
	}

	/**
	 * Expect that the given subpath is a directory, optionally with a custom function to assert further details about the file.
	 */
	expectDirectory(subpath: string, checker: DirectoryContentsChecker | undefined = undefined) {
		this.expect(subpath, async (path, stats) => {
			expect(stats.isDirectory()).toBe(true);
			if (checker) {
				await checker(path, stats);
			}
		});
	}

	/**
	 * Expect that the given subpath is a regular file, optionally with a custom function to assert further details about the file.
	 */
	expectFile(subpath: string, checker: DirectoryContentsChecker | undefined = undefined) {
		this.expect(subpath, async (path, stats) => {
			expect(stats.isFile()).toBe(true);
			if (checker) {
				await checker(path, stats);
			}
		});
	}

	/**
	 * Expect that the given subpath is a file with the given contents.
	 */
	expectFileWithContents(subpath: string, contents: string) {
		this.expectFile(subpath, async (path, _stat) => {
			await expect(readFile(path, 'utf-8')).resolves.toBe(contents);
		});
	}

	/**
	 * Run all checks.
	 */
	async _run(path: string) {
		await Promise.all(
			Object.entries(this.#contents).map(async ([subpath, checker]) => {
				const fullpath = resolve(path, subpath);
				const stats = stat(fullpath);
				await expect(stats).resolves.toBeTruthy();
				await checker(fullpath, await stats);
			}),
		);
	}

	/**
	 * Create a DirectoryContents instance that verifies that the contents match exactly with those of another directory.
	 */
	static async createFromDirectory(basepath: string) {
		const contents = new DirectoryContents();

		const entries = await glob('**', {
			cwd: basepath,
			dot: true,
			withFileTypes: true,
			ignore: ['./'],
		});
		for (const entry of entries) {
			const subpath = relative(basepath, entry.fullpath());
			if (entry.isDirectory()) {
				contents.expectDirectory(subpath);
			} else if (entry.isFile()) {
				contents.expectFile(subpath, async (path, _stats) => {
					await expect(hashFile(path)).resolves.toBe(await hashFile(entry.fullpath()));
				});
			} else {
				throw new Error(`Unsupported item at ${entry.fullpath()}`);
			}
		}

		return contents;
	}
}

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace jest {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		interface Matchers<R> {
			/**
			 * Check that the path the value refers to is an empty directory.
			 */
			toBeEmptyDirectory: () => Promise<void>;

			/**
			 * Check that the path the value refers to is a directory with contents matching the passed {@see DirectoryContents}.
			 */
			toMatchDirectory: (directory: DirectoryContents) => Promise<void>;
		}
	}
}

const toBeEmptyDirectory = async (path: string): Promise<jest.CustomMatcherResult> => {
	try {
		if ((await readdir(path)).length > 0) {
			return {
				pass: false,
				message: () => `directory ${path} is not empty`,
			};
		}
	} catch (e) {
		return {
			pass: false,
			message: () => `reading directory ${path} failed: ${e}`,
		};
	}
	return {
		pass: true,
		message: () => `directory ${path} is empty`,
	};
};

const toMatchDirectory = async (path: string, contents: DirectoryContents): Promise<jest.CustomMatcherResult> => {
	await contents._run(path);
	return {
		pass: true,
		message: () => `directory ${path} has the expected contents`,
	};
};

expect.extend({
	toBeEmptyDirectory,
	toMatchDirectory,
});

/* eslint-enable */
