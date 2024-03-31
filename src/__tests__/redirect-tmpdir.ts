import { mkdtempSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
jest.mock('node:os', () => ({
	__esModule: true,
	...jest.requireActual('os'),
	tmpdir: jest.fn(() => expect.getState().tmptmpdir),
}));

declare module 'expect' {
	export interface MatcherState {
		/**
		 * The value to use for os.tmpdir().
		 */
		tmptmpdir: string;
	}
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
const originalTmpDir: string = jest.requireActual('node:os').tmpdir();
const baseTmpDir = mkdtempSync(join(originalTmpDir, 'jest-run-'));

beforeEach(async () => {
	const state = expect.getState();
	state.tmptmpdir = await mkdtemp(join(baseTmpDir, 'sandbox-'));
});

afterEach(async () => {
	const state = expect.getState();
	await rm(state.tmptmpdir, {
		recursive: true,
		force: true,
	});
});

afterAll(async () => {
	await rm(baseTmpDir, {
		recursive: true,
		force: true,
	});
});

declare global {
	/**
	 * Create a temporary directory that's outside of the altered os.tmpdir() that's been created for this test.
	 */
	function createTempDir(): Promise<string>;
}

global.createTempDir = async (): Promise<string> => {
	const tempdir = await mkdtemp(join(baseTmpDir, 'test-'));
	return tempdir;
};
