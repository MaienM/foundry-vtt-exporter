import { createMockClassicLevel } from '~tests/classic-level.js';
import MacrosDatabase, { Macro } from './macros.js';

describe('MacrosDatabase', () => {
	const setupDatabase = () => {
		const levelDB = createMockClassicLevel<Macro>([
			{
				_id: '01',
				folder: undefined,
				name: 'Foo',
				type: 'chat',
				command: 'Command 01',
			},
			{
				_id: '02',
				folder: '01',
				name: 'Bar',
				type: 'chat',
				command: 'Command 02',
			},
			{
				_id: '03',
				folder: '02',
				name: 'Baz',
				type: 'script',
				command: 'Command 03',
			},
		]);
		return MacrosDatabase.create<MacrosDatabase>(levelDB);
	};

	describe('.getFiles', () => {
		it('should return the correct result', async () => {
			const db = await setupDatabase();

			const files = new Set();
			for await (const file of db.getFiles()) {
				files.add(file);
			}
			expect(files).toEqual(
				new Set([
					{
						folder: undefined,
						filename: 'Foo [01].macro',
						contents: 'Command 01',
					},
					{
						folder: '01',
						filename: 'Bar [02].macro',
						contents: 'Command 02',
					},
					{
						folder: '02',
						filename: 'Baz [03].js',
						contents: 'Command 03',
					},
				]),
			);
		});
	});
});
