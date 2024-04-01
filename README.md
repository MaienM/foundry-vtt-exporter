# Foundry VTT exporter

Export data from the Foundry VTT databases (just macros for now) to plain files. These files can then be managed using something like git to track changes and have a history to refer back to.

## Image

The easiest way to use this project is probably as a container, using something like `docker` or `podman`:

```bash
docker run --rm -v /path-to-foundry-data/worlds/world-name/data:/databases:ro -v /path-to-dump-to:/dump ghcr.io/maienm/foundry-vtt-exporter:main
```

This will dump all macros for the world `/path-to-foundry-data/worlds/world-name` to `/path-to-dump-to`.

### Options

The options starting with `GIT_` are only available in the git variant of the image (ending with `-git`).

#### `WATCH`

When set to a non-empty value the container will watch the databases for changes and will redo the dump whenever there are any, otherwise it sill perform one dump and then exit.

#### `GIT_REPO`

When this is set the provided git repository will be cloned to `/dump`.

Only available in the git variant of the image.

#### `GIT_COMMIT`

When this is set after a commit will be created & pushed after every dump.

Only available in the git variant of the image.

#### `GIT_COMMIT_MESSAGE`

The message to be used for the commits created by `GIT_COMMIT`. Default to `Update`.

Only available in the git variant of the image.

#### `FVE_VCS` 

The version control system that is used to manage the dump directory (choices: `none`, `auto`, `git`, default: `auto`).

When this is `git` (or `auto` + the dump directory looks like a git repository) the `.git` directory will be ignored, and any empty directories will have a `.keepdir` file created in them.

Will automatically be set to `git` for the git variant of the image.

## Node

With nodejs setup & the repository checked out:

```bash
yarn
yarn run start --help
```
