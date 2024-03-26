import { cp, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { DUMP_NAMES, DUMP_PATHS } from '~tests/dumps.js';
import sync, { SyncResult } from './sync.js';

describe('sync', () => {
	it.each(Object.entries(DUMP_PATHS))(
		'should dump %s correctly starting with an empty directory',
		async (_dump, path) => {
			const target = await createTempDir();
			const result = await sync(path, target);

			expect(result).toBe(SyncResult.Updated);
			await expect(target).toMatchDirectory(join(path, 'result'));
		},
	);

	it.each(Object.entries(DUMP_PATHS))(
		'should report no change for %s when starting with an up-to-date dump',
		async (_dump, path) => {
			const existingDump = join(path, 'result');
			const target = await createTempDir();
			await rmdir(target);
			await cp(existingDump, target, {
				recursive: true,
			});
			const result = await sync(path, target);

			expect(result).toBe(SyncResult.NoChange);
			await expect(target).toMatchDirectory(existingDump);
		},
	);

	const pairs = DUMP_NAMES.slice(1).map((to, idx) => [to, DUMP_NAMES[idx]] as const);
	it.each(pairs)('should dump %s correctly when starting with %s', async (to, from) => {
		const fromPath = DUMP_PATHS[from];
		const toPath = DUMP_PATHS[to];

		const existingDump = join(fromPath, 'result');
		const target = await createTempDir();
		await rmdir(target);
		await cp(existingDump, target, {
			recursive: true,
		});
		const result = await sync(toPath, target);

		expect(result).toBe(SyncResult.Updated);
		await expect(target).toMatchDirectory(join(toPath, 'result'));
	});
});
