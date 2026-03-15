$(shell touch .envcrypt)
ifeq ($(origin CODESPACES),undefined)
  -include .envcrypt
  $(eval export $(shell sed -ne 's/ *#.*$$//; /./ s/=.*$$// p' .envcrypt 2>/dev/null))
endif

.PHONY: help
help: ## Print all commands and help info
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.DEFAULT_GOAL := help

# ─── Development ──────────────────────────────────────────────

run: ## Run the CLI
	deno run --allow-all ./src/mod.ts

dev: ## Run with watch mode
	deno run --watch --allow-all ./src/mod.ts

check: ## Type-check source
	deno check ./src/mod.ts

lint: ## Run linter
	deno lint

fmt: ## Format code
	deno fmt

fmt-check: ## Check formatting
	deno fmt --check

# ─── Testing ──────────────────────────────────────────────────

test: ## Run all tests
	deno test -A --parallel src/tests/

test-unit: ## Run unit tests
	deno test -A --parallel src/tests/unit/

test-integration: ## Run integration tests
	deno test -A src/tests/integration/

# ─── Build & Release ─────────────────────────────────────────

set-version: ## Sync version.ts from latest git tag
	chmod +x ./scripts/version.sh
	./scripts/version.sh

build-version: ## Generate version.ts from deno.json
	deno run --allow-all src/make_version.ts

compile: ## Compile cross-platform binaries
	mkdir -p ./bin
	deno compile --allow-all --no-check --target x86_64-unknown-linux-gnu --output ./bin/vcs-agent-linux-amd64 ./src/mod.ts
	deno compile --allow-all --no-check --target aarch64-unknown-linux-gnu --output ./bin/vcs-agent-linux-arm64 ./src/mod.ts
	deno compile --allow-all --no-check --target x86_64-apple-darwin --output ./bin/vcs-agent-darwin-amd64 ./src/mod.ts
	deno compile --allow-all --no-check --target aarch64-apple-darwin --output ./bin/vcs-agent-darwin-arm64 ./src/mod.ts
	deno compile --allow-all --no-check --target x86_64-pc-windows-msvc --output ./bin/vcs-agent-windows-amd64.exe ./src/mod.ts

# ─── Versioning (calculate only, no push) ─────────────────────

bump-patch: ## Calculate next patch version
	chmod +x ./scripts/bump_patch.sh
	./scripts/bump_patch.sh

bump-minor: ## Calculate next minor version
	chmod +x ./scripts/bump_minor.sh
	./scripts/bump_minor.sh

bump-major: ## Calculate next major version
	chmod +x ./scripts/bump_major.sh
	./scripts/bump_major.sh

bump-build: ## Calculate next build tag
	chmod +x ./scripts/bump_build.sh
	./scripts/bump_build.sh

tag: ## Show the latest git tag
	@git tag -l --sort=-v:refname | head -n 1 || echo "No tags found"

push-tag: ## Create and push the calculated tag (from .semver.version.tag)
	@if [ -f .semver.version.tag ]; then \
		TAG=$$(cat .semver.version.tag); \
		echo "Creating and pushing tag: $$TAG"; \
		git tag -a "$$TAG" -m "$$TAG"; \
		git push origin "$$TAG"; \
	else \
		echo "No tag file found. Run bump-patch, bump-minor, or bump-major first."; \
		exit 1; \
	fi

push-tags: ## Push all tags
	git push origin --tags

# ─── Setup ────────────────────────────────────────────────────

install: ## Full setup: check, test, run
	make check
	make test
	make run
	@echo "-- Setup complete --"

install-tools: ## Install SAST toolchain
	chmod +x ./scripts/*
	./scripts/scan.sh

setup-brew: ## Install brew dependencies
	chmod +x ./scripts/setup_brew.sh
	./scripts/setup_brew.sh

actions: ## List GitHub Actions used in workflows
	@find . -path '*/.github/workflows/*' -type f -name '*.yml' -print0 \
		| xargs -0 grep --no-filename "uses:" 2>/dev/null \
		| sed 's/\- uses:/uses:/g' \
		| tr '"' ' ' \
		| awk '{print $$2}' \
		| sed 's/\r//g' \
		| sort \
		| uniq --count \
		| sort --numeric-sort
