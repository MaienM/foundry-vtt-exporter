#!/usr/bin/env sh

set -e

prerun() {
	true
}

postrun() {
	true
}

run() {
	echo "[$(date +'%F %T')] Running exporter"
	prerun
	node /app/dist/src/main.js /databases /dump
	postrun
}

main() {
	if [ -n "$WATCH" ]; then
		run
		while true; do
			echo "Waiting for databases changes..."
			# shellcheck disable=3001
			read -r < <(inotifyd - /databases)
			sleep 1
			run
		done
	else
		run
	fi
}
