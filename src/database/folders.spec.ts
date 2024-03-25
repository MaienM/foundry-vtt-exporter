import { createMockClassicLevel } from '~tests/classic-level.js';
import FoldersDatabase, { Folder } from './folders.js';

describe('FoldersDatabase', () => {
	describe('.getPath', () => {
		const setupDatabase = () => {
			const levelDB = createMockClassicLevel<Folder>([
				{
					_id: '01',
					folder: undefined,
					name: 'Foo',
				},
				{
					_id: '02',
					folder: '01',
					name: 'Bar',
				},
				{
					_id: '03',
					folder: '02',
					name: 'Baz',
				},
			]);
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
			return FoldersDatabase.create(levelDB) as Promise<FoldersDatabase>;
		};

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
			expect(() => db.getPath('04')).toThrow(/^Unknown folder 04/);
		});
	});
});
