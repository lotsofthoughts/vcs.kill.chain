import { assertEquals } from '@std/assert';
import { GitHubClient } from '../../../github/client.ts';
import { syncRepository } from '../../../sync/engine.ts';
import { createMockGitHubServer } from '../../integration/internal/mock_server.ts';
import type { RepoConfig } from '../../../types.ts';

Deno.test('syncRepository - succeeds with settings only', async () => {
  const server = createMockGitHubServer();
  try {
    const client = new GitHubClient({
      token: 'test-token',
      baseUrl: `http://localhost:${server.port}`,
      maxRetries: 0,
    });

    const config: RepoConfig = {
      name: 'test-owner/test-repo',
      settings: { description: 'New desc', private: true },
    };

    const result = await syncRepository(client, config);
    assertEquals(result.success, true);
    assertEquals(result.actions_failed, 0);
    assertEquals(result.actions_taken, 1);
    assertEquals(server.repo.settings.description, 'New desc');
    assertEquals(server.repo.settings.private, true);
  } finally {
    server.close();
  }
});

Deno.test('syncRepository - succeeds with rulesets only', async () => {
  const server = createMockGitHubServer();
  try {
    const client = new GitHubClient({
      token: 'test-token',
      baseUrl: `http://localhost:${server.port}`,
      maxRetries: 0,
    });

    const config: RepoConfig = {
      name: 'test-owner/test-repo',
      rulesets: [
        {
          name: 'test-rule',
          target: 'branch',
          enforcement: 'active',
          rules: [{ type: 'pull_request' }],
        },
      ],
    };

    const result = await syncRepository(client, config);
    assertEquals(result.success, true);
    assertEquals(server.repo.rulesets.length, 1);
    assertEquals(server.repo.rulesets[0].name, 'test-rule');
  } finally {
    server.close();
  }
});

Deno.test('syncRepository - succeeds with collaborators only', async () => {
  const server = createMockGitHubServer();
  try {
    const client = new GitHubClient({
      token: 'test-token',
      baseUrl: `http://localhost:${server.port}`,
      maxRetries: 0,
    });

    const config: RepoConfig = {
      name: 'test-owner/test-repo',
      collaborators: [
        { username: 'dev1', permission: 'push' },
        { username: 'dev2', permission: 'admin' },
      ],
    };

    const result = await syncRepository(client, config);
    assertEquals(result.success, true);
    assertEquals(server.repo.collaborators.length >= 2, true);
  } finally {
    server.close();
  }
});

Deno.test('syncRepository - succeeds with variables only', async () => {
  const server = createMockGitHubServer();
  try {
    const client = new GitHubClient({
      token: 'test-token',
      baseUrl: `http://localhost:${server.port}`,
      maxRetries: 0,
    });

    const config: RepoConfig = {
      name: 'test-owner/test-repo',
      variables: { KEY1: 'val1', KEY2: 'val2' },
    };

    const result = await syncRepository(client, config);
    assertEquals(result.success, true);
    assertEquals(server.repo.variables.length, 2);
  } finally {
    server.close();
  }
});

Deno.test('syncRepository - handles empty config gracefully', async () => {
  const server = createMockGitHubServer();
  try {
    const client = new GitHubClient({
      token: 'test-token',
      baseUrl: `http://localhost:${server.port}`,
      maxRetries: 0,
    });

    const config: RepoConfig = { name: 'test-owner/test-repo' };
    const result = await syncRepository(client, config);
    assertEquals(result.success, true);
    assertEquals(result.actions_taken, 0);
  } finally {
    server.close();
  }
});

Deno.test('syncRepository - dry-run does not modify state', async () => {
  const server = createMockGitHubServer();
  try {
    const client = new GitHubClient({
      token: 'test-token',
      baseUrl: `http://localhost:${server.port}`,
      maxRetries: 0,
    });

    const config: RepoConfig = {
      name: 'test-owner/test-repo',
      settings: { description: 'Should not apply' },
    };

    const result = await syncRepository(client, config, { dryRun: true });
    assertEquals(result.success, true);
    assertEquals(server.repo.settings.description, 'Original description');
  } finally {
    server.close();
  }
});

Deno.test('syncRepository - reports duration in milliseconds', async () => {
  const server = createMockGitHubServer();
  try {
    const client = new GitHubClient({
      token: 'test-token',
      baseUrl: `http://localhost:${server.port}`,
      maxRetries: 0,
    });

    const config: RepoConfig = {
      name: 'test-owner/test-repo',
      settings: { description: 'test' },
    };

    const result = await syncRepository(client, config);
    assertEquals(result.duration_ms >= 0, true);
    assertEquals(typeof result.duration_ms, 'number');
  } finally {
    server.close();
  }
});
