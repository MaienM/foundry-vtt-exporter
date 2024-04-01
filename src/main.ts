/* istanbul ignore file */
/* eslint-disable no-console */

import { Command, Option } from '@commander-js/extra-typings';
import packageInfo from '../package.json' with { type: 'json' };
import sync, { SyncResult } from './sync.js';

new Command()
	.name(packageInfo.name)
	.description(packageInfo.description)
	.version(packageInfo.version)
	.argument('<databases>', 'path to the directory containing the Foundry VTT databases')
	.argument('<dump>', 'path to the directory to store the dump in')
	.addOption(
		new Option(
			'--vcs <vcs>',
			'the version control system that is used to manage the dump directory',
		)
			.env('FVE_VCS')
			.choices(['none', 'auto', 'git'] as const)
			.default('auto' as const),
	)
	.action(async (databasePath, dumpPath, options) => {
		const result = await sync({
			databasePath,
			dumpPath,
			...options,
		});
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
