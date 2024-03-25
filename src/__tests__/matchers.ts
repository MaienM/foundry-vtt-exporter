import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { glob } from 'glob';

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
			 * Check that the path the value refers to is a directory with identical contents to the directory at the given path.
			 */
			toMatchDirectory: (snapshot: string) => Promise<void>;
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

const hashFile = (path: string): Promise<string> => (
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

const toMatchDirectory = async (path: string, snapshot: string): Promise<jest.CustomMatcherResult> => {
	const [afiles, bfiles] = await Promise.all([path, snapshot].map(async (cwd) => {
		const files = await glob('**', {
			cwd,
			dot: true,
			withFileTypes: true,
			ignore: ['./'],
		});
		return Object.fromEntries(
			await Promise.all(files.map(async (f) => (
				[
					f.name,
					{
						type: f.getType(),
						hash: f.isFile() ? await hashFile(f.fullpath()) : undefined,
					},
				] as const
			))),
		);
	}));

	expect(afiles).toEqual(bfiles);

	return {
		pass: true,
		message: () => `directories ${path} and ${snapshot} are equal`,
	};
};

expect.extend({
	toBeEmptyDirectory,
	toMatchDirectory,
});
