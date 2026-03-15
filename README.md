# vcs-agent

**GitHub Repository Configuration Management CLI**

A TypeScript CLI tool built with Deno that manages GitHub repository settings as code. Define your repository configurations in YAML, and vcs-agent will sync settings, rulesets, collaborators, security, environments, variables, and secrets across all your repositories.

## Features

| Feature | Description |
| --- | --- |
| **Repository Settings** | Manage all repo-level settings (visibility, merge strategies, features) |
| **Branch Rulesets** | Create, update, and delete branch/tag protection rulesets |
| **Collaborator Access** | Sync collaborator permissions without org-level access |
| **Security & CodeQL** | Configure vulnerability alerts, secret scanning, code scanning |
| **Environments** | Manage deployment environments with reviewers and wait timers |
| **Variables & Secrets** | Sync environment variables and encrypted secrets to repos |
| **Azure Key Vault** | Managed identity + OIDC federation for Azure Key Vault access |
| **Conjur Integration** | CONJUR_API_KEY synced from env var or runtime flag |
| **Dry Run / Plan** | Preview changes before applying with `plan` or `--dry-run` |
| **Shell Completions** | Bash, Zsh, and Fish completions via `completions` command |
| **Cross-Platform** | Compiles to standalone binaries for Linux, macOS, Windows |

## Quick Start

### Prerequisites

- [Deno 2.0.2+](https://deno.land/)
- A GitHub personal access token with `repo` and `admin:repo_hook` scopes

### Run

```bash
# Validate your config
deno run --allow-all ./src/mod.ts validate --config vcs-agent.yml

# Preview changes (dry run)
deno run --allow-all ./src/mod.ts plan --config vcs-agent.yml

# Apply changes
export GITHUB_TOKEN="ghp_..."
export CONJUR_API_KEY="..."
deno run --allow-all ./src/mod.ts sync --config vcs-agent.yml

# With verbose output
deno run --allow-all ./src/mod.ts sync --config vcs-agent.yml --verbose

# Dry run through the sync command
deno run --allow-all ./src/mod.ts sync --config vcs-agent.yml --dry-run
```

### Shell Completions

```bash
# Generate bash completions
deno run --allow-all ./src/mod.ts completions bash > /etc/bash_completion.d/vcs-agent

# Generate zsh completions
deno run --allow-all ./src/mod.ts completions zsh > ~/.zsh/completions/_vcs-agent

# Generate fish completions
deno run --allow-all ./src/mod.ts completions fish > ~/.config/fish/completions/vcs-agent.fish
```

## Configuration

Create a `vcs-agent.yml` file (see [vcs-agent.yml](vcs-agent.yml) for a complete example):

```yaml
version: "1.0"

settings:
  conjur_api_key_env: CONJUR_API_KEY

repositories:
  - name: "owner/repo"
    settings:
      description: "My repository"
      private: true
      allow_squash_merge: true
      delete_branch_on_merge: true

    rulesets:
      - name: main-protection
        target: branch
        enforcement: active
        conditions:
          ref_name:
            include: ["refs/heads/main"]
        rules:
          - type: pull_request
            parameters:
              required_approving_review_count: 2
          - type: required_status_checks
            parameters:
              required_status_checks:
                - context: "ci/test"

    collaborators:
      - username: dev-lead
        permission: admin

    security:
      vulnerability_alerts: true
      secret_scanning: true
      code_scanning:
        state: configured
        languages: [javascript, typescript]

    environments:
      - name: production
        wait_timer: 30
        reviewers:
          - type: User
            id: 12345
        variables:
          DEPLOY_ENV: production
        secrets:
          CONJUR_API_KEY: "$CONJUR_API_KEY"

    variables:
      TEAM_NAME: platform

    secrets:
      CONJUR_API_KEY: "$CONJUR_API_KEY"

    azure_keyvault:
      enabled: true
      vault_name: my-vault
      tenant_id: "..."
      subscription_id: "..."
      resource_group: rg-prod
```

### Secret References

Secrets in the YAML config that start with `$` are resolved from environment variables at runtime:

```yaml
secrets:
  CONJUR_API_KEY: "$CONJUR_API_KEY"  # Resolved from env var
  STATIC_SECRET: "literal-value"      # Used as-is
```

The Conjur API key can also be passed via the `--conjur-api-key` flag.

## GitHub Actions Workflow

The included [sync workflow](.github/workflows/sync.yml) runs automatically when `vcs-agent.yml` changes on `main`, or manually via `workflow_dispatch`.

### Required Secrets

| Secret | Purpose |
| --- | --- |
| `VCS_AGENT_TOKEN` | GitHub PAT with `repo` scope for target repositories |
| `CONJUR_API_KEY` | Conjur API key for secret injection |

### Azure OIDC (Optional)

For Azure Key Vault integration, configure OIDC federation:

| Variable | Purpose |
| --- | --- |
| `AZURE_CLIENT_ID` | Azure AD application client ID |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |

## Development

```bash
# Run the CLI
make run
# or: deno run --allow-all ./src/mod.ts

# Type check
make check

# Lint
make lint

# Run all tests
make test

# Run unit tests only
make test-unit

# Compile cross-platform binaries
make compile
```

### Versioning

Tags are calculated locally, pushed separately:

```bash
make bump-patch   # Calculate next patch version
make bump-minor   # Calculate next minor version
make bump-major   # Calculate next major version
make push-tag     # Create and push the calculated tag
```

The CI uses [semantic-version](https://github.com/paulhatch/semantic-version) for automated versioning on `main`.

## Architecture

```
src/
├── mod.ts              # CLI entry point
├── cli/mod.ts          # Cliffy command definitions
├── config/             # YAML config loader & schema validation
├── github/             # GitHub REST API client modules
│   ├── client.ts       # Base HTTP client with retry/rate-limit
│   ├── repos.ts        # Repository settings
│   ├── rulesets.ts     # Branch/tag rulesets
│   ├── collaborators.ts
│   ├── security.ts     # Vulnerability alerts, CodeQL
│   ├── environments.ts
│   ├── variables.ts    # Repo + environment variables
│   └── secrets.ts      # Encrypted secret management
├── azure/              # Azure Key Vault + OIDC
├── sync/               # Sync engine + plan/diff
└── tests/              # Unit + integration test suite
```

## Supported Platforms

| Platform | Architecture |
| --- | --- |
| Linux | amd64, arm64 |
| macOS | amd64, arm64 |
| Windows | amd64 |

## License

MIT License. © 2025.
