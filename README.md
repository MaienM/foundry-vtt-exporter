# Foundry VTT exporter

Export data from the Foundry VTT databases (just macros for now) to plain files. These files can then be managed using something like git to track changes and have a history to refer back to.

## Docker

The easiest way to use this project is probably as a container, using something like `docker` or `podman`:

```bash
docker run --rm -v /path-to-foundry-data/worlds/world-name/data:/databases:ro -v /path-to-dump-to:/dump -e INTERVAL=60 ghcr.io/maienm/foundry-vtt-exporter:main
```

This will dump all macros for the world `/path-to-foundry-data/worlds/world-name` to `/path-to-dump-to`.

## Options

The following options can be passed as flags (when calling directly)/environment variables (when using the container image).

flag | env | description
--- | --- | ---
N/A | `INTERVAL` | The interval (in seconds) to perform the dumps at. If not given it will perform one dump and then exit. Only available in the container image.
`--vcs <vcs>`  | `FVE_VCS` | The version control system that is used to manage the dump directory (choices: `none`, `auto`, `git`, default: `auto`).
