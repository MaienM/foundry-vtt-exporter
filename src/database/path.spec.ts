import { cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ClassicLevel } from 'classic-level';
import { Dump, DUMP_NAMES, DUMP_PATHS } from '~tests/dumps.js';
import BaseDatabase, { DatabaseClass } from './base.js';
import DatabasePath from './path.js';

// dprint-ignore
type FlattenedRecord<T> = (
	T extends Record<infer K1, infer V1>
		? (
			V1 extends Record<infer K2, infer V2>
				? (
					V2 extends Record<infer K3, infer V3>
						? [K1, K2, K3, V3][]
						: [K1, K2, V2][]
				)
				: [K1, V1][]
		)
		: never
);

const flattenRecord = <K extends string | number | symbol, T extends Record<K, unknown>>(
	record: T,
): FlattenedRecord<T> => {
	const entries = Object.entries(record);
	if (typeof entries[0][1] === 'object') {
		return entries.flatMap(([key, value]) => (
			flattenRecord(value as Record<string, unknown>).map((flat) => [key, ...flat] as const)
		)) as unknown as FlattenedRecord<T>;
	} else {
		return entries.map(([key, value]) => [key, value]) as unknown as FlattenedRecord<T>;
	}
};

describe('DatabasePath', () => {
	describe('.version()', () => {
		const dumpsVersions: Record<Dump, Record<'folders' | 'macros', string>> = {
			'01_empty': {
				folders: '000002+3335',
				macros: '000002+0',
			},
			'02_examples_pending': {
				folders: '000002+3335',
				macros: '000002+2343',
			},
			'03_saved': {
				folders: '000006+0',
				macros: '000006+0',
			},
			'04_folders_changes_moves': {
				folders: '000006+3150',
				macros: '000006+2464',
			},
			'05_deletions_changes_moves': {
				folders: '000006+3150',
				macros: '000006+4433',
			},
			'06_copies_name_clashes': {
				folders: '000006+3150',
				macros: '000006+6998',
			},
			'07_deletions_type_change': {
				folders: '000006+3594',
				macros: '000006+8098',
			},
			'08_saved': {
				folders: '000011+0',
				macros: '000011+0',
			},
			'09_folder_renames': {
				folders: '000011+1032',
				macros: '000011+0',
			},
		};
		it.each(flattenRecord(dumpsVersions))('should return correct version for %s/%s', async (dump, db, version) => {
			const path = new DatabasePath(join(DUMP_PATHS[dump], db));
			await expect(path.version()).resolves.toBe(version);
		});

		it('should not create a copy to determine the version', async () => {
			const path = new DatabasePath(join(DUMP_PATHS['01_empty'], 'folders'));
			await path.version();
			await expect(tmpdir()).toBeEmptyDirectory();
		});
	});

	describe('.name()', () => {
		it('should return the database name', () => {
			const path = new DatabasePath(join(DUMP_PATHS['01_empty'], 'folders'));
			expect(path.name).toBe('folders');
		});
	});

	describe('.open()', () => {
		it('should create a copy of the database', async () => {
			const path = new DatabasePath(join(DUMP_PATHS['01_empty'], 'folders'));

			await path.open(BaseDatabase as unknown as DatabaseClass<unknown>);
			await expect(tmpdir()).not.toBeEmptyDirectory();
		});

		it('should clean up the copy if repairing/opening it fails', async () => {
			const spy = jest.spyOn(ClassicLevel, 'repair');
			spy.mockRejectedValue(new Error('broken') as unknown as never);

			const path = new DatabasePath(join(DUMP_PATHS['01_empty'], 'folders'));
			await expect(path.open(BaseDatabase as unknown as DatabaseClass<unknown>)).rejects.not.toBeUndefined();
			await expect(tmpdir()).toBeEmptyDirectory();
		});

		it('should not alter the original database', async () => {
			const originalDBPath = join(DUMP_PATHS['02_examples_pending'], 'folders');
			const copiedDBPath = await global.createTempDir();
			await cp(originalDBPath, copiedDBPath, {
				recursive: true,
			});

			const path = new DatabasePath(copiedDBPath);
			await path.open(BaseDatabase as unknown as DatabaseClass<unknown>);

			await expect(copiedDBPath).toMatchDirectory(originalDBPath);
		});

		const databases = DUMP_NAMES.flatMap((dump) => (['folders', 'macros'] as const).map((db) => [dump, db] as const));
		it.each(databases)('should be able to open database %s/%s', async (dump, db) => {
			const path = new DatabasePath(join(DUMP_PATHS[dump], db));
			await expect(path.open(BaseDatabase as unknown as DatabaseClass<unknown>)).resolves.not.toThrow();
		});
	});
});
