import { cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ClassicLevel } from 'classic-level';
// @ts-expect-error 7016
import DUMP_PATH from '~tests/dumps/__dirname.cjs';
import { DirectoryContents } from '~tests/matchers.js';
import BaseDatabase, { DatabaseClass } from './base.js';
import DatabasePath from './path.js';

const DUMPS = [
	{
		name: 'pending',
		dbPath: join(DUMP_PATH, 'pending'),
		version: '000002+2343',
	},
	{
		name: 'saved',
		dbPath: join(DUMP_PATH, 'saved'),
		version: '000006+0',
	},
];

describe('DatabasePath', () => {
	describe('.version()', () => {
		it.each(DUMPS)('should return correct version for sample database "$name"', async ({ dbPath, version }) => {
			const path = new DatabasePath(dbPath);
			await expect(path.version()).resolves.toBe(version);
		});

		it('should not create a copy to determine the version', async () => {
			const path = new DatabasePath(DUMPS[0].dbPath);
			await path.version();
			await expect(tmpdir()).toBeEmptyDirectory();
		});
	});

	describe('.name()', () => {
		it('should return the database name', () => {
			const path = new DatabasePath(join(tmpdir(), 'folders'));
			expect(path.name).toBe('folders');
		});
	});

	describe('.open()', () => {
		it('should create a copy of the database', async () => {
			const path = new DatabasePath(DUMPS[0].dbPath);

			await path.open(BaseDatabase as unknown as DatabaseClass<unknown>);
			await expect(tmpdir()).not.toBeEmptyDirectory();
		});

		it('should clean up the copy if repairing/opening it fails', async () => {
			const spy = jest.spyOn(ClassicLevel, 'repair');
			spy.mockRejectedValue(new Error('broken') as unknown as never);

			const path = new DatabasePath(DUMPS[0].dbPath);
			await expect(path.open(BaseDatabase as unknown as DatabaseClass<unknown>)).rejects.not.toBeUndefined();
			await expect(tmpdir()).toBeEmptyDirectory();
		});

		it('should not alter the original database', async () => {
			const originalDBPath = DUMPS[0].dbPath;
			const copiedDBPath = await global.createTempDir();
			await cp(originalDBPath, copiedDBPath, {
				recursive: true,
			});

			const path = new DatabasePath(copiedDBPath);
			await path.open(BaseDatabase as unknown as DatabaseClass<unknown>);

			await expect(copiedDBPath).toMatchDirectory(await DirectoryContents.createFromDirectory(originalDBPath));
		});

		it.each(DUMPS)('should be able to open sample database "$name"', async ({ dbPath }) => {
			const path = new DatabasePath(dbPath);
			await expect(path.open(BaseDatabase as unknown as DatabaseClass<unknown>)).resolves.not.toThrow();
		});
	});
});
