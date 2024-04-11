import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DirectoryContents } from '~tests/matchers.js';
import FoldersDatabase from './database/folders.js';
import DatabaseIndex from './database/index.js';
import MacrosDatabase, { MacroFile } from './database/macros.js';
import sync, { detectVCS, SyncResult } from './sync.js';

jest.mock('./database/folders.ts');
jest.mock('./database/index.ts');
jest.mock('./database/macros.ts');

describe('detectVCS', () => {
	it('should detect a .git folder', async () => {
		const tmpdir = await createTempDir();
		await mkdir(join(tmpdir, '.git'));

		await expect(detectVCS(tmpdir)).resolves.toBe('git');
	});

	it('should default to none', async () => {
		const tmpdir = await createTempDir();

		await expect(detectVCS(tmpdir)).resolves.toBe('none');
	});
});

describe('sync', () => {
	const DUMMY_PATH = join('fake', 'path', 'does', 'not', 'exist');
	const SYNC_DEFAULTS = {
		databasePath: DUMMY_PATH,
		vcs: 'auto' as const,
	};

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

		const syncPromise = sync({
			...SYNC_DEFAULTS,
			dumpPath,
		});
		await expect(syncPromise).resolves.toBe(SyncResult.Updated);

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

		const syncPromise = sync({
			...SYNC_DEFAULTS,
			dumpPath,
		});
		await expect(syncPromise).resolves.toBe(SyncResult.NoChange);

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

		const syncPromise = sync({
			...SYNC_DEFAULTS,
			dumpPath,
		});
		await expect(syncPromise).resolves.toBe(SyncResult.Updated);

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

		const syncPromise = sync({
			...SYNC_DEFAULTS,
			dumpPath,
		});
		await expect(syncPromise).resolves.toBe(SyncResult.Updated);

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

		const syncPromise = sync({
			...SYNC_DEFAULTS,
			dumpPath,
		});
		await expect(syncPromise).resolves.toBe(SyncResult.Updated);

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

		const syncPromise = sync({
			...SYNC_DEFAULTS,
			dumpPath,
		});
		await expect(syncPromise).resolves.toBe(SyncResult.Updated);

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

		const syncPromise = sync({
			...SYNC_DEFAULTS,
			dumpPath,
		});
		await expect(syncPromise).resolves.toBe(SyncResult.Updated);

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

		const syncPromise = sync({
			...SYNC_DEFAULTS,
			dumpPath,
		});
		await expect(syncPromise).resolves.toBe(SyncResult.Updated);

		const contents = new DirectoryContents();
		contents.expectFile('metadata.json');
		await expect(dumpPath).toMatchDirectory(contents);
	});

	describe('with vcs = none', () => {
		it('should remove .git folder', async () => {
			setupDatabases({
				folders: {},
				macros: [],
			});
			const dumpPath = await createTempDir();
			await mkdir(join(dumpPath, '.git'));

			const syncPromise = sync({
				...SYNC_DEFAULTS,
				dumpPath,
				vcs: 'none',
			});
			await expect(syncPromise).resolves.toBe(SyncResult.Updated);

			const contents = new DirectoryContents();
			contents.expectFile('metadata.json');
			await expect(dumpPath).toMatchDirectory(contents);
		});

		it('should remove .keepdir files', async () => {
			setupDatabases({
				folders: {
					'01': 'Foo',
				},
				macros: [],
			});
			const dumpPath = await createTempDir();
			await mkdir(join(dumpPath, 'Foo'));
			await writeFile(join(dumpPath, 'Foo', '.keepdir'), '');

			const syncPromise = sync({
				...SYNC_DEFAULTS,
				dumpPath,
				vcs: 'none',
			});
			await expect(syncPromise).resolves.toBe(SyncResult.Updated);

			const contents = new DirectoryContents();
			contents.expectFile('metadata.json');
			contents.expectDirectory('Foo');
			await expect(dumpPath).toMatchDirectory(contents);
		});
	});

	describe('with vcs = git', () => {
		it('should keep .git folder and contents', async () => {
			setupDatabases({
				folders: {},
				macros: [],
			});
			const dumpPath = await createTempDir();
			await mkdir(join(dumpPath, '.git'));
			await writeFile(join(dumpPath, '.git', 'index'), 'INDEX');
			await mkdir(join(dumpPath, 'Foo'));
			await mkdir(join(dumpPath, 'Foo', '.git'));

			const syncPromise = sync({
				...SYNC_DEFAULTS,
				dumpPath,
				vcs: 'git',
			});
			await expect(syncPromise).resolves.toBe(SyncResult.Updated);

			const contents = new DirectoryContents();
			contents.expectFile('metadata.json');
			contents.expectDirectory('.git');
			contents.expectFileWithContents(join('.git', 'index'), 'INDEX');
			await expect(dumpPath).toMatchDirectory(contents);
		});

		it('should create .keepdir files in empty directories', async () => {
			setupDatabases({
				folders: {
					'01': 'Foo',
					'02': 'Bar',
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

			const syncPromise = sync({
				...SYNC_DEFAULTS,
				dumpPath,
				vcs: 'git',
			});
			await expect(syncPromise).resolves.toBe(SyncResult.Updated);

			const contents = new DirectoryContents();
			contents.expectFile('metadata.json');
			contents.expectDirectory('Foo');
			contents.expectFile(join('Foo', 'foo.js'));
			contents.expectDirectory('Bar');
			contents.expectFileWithContents(join('Bar', '.keepdir'), '');
			await expect(dumpPath).toMatchDirectory(contents);
		});

		it('should remove .keepdir files that are no longer needed', async () => {
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
			await mkdir(join(dumpPath, 'Foo'));
			await writeFile(join(dumpPath, 'Foo', '.keepdir'), '');

			const syncPromise = sync({
				...SYNC_DEFAULTS,
				dumpPath,
				vcs: 'git',
			});
			await expect(syncPromise).resolves.toBe(SyncResult.Updated);

			const contents = new DirectoryContents();
			contents.expectFile('metadata.json');
			contents.expectDirectory('Foo');
			contents.expectFile(join('Foo', 'foo.js'));
			await expect(dumpPath).toMatchDirectory(contents);
		});
	});
});
