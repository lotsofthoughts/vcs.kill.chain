# AGENTS.md

## Cursor Cloud specific instructions

### Overview

`vcs-agent` is a Deno 2.0.2 TypeScript CLI that manages GitHub repository settings as code. It syncs settings, rulesets, collaborators, security, environments, variables, secrets, and Azure Key Vault configuration from a YAML file.

### Key commands

See `Makefile` and `deno.json` tasks for the full list. Core commands:

| Task | Command |
|------|---------|
| Run CLI | `deno run --allow-all ./src/mod.ts` |
| Type check | `deno check src/mod.ts` |
| Lint | `deno lint` |
| All tests | `deno test -A --parallel src/tests/` |
| Unit tests | `deno test -A --parallel src/tests/unit/` |
| Integration | `deno test -A src/tests/integration/internal/` |

### Gotchas

- **`.envcrypt` and `make`**: The Makefile includes `.envcrypt`, which is transcrypt-encrypted. Set `CODESPACES=true` when using `make` targets (e.g., `CODESPACES=true make run`). This env var is pre-configured in `~/.bashrc`.
- **External integration tests**: Tests in `src/tests/integration/external/` require `GITHUB_TOKEN` and `VCS_AGENT_TEST_REPO` env vars and are skipped otherwise.
- **Secret encryption**: The `src/github/secrets.ts` module uses `tweetnacl` for encrypting GitHub secrets. The sealed box implementation is compatible with GitHub's libsodium-based encryption.
- **No external services**: This project has zero database or network dependencies at runtime (all GitHub/Azure calls are made via `fetch`).
- **Deno version**: Pinned to 2.0.2 in `.dvmrc`. The update script installs this version.
