import { createMockClassicLevel } from '~tests/classic-level.js';
import BaseDatabase from './base.js';

describe('BaseDatabase', () => {
	describe('#create', () => {
		it('should call init method', async () => {
			const mockInit = jest.fn();

			class TestDatabase extends BaseDatabase<void> {
				// eslint-disable-next-line @typescript-eslint/require-await
				protected async init() {
					mockInit();
				}
			}

			await TestDatabase.create(createMockClassicLevel([]));
			expect(mockInit).toHaveBeenCalledTimes(1);
		});
	});

	describe('.values', () => {
		it('should return parsed entries', async () => {
			const items = [
				{ name: 'foo', value: 12 },
				{ name: 'bar', value: true },
				{ name: 'baz', value: 'hello' },
			];

			const levelDB = createMockClassicLevel([...items]);
			const db = await BaseDatabase.create(levelDB);

			for await (const item of db.values()) {
				expect(item).toStrictEqual(items.shift());
			}
		});
	});
});
