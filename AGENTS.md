# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a Deno 2.0.2 TypeScript microservice template (`@softdist/orchestras`). It produces cross-platform compiled CLI binaries. The current `src/mod.ts` is a version-printer placeholder.

### Key commands

| Task | Command |
|------|---------|
| Run | `deno run --allow-all ./src/mod.ts` |
| Type check | `deno check ./src/mod.ts` |
| Lint | `deno lint` |
| Format check | `deno fmt --check` |
| Test | `deno test -A` (no test modules configured by default; `deno.json` has `"test": { "include": [] }`) |
| Build (version file) | `deno run --allow-all src/make_version.ts` |

### Gotchas

- **`.envcrypt` and `make`**: The Makefile includes `.envcrypt`, which is transcrypt-encrypted. Set `CODESPACES=true` when using `make` targets (e.g., `CODESPACES=true make run`) to skip the encrypted file include. This env var is pre-configured in `~/.bashrc`.
- **`deno fmt --check`**: The repository has pre-existing formatting differences in `src/version.ts`, `README.md`, and `release-notes.md`. These are not regressions.
- **Test suite**: `deno.json` sets `"test": { "include": [] }`, so `deno test -A` reports "No test modules found". The test stub at `src/tests/mod.test.ts` has a broken import (`mod` is not exported from `mod.ts`). This is by design for the template.
- **No external services**: This project has zero database, API, or network dependencies at runtime.
- **Deno version**: Pinned to 2.0.2 in `.dvmrc`. The update script installs this version.
