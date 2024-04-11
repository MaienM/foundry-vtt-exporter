#!/usr/bin/env sh

set -e

. entrypoint-base.sh

if [ -n "$GIT_COMMIT" ]; then
	prerun() {
		(
			cd /dump
			git reset --hard origin
			git clean -dxf .
		)
	}

	postrun() {
		(
			cd /dump
			git add --all
			if [ "$(git diff --staged | wc -l)" -eq 0 ]; then
				return 0
			fi
			git commit --message "${GIT_COMMIT_MESSAGE:-Update}"
			git push
		)
	}
fi

if [ -n "$GIT_REPO" ]; then
	echo "Cloning git repository to /dump."
	git clone "$GIT_REPO" /dump
fi

FVE_VCS='git'
export FVE_VCS

main
