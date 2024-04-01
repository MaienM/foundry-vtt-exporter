#!/usr/bin/env sh

run() {
	echo "[$(date +%F)] Running exporter"
	node /app/dist/src/main.js /databases /dump
}

if [ -n "$INTERVAL" ] && [ "$INTERVAL" -gt 1 ]; then
	echo "Running exporter once every $INTERVAL second(s)."
	echo

	run "$@"
	while true; do
		sleep "$INTERVAL"
		run "$@"
	done
else
	run "$@"
fi
