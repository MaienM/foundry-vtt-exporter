/* istanbul ignore file */
/* eslint-disable no-console */

import sync, { SyncResult } from './sync.js';

const main = async () => {
	// Parse arguments.
	const args = process.argv.slice(2);
	const sourceDir = args[0];
	const targetDir = args[1];
	if (args.length !== 2 || targetDir === undefined) {
		console.error(`Usage: ${process.argv.slice(0, 2).join(' ')} [source] [target]`);
		process.exit(1);
	}

	// eslint-disable-next-line default-case
	switch (await sync(sourceDir, targetDir)) {
		case SyncResult.Updated:
			console.log('Updated dump.');
			break;
		case SyncResult.NoChange:
			console.log('Dump already up to date.');
			break;
	}
};

await main();

/* eslint-enable */
