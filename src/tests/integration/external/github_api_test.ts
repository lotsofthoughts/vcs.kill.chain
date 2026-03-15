/**
 * External integration tests that run against the real GitHub API.
 * Requires GITHUB_TOKEN environment variable.
 * Requires VCS_AGENT_TEST_REPO (e.g., "owner/test-repo") for a disposable test repository.
 *
 * Run with: deno test -A src/tests/integration/external/
 */

import { assertEquals } from '@std/assert';
import { GitHubClient } from '../../../github/client.ts';
import { getRepoSettings } from '../../../github/repos.ts';
import { listRulesets } from '../../../github/rulesets.ts';
import { listCollaborators } from '../../../github/collaborators.ts';
import { listEnvironments } from '../../../github/environments.ts';
import { listRepoVariables } from '../../../github/variables.ts';
import { listRepoSecrets } from '../../../github/secrets.ts';

const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
const TEST_REPO = Deno.env.get('VCS_AGENT_TEST_REPO');

const skip = !GITHUB_TOKEN || !TEST_REPO;

Deno.test({
  name: 'external - fetches repository settings from GitHub',
  ignore: skip,
  async fn() {
    const client = new GitHubClient({ token: GITHUB_TOKEN! });
    const [owner, repo] = TEST_REPO!.split('/');
    const settings = await getRepoSettings(client, owner, repo);
    assertEquals(typeof settings.full_name, 'string');
    assertEquals(settings.full_name, TEST_REPO);
  },
});

Deno.test({
  name: 'external - lists rulesets from GitHub',
  ignore: skip,
  async fn() {
    const client = new GitHubClient({ token: GITHUB_TOKEN! });
    const [owner, repo] = TEST_REPO!.split('/');
    const rulesets = await listRulesets(client, owner, repo);
    assertEquals(Array.isArray(rulesets), true);
  },
});

Deno.test({
  name: 'external - lists collaborators from GitHub',
  ignore: skip,
  async fn() {
    const client = new GitHubClient({ token: GITHUB_TOKEN! });
    const [owner, repo] = TEST_REPO!.split('/');
    const collaborators = await listCollaborators(client, owner, repo);
    assertEquals(Array.isArray(collaborators), true);
    assertEquals(collaborators.length >= 1, true);
  },
});

Deno.test({
  name: 'external - lists environments from GitHub',
  ignore: skip,
  async fn() {
    const client = new GitHubClient({ token: GITHUB_TOKEN! });
    const [owner, repo] = TEST_REPO!.split('/');
    const environments = await listEnvironments(client, owner, repo);
    assertEquals(Array.isArray(environments), true);
  },
});

Deno.test({
  name: 'external - lists repo variables from GitHub',
  ignore: skip,
  async fn() {
    const client = new GitHubClient({ token: GITHUB_TOKEN! });
    const [owner, repo] = TEST_REPO!.split('/');
    const variables = await listRepoVariables(client, owner, repo);
    assertEquals(Array.isArray(variables), true);
  },
});

Deno.test({
  name: 'external - lists repo secrets from GitHub',
  ignore: skip,
  async fn() {
    const client = new GitHubClient({ token: GITHUB_TOKEN! });
    const [owner, repo] = TEST_REPO!.split('/');
    const secrets = await listRepoSecrets(client, owner, repo);
    assertEquals(Array.isArray(secrets), true);
  },
});
