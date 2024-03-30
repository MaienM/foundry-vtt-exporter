import { createMockClassicLevel } from '~tests/classic-level.js';
import FoldersDatabase, { Folder } from './folders.js';

describe('FoldersDatabase', () => {
	const setupDatabase = () => {
		const levelDB = createMockClassicLevel<Folder>([
			{
				_id: '01',
				folder: undefined,
				name: 'Foo',
				type: 'Macro',
			},
			{
				_id: '02',
				folder: '01',
				name: 'Bar',
				type: 'Macro',
			},
			{
				_id: '03',
				folder: '02',
				name: 'Baz',
				type: 'Macro',
			},
			{
				_id: '04',
				folder: undefined,
				name: 'Things',
				type: 'Compendium',
			},
			{
				_id: '05',
				folder: '04',
				name: 'Stuff',
				type: 'Compendium',
			},
		]);
		return FoldersDatabase.create<FoldersDatabase>(levelDB);
	};

	describe('.getPath', () => {
		it('should return the correct result for undefined', async () => {
			const db = await setupDatabase();
			expect(db.getPath(undefined)).toBe('');
		});

		it('should return the correct result for a top-level folder', async () => {
			const db = await setupDatabase();
			expect(db.getPath('01')).toBe('Foo [01]');
		});

		it('should return the correct result for a nested folder', async () => {
			const db = await setupDatabase();
			expect(db.getPath('03')).toBe('Foo [01]/Bar [02]/Baz [03]');
		});

		it('should throw for an unknown folder', async () => {
			const db = await setupDatabase();
			expect(() => db.getPath('99')).toThrow(/^Unknown folder/);
		});

		it('should treat a non-macro folder as unknown', async () => {
			const db = await setupDatabase();
			expect(() => db.getPath('04')).toThrow(/^Unknown folder/);
		});
	});

	describe('.getFolderPaths', () => {
		it('should return the correct result', async () => {
			const db = await setupDatabase();
			expect(new Set(db.getFolderPaths())).toEqual(
				new Set([
					'Foo [01]',
					'Foo [01]/Bar [02]',
					'Foo [01]/Bar [02]/Baz [03]',
				]),
			);
		});
	});
});
