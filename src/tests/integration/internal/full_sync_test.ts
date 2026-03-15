import { assertEquals } from '@std/assert';
import { GitHubClient } from '../../../github/client.ts';
import { syncRepository } from '../../../sync/engine.ts';
import { generatePlan, formatPlan } from '../../../sync/plan.ts';
import { parseConfig } from '../../../config/mod.ts';
import { createMockGitHubServer } from './mock_server.ts';
import type { RepoConfig } from '../../../types.ts';

const TEST_CONFIG = `
version: "1.0"
settings:
  conjur_api_key_env: CONJUR_API_KEY
repositories:
  - name: "test-owner/test-repo"
    settings:
      description: "Updated description"
      private: true
      has_wiki: false
      delete_branch_on_merge: true
    rulesets:
      - name: main-protection
        target: branch
        enforcement: active
        rules:
          - type: pull_request
            parameters:
              required_approving_review_count: 2
      - name: release-tags
        target: tag
        enforcement: active
        rules:
          - type: creation
    collaborators:
      - username: new-dev
        permission: push
    security:
      vulnerability_alerts: true
      automated_security_fixes: true
      code_scanning:
        state: configured
    environments:
      - name: staging
        variables:
          ENV: staging
        secrets:
          API_KEY: "literal-key-value"
      - name: production
        wait_timer: 30
    variables:
      TEAM: platform
      SERVICE: webapp
    secrets:
      CONJUR_API_KEY: "test-conjur-key"
`;

Deno.test('integration - full sync applies all changes', async () => {
  const server = createMockGitHubServer();
  try {
    const client = new GitHubClient({
      token: 'test-token',
      baseUrl: `http://localhost:${server.port}`,
      maxRetries: 0,
    });

    const config = parseConfig(TEST_CONFIG);
    const repoConfig = config.repositories[0];

    const result = await syncRepository(client, repoConfig, {
      verbose: false,
      conjurApiKey: 'test-conjur-key',
    });

    assertEquals(result.success, true);
    assertEquals(result.errors.length, 0);
    assertEquals(result.actions_taken > 0, true);

    // Verify settings were applied
    assertEquals(server.repo.settings.description, 'Updated description');
    assertEquals(server.repo.settings.private, true);
    assertEquals(server.repo.settings.has_wiki, false);
    assertEquals(server.repo.settings.delete_branch_on_merge, true);

    // Verify rulesets were created
    assertEquals(server.repo.rulesets.length, 2);
    assertEquals(server.repo.rulesets[0].name, 'main-protection');
    assertEquals(server.repo.rulesets[1].name, 'release-tags');

    // Verify collaborator was added
    const newDev = server.repo.collaborators.find((c) => c.login === 'new-dev');
    assertEquals(newDev !== undefined, true);

    // Verify environments were created
    assertEquals(server.repo.environments.length, 2);

    // Verify variables were created
    assertEquals(server.repo.variables.length, 2);
    assertEquals(server.repo.variables[0].name, 'TEAM');
    assertEquals(server.repo.variables[1].name, 'SERVICE');

    // Verify secrets were created
    assertEquals(server.repo.secrets.length >= 1, true);
  } finally {
    server.close();
  }
});

Deno.test('integration - dry-run sync does not modify state', async () => {
  const server = createMockGitHubServer();
  try {
    const client = new GitHubClient({
      token: 'test-token',
      baseUrl: `http://localhost:${server.port}`,
      maxRetries: 0,
    });

    const config = parseConfig(TEST_CONFIG);
    const repoConfig = config.repositories[0];

    const result = await syncRepository(client, repoConfig, {
      dryRun: true,
      verbose: false,
    });

    assertEquals(result.success, true);

    // Settings should NOT have been changed
    assertEquals(server.repo.settings.description, 'Original description');
    assertEquals(server.repo.settings.private, false);

    // No rulesets should have been created
    assertEquals(server.repo.rulesets.length, 0);

    // No new collaborators
    assertEquals(server.repo.collaborators.length, 1);
  } finally {
    server.close();
  }
});

Deno.test('integration - plan generates correct actions', async () => {
  const server = createMockGitHubServer();
  try {
    const client = new GitHubClient({
      token: 'test-token',
      baseUrl: `http://localhost:${server.port}`,
      maxRetries: 0,
    });

    const config = parseConfig(TEST_CONFIG);
    const repoConfig = config.repositories[0];

    const plan = await generatePlan(client, repoConfig);

    assertEquals(plan.repository, 'test-owner/test-repo');
    assertEquals(plan.actions.length > 0, true);

    // Should have settings changes
    const settingsActions = plan.actions.filter((a) => a.resource === 'settings');
    assertEquals(settingsActions.length > 0, true);

    // Should have ruleset creates
    const rulesetActions = plan.actions.filter((a) => a.resource === 'ruleset');
    assertEquals(rulesetActions.length, 2);
    assertEquals(rulesetActions.every((a) => a.action === 'create'), true);

    // Should have variable creates
    const varActions = plan.actions.filter((a) => a.resource === 'variable');
    assertEquals(varActions.length, 2);

    // Format plan should produce readable output
    const formatted = formatPlan(plan);
    assertEquals(formatted.includes('test-owner/test-repo'), true);
    assertEquals(formatted.includes('Create'), true);
  } finally {
    server.close();
  }
});

Deno.test('integration - second sync updates instead of creates', async () => {
  const server = createMockGitHubServer();
  try {
    const client = new GitHubClient({
      token: 'test-token',
      baseUrl: `http://localhost:${server.port}`,
      maxRetries: 0,
    });

    const config = parseConfig(TEST_CONFIG);
    const repoConfig = config.repositories[0];

    // First sync
    const result1 = await syncRepository(client, repoConfig, {
      conjurApiKey: 'test-key',
    });
    assertEquals(result1.success, true);
    assertEquals(server.repo.rulesets.length, 2);

    // Second sync (should update, not duplicate)
    const result2 = await syncRepository(client, repoConfig, {
      conjurApiKey: 'test-key',
    });
    assertEquals(result2.success, true);
    assertEquals(server.repo.rulesets.length, 2);
  } finally {
    server.close();
  }
});

Deno.test('integration - sync with verbose output does not throw', async () => {
  const server = createMockGitHubServer();
  try {
    const client = new GitHubClient({
      token: 'test-token',
      baseUrl: `http://localhost:${server.port}`,
      maxRetries: 0,
    });

    const repoConfig: RepoConfig = {
      name: 'test-owner/test-repo',
      settings: { description: 'Verbose test' },
    };

    const result = await syncRepository(client, repoConfig, { verbose: true });
    assertEquals(result.success, true);
  } finally {
    server.close();
  }
});
