import { ClassicLevel } from 'classic-level';

jest.mock('classic-level');

/**
 * Create a mocked ClassicLevel instance which will yield the given items.
 */
// eslint-disable-next-line import/prefer-default-export
export const createMockClassicLevel = <I>(items: I[]): ClassicLevel => {
	const db = new ClassicLevel('');

	// @ts-expect-error 2345
	// eslint-disable-next-line @typescript-eslint/require-await
	jest.mocked(db).values.mockImplementation(async function* mockValues(..._args: unknown[]) {
		for (const item of items) {
			yield JSON.stringify(item);
		}
	});

	return db;
};
