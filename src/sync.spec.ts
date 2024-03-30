import { cp, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { DUMP_NAMES, DUMP_PATHS } from '~tests/dumps.js';
import sync, { SyncResult } from './sync.js';

describe('sync', () => {
	it.each(Object.entries(DUMP_PATHS))(
		'should dump %s correctly starting with an empty directory',
		async (_dump, databasePath) => {
			const dumpPath = await createTempDir();
			const result = await sync({
				databasePath,
				dumpPath,
			});

			expect(result).toBe(SyncResult.Updated);
			await expect(dumpPath).toMatchDirectory(join(databasePath, 'result'));
		},
	);

	it.each(Object.entries(DUMP_PATHS))(
		'should report no change for %s when starting with an up-to-date dump',
		async (_dump, databasePath) => {
			const existingDump = join(databasePath, 'result');
			const dumpPath = await createTempDir();
			await rmdir(dumpPath);
			await cp(existingDump, dumpPath, {
				recursive: true,
			});
			const result = await sync({
				databasePath,
				dumpPath,
			});

			expect(result).toBe(SyncResult.NoChange);
			await expect(dumpPath).toMatchDirectory(existingDump);
		},
	);

	const pairs = DUMP_NAMES.slice(1).map((to, idx) => [to, DUMP_NAMES[idx]] as const);
	it.each(pairs)('should dump %s correctly when starting with %s', async (to, from) => {
		const fromPath = DUMP_PATHS[from];
		const toPath = DUMP_PATHS[to];

		const existingDump = join(fromPath, 'result');
		const dumpPath = await createTempDir();
		await rmdir(dumpPath);
		await cp(existingDump, dumpPath, {
			recursive: true,
		});
		const result = await sync({
			databasePath: toPath,
			dumpPath,
		});

		expect(result).toBe(SyncResult.Updated);
		await expect(dumpPath).toMatchDirectory(join(toPath, 'result'));
	});
});
