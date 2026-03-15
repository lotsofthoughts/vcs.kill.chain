#!/usr/bin/env bash
set -euo pipefail

version=$(git tag -l --sort=-v:refname | head -n 1)
if [ -z "$version" ]; then
  version="v0.0.0"
fi

echo "Syncing version from git tag: $version"

if command -v jq &> /dev/null; then
  tmp=$(mktemp)
  jq ".version = \"$version\"" deno.json > "$tmp" && mv "$tmp" deno.json
else
  deno eval "
    const cfg = JSON.parse(await Deno.readTextFile('deno.json'));
    cfg.version = '$version';
    await Deno.writeTextFile('deno.json', JSON.stringify(cfg, null, 2) + '\n');
  "
fi

deno run --allow-all src/make_version.ts
echo "Version synced: $version"
