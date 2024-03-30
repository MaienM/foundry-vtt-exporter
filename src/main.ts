/* istanbul ignore file */
/* eslint-disable no-console */

import { Command } from '@commander-js/extra-typings';
import packageInfo from '../package.json' with { type: 'json' };
import sync, { SyncResult } from './sync.js';

new Command()
	.name(packageInfo.name)
	.description(packageInfo.description)
	.version(packageInfo.version)
	.argument('<databases>', 'path to the directory containing the Foundry VTT databases')
	.argument('<dump>', 'path to the directory to store the dump in')
	.action(async (databasePath: string, dumpPath: string) => {
		const result = await sync({
			databasePath,
			dumpPath,
		});
		// eslint-disable-next-line default-case
		switch (result) {
			case SyncResult.Updated:
				console.log('Updated dump.');
				break;
			case SyncResult.NoChange:
				console.log('Dump already up to date.');
				break;
		}
	})
	.parse();

/* eslint-enable */
