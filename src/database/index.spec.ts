import { tmpdir } from 'node:os';
import { join } from 'node:path';
import FolderDatabase from './folders.js';
import MacrosDatabase from './macros.js';
import DatabasePath from './path.js';
import DatabaseIndex from './index.js';

jest.mock('~src/database/path');

describe('DatabaseIndex', () => {
	describe('.path', () => {
		it('should create the correct path', () => {
			const root = join(tmpdir(), 'some', 'dir');
			const index = new DatabaseIndex(root);

			index.path('folders');
			expect(DatabasePath).toHaveBeenCalledWith(join(root, 'folders'));
		});

		it('should use memoization', () => {
			const root = join(tmpdir(), 'some', 'dir');
			const index = new DatabaseIndex(root);
			expect(DatabasePath).toHaveBeenCalledTimes(0);

			const first = index.path('folders');
			expect(DatabasePath).toHaveBeenCalledTimes(1);

			const second = index.path('folders');
			expect(DatabasePath).toHaveBeenCalledTimes(1);
			expect(second).toBe(first);

			index.path('macros');
			expect(DatabasePath).toHaveBeenCalledTimes(2);

			const third = index.path('folders');
			expect(DatabasePath).toHaveBeenCalledTimes(2);
			expect(third).toBe(first);
		});
	});

	describe('.version', () => {
		it('should defer to version method of the path', async () => {
			const root = join(tmpdir(), 'some', 'dir');
			const index = new DatabaseIndex(root);

			const path = new DatabasePath(root);
			jest.mocked(path).version.mockReturnValue(Promise.resolve('42'));
			const spy = jest.spyOn(index, 'path');
			spy.mockReturnValue(path);

			await expect(index.version('folders')).resolves.toBe('42');
			expect(spy).toHaveBeenCalledWith('folders');
		});
	});

	describe('.open', () => {
		it('should use the correct type for folders', async () => {
			const root = join(tmpdir(), 'some', 'dir');
			const index = new DatabaseIndex(root);

			const path = new DatabasePath(root);
			jest.spyOn(index, 'path').mockReturnValue(path);

			await index.open('folders');
			expect(path.open).toHaveBeenCalledWith(FolderDatabase);
		});

		it('should use the correct type for macros', async () => {
			const root = join(tmpdir(), 'some', 'dir');
			const index = new DatabaseIndex(root);

			const path = new DatabasePath(root);
			jest.spyOn(index, 'path').mockReturnValue(path);

			await index.open('macros');
			expect(path.open).toHaveBeenCalledWith(MacrosDatabase);
		});
	});
});
