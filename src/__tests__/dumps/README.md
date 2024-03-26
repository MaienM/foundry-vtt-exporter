# Test data

These are some copies of a few different versions of the used data files for use in the tests.

## 01_empty

This was made right after creating a new world, before creating any macros or folders.

## 02_examples_pending

This adds two macros (one chat, one script) in the root. The world has not yet been closed at this point and thus the changes are not yet in the database's manifest, only in the log.

## 03_saved

The same data as the previous copy, but now the world has been closed and the data has moved from the database log to the manifest.

## 04_folders_changes_moves

Creates a bunch of nested folders (up to the limit of 4 levels deep). Adds a new macro inside the nested folders, and moves macro 2 to inside one of the folders.

## 05_deletions_changes_moves

Deletes macro 1, moves macro 2 back to the root, and adds a new macro in the root.

## 06_copies_name_clashes

Recreates deleted macro 1, renames macro 2, and creates a clone of macro 3 with the same name.

## 07_deletions_type_change

Deletes a few folders, macro 3 (both copies) and macro 4. Moves macro 2 to a new folder. Changes type of macro 1 from chat to script.

## 08_saved

The same data as the previous copy, but now the world has been closed and the data has moved from the database log to the manifest.

## 09_folder_renames

Renames some of the folders. No changes to the macros.

## 10_empty_folder

Add a new folder without any contents.
