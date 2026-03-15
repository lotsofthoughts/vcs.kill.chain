#!/usr/bin/env bash
set -euo pipefail

tag=$(git tag -l --sort=-v:refname | head -n 1)
if [ -z "$tag" ]; then
  tag="v0.0.0"
fi
echo "Current Tag: $tag"

newtag="v$(./scripts/semver.sh bump patch "$tag")"
echo "New Tag: $newtag"
echo "$newtag" > .semver.version.tag

echo "Tag calculated: $newtag"
echo "Run 'make push-tag' to create and push this tag."
