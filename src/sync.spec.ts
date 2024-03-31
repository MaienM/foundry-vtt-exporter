import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DirectoryContents } from '~tests/matchers.js';
import FoldersDatabase from './database/folders.js';
import DatabaseIndex from './database/index.js';
import MacrosDatabase, { MacroFile } from './database/macros.js';
import sync, { SyncResult } from './sync.js';

jest.mock('./database/folders.ts');
jest.mock('./database/index.ts');
jest.mock('./database/macros.ts');

describe('sync', () => {
	const DUMMY_PATH = join('fake', 'path', 'does', 'not', 'exist');

	const setupDatabases = (options: { folders: Record<string, string>; macros: MacroFile[] }) => {
		// @ts-expect-error 2674
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const mockDBFolders: FoldersDatabase = new FoldersDatabase();
		jest.mocked(mockDBFolders).getFolderPaths.mockReturnValue(Object.values(options.folders));
		jest.mocked(mockDBFolders).getPath.mockImplementation((id) => {
			if (id === undefined) {
				return '';
			}

			const folder = options.folders[id];
			if (folder === undefined) {
				throw new Error(`No folder with id ${id}.`);
			}
			return folder;
		});

		// @ts-expect-error 2674
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const mockDBMacros: MacrosDatabase = new MacrosDatabase();
		// eslint-disable-next-line @typescript-eslint/require-await
		jest.mocked(mockDBMacros).getFiles.mockImplementation(async function*() {
			for (const macro of options.macros) {
				yield macro;
			}
		});

		const mockIndex = new DatabaseIndex(DUMMY_PATH);
		jest.mocked(mockIndex).version.mockResolvedValue('123+456');
		// eslint-disable-next-line @typescript-eslint/require-await
		jest.mocked(mockIndex).open.mockImplementation(async (name) => {
			switch (name) {
				case 'folders':
					return mockDBFolders;
				case 'macros':
					return mockDBMacros;
				default:
					throw new Error(`Invalid name ${name}.`);
			}
		});

		jest.mocked(DatabaseIndex).mockReturnValue(mockIndex);

		return {
			index: mockIndex,
			folders: mockDBFolders,
			macros: mockDBMacros,
		};
	};

	it('should create metadata file', async () => {
		setupDatabases({
			folders: {},
			macros: [],
		});
		const dumpPath = await createTempDir();

		await expect(sync({ databasePath: DUMMY_PATH, dumpPath })).resolves.toBe(SyncResult.Updated);

		const contents = new DirectoryContents();
		contents.expectFile('metadata.json', async (path, _stats) => {
			const fileContentsPromise = readFile(path, 'utf-8');
			await expect(fileContentsPromise).resolves.not.toBeNull();
			const fileContents = await fileContentsPromise;
			expect(() => JSON.parse(fileContents) as unknown).not.toThrow();
			expect(JSON.parse(fileContents)).toStrictEqual({
				versions: {
					folders: '123+456',
					macros: '123+456',
				},
			});
		});
		await expect(dumpPath).toMatchDirectory(contents);
	});

	it('should skip sync if metadata file is up-to-date', async () => {
		setupDatabases({
			folders: {},
			macros: [],
		});
		const dumpPath = await createTempDir();
		const metadata = JSON.stringify({
			versions: {
				folders: '123+456',
				macros: '123+456',
			},
		});
		await writeFile(join(dumpPath, 'metadata.json'), metadata);

		await expect(sync({ databasePath: DUMMY_PATH, dumpPath })).resolves.toBe(SyncResult.NoChange);

		const contents = new DirectoryContents();
		contents.expectFileWithContents('metadata.json', metadata);
		await expect(dumpPath).toMatchDirectory(contents);
	});

	it('should create directories', async () => {
		setupDatabases({
			folders: {
				'01': 'Foo',
				'02': 'Foo/Bar',
			},
			macros: [],
		});
		const dumpPath = await createTempDir();

		await expect(sync({ databasePath: DUMMY_PATH, dumpPath })).resolves.toBe(SyncResult.Updated);

		const contents = new DirectoryContents();
		contents.expectFile('metadata.json');
		contents.expectDirectory('Foo');
		contents.expectDirectory('Foo/Bar');
		await expect(dumpPath).toMatchDirectory(contents);
	});

	it('should remove unneeded directories', async () => {
		setupDatabases({
			folders: {
				'01': 'Foo',
			},
			macros: [],
		});
		const dumpPath = await createTempDir();
		await mkdir(join(dumpPath, 'Foo'));
		await mkdir(join(dumpPath, 'Foo', 'Bar'));

		await expect(sync({ databasePath: DUMMY_PATH, dumpPath })).resolves.toBe(SyncResult.Updated);

		const contents = new DirectoryContents();
		contents.expectFile('metadata.json');
		contents.expectDirectory('Foo');
		await expect(dumpPath).toMatchDirectory(contents);
	});

	it('should create files', async () => {
		setupDatabases({
			folders: {},
			macros: [
				{
					filename: 'foo.js',
					contents: 'FOO',
				},
				{
					filename: 'bar.macro',
					contents: 'BAR',
				},
			],
		});
		const dumpPath = await createTempDir();

		await expect(sync({ databasePath: DUMMY_PATH, dumpPath })).resolves.toBe(SyncResult.Updated);

		const contents = new DirectoryContents();
		contents.expectFile('metadata.json');
		contents.expectFileWithContents('foo.js', 'FOO');
		contents.expectFileWithContents('bar.macro', 'BAR');
		await expect(dumpPath).toMatchDirectory(contents);
	});

	it('should remove unneeded files', async () => {
		setupDatabases({
			folders: {},
			macros: [
				{
					filename: 'foo.js',
					contents: 'FOO',
				},
			],
		});
		const dumpPath = await createTempDir();
		await writeFile(join(dumpPath, 'foo.js'), 'FOO');
		await writeFile(join(dumpPath, 'bar.macro'), 'BAR');

		await expect(sync({ databasePath: DUMMY_PATH, dumpPath })).resolves.toBe(SyncResult.Updated);

		const contents = new DirectoryContents();
		contents.expectFile('metadata.json');
		contents.expectFileWithContents('foo.js', 'FOO');
		await expect(dumpPath).toMatchDirectory(contents);
	});

	it('should create files nested in directories', async () => {
		setupDatabases({
			folders: {
				'01': 'Foo',
			},
			macros: [
				{
					folder: '01',
					filename: 'foo.js',
					contents: 'FOO',
				},
			],
		});
		const dumpPath = await createTempDir();

		await expect(sync({ databasePath: DUMMY_PATH, dumpPath })).resolves.toBe(SyncResult.Updated);

		const contents = new DirectoryContents();
		contents.expectFile('metadata.json');
		contents.expectDirectory('Foo');
		contents.expectFileWithContents('Foo/foo.js', 'FOO');
		await expect(dumpPath).toMatchDirectory(contents);
	});

	it('should remove unneeded files nested in directories', async () => {
		setupDatabases({
			folders: {},
			macros: [],
		});
		const dumpPath = await createTempDir();
		await mkdir(join(dumpPath, 'Foo'));
		await writeFile(join(dumpPath, 'Foo', 'foo.js'), 'FOO');

		await expect(sync({ databasePath: DUMMY_PATH, dumpPath })).resolves.toBe(SyncResult.Updated);

		const contents = new DirectoryContents();
		contents.expectFile('metadata.json');
		await expect(dumpPath).toMatchDirectory(contents);
	});
});
