#!/usr/bin/env bash
set -euo pipefail

tag=$(git tag -l --sort=-v:refname | head -n 1)
if [ -z "$tag" ]; then
  tag="v0.0.0"
fi
echo "Current Tag: $tag"

build_num=$(shuf -i 10000-99999 -n 1)
newtag="v$(./scripts/semver.sh bump build "$build_num" "$tag")"
echo "Build Tag: $newtag"
echo "$newtag" > .semver.build.tag

echo "Tag calculated: $newtag"
echo "Run 'make push-tag' to create and push this tag."
