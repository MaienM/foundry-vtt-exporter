import { join, resolve } from 'node:path';
// @ts-expect-error 7016
import dirname from './__dirname.cjs';

export const DUMP_NAMES = [
	'01_empty',
	'02_examples_pending',
	'03_saved',
	'04_folders_changes_moves',
	'05_deletions_changes_moves',
	'06_copies_name_clashes',
	'07_deletions_type_change',
	'08_saved',
	'09_folder_renames',
	'10_empty_folder',
] as const;

export type Dump = typeof DUMP_NAMES[number];

export const DUMP_ROOT = resolve(dirname, 'dumps');
export const DUMP_PATHS = Object.fromEntries(
	DUMP_NAMES.map((name) => [name, join(DUMP_ROOT, name)]),
) as Record<Dump, string>;
