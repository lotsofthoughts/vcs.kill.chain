/**
 * Repository and environment variables management via the GitHub API.
 */

import type { GitHubClient } from './client.ts';

export interface GitHubVariable {
  name: string;
  value: string;
  created_at: string;
  updated_at: string;
}

// ─── Repository-level variables ───────────────────────────────────────────────

export async function listRepoVariables(
  client: GitHubClient,
  owner: string,
  repo: string,
): Promise<GitHubVariable[]> {
  const { data } = await client.get<{ variables: GitHubVariable[] }>(
    `/repos/${owner}/${repo}/actions/variables`,
  );
  return data?.variables ?? [];
}

export async function getRepoVariable(
  client: GitHubClient,
  owner: string,
  repo: string,
  name: string,
): Promise<GitHubVariable | null> {
  try {
    const { data } = await client.get<GitHubVariable>(
      `/repos/${owner}/${repo}/actions/variables/${name}`,
    );
    return data;
  } catch {
    return null;
  }
}

export async function createRepoVariable(
  client: GitHubClient,
  owner: string,
  repo: string,
  name: string,
  value: string,
): Promise<void> {
  await client.post(`/repos/${owner}/${repo}/actions/variables`, { name, value });
}

export async function updateRepoVariable(
  client: GitHubClient,
  owner: string,
  repo: string,
  name: string,
  value: string,
): Promise<void> {
  await client.patch(`/repos/${owner}/${repo}/actions/variables/${name}`, { name, value });
}

export async function syncRepoVariables(
  client: GitHubClient,
  owner: string,
  repo: string,
  desired: Record<string, string>,
): Promise<{ created: string[]; updated: string[] }> {
  const result = { created: [] as string[], updated: [] as string[] };

  for (const [name, value] of Object.entries(desired)) {
    const existing = await getRepoVariable(client, owner, repo, name);
    if (existing) {
      if (existing.value !== value) {
        await updateRepoVariable(client, owner, repo, name, value);
        result.updated.push(name);
      }
    } else {
      await createRepoVariable(client, owner, repo, name, value);
      result.created.push(name);
    }
  }

  return result;
}

// ─── Environment-level variables ──────────────────────────────────────────────

export async function listEnvVariables(
  client: GitHubClient,
  owner: string,
  repo: string,
  envName: string,
): Promise<GitHubVariable[]> {
  const { data } = await client.get<{ variables: GitHubVariable[] }>(
    `/repos/${owner}/${repo}/environments/${envName}/variables`,
  );
  return data?.variables ?? [];
}

export async function createEnvVariable(
  client: GitHubClient,
  owner: string,
  repo: string,
  envName: string,
  name: string,
  value: string,
): Promise<void> {
  await client.post(
    `/repos/${owner}/${repo}/environments/${envName}/variables`,
    { name, value },
  );
}

export async function updateEnvVariable(
  client: GitHubClient,
  owner: string,
  repo: string,
  envName: string,
  name: string,
  value: string,
): Promise<void> {
  await client.patch(
    `/repos/${owner}/${repo}/environments/${envName}/variables/${name}`,
    { name, value },
  );
}

export async function syncEnvVariables(
  client: GitHubClient,
  owner: string,
  repo: string,
  envName: string,
  desired: Record<string, string>,
): Promise<{ created: string[]; updated: string[] }> {
  const existing = await listEnvVariables(client, owner, repo, envName);
  const existingMap = new Map(existing.map((v) => [v.name, v]));
  const result = { created: [] as string[], updated: [] as string[] };

  for (const [name, value] of Object.entries(desired)) {
    const current = existingMap.get(name);
    if (current) {
      if (current.value !== value) {
        await updateEnvVariable(client, owner, repo, envName, name, value);
        result.updated.push(name);
      }
    } else {
      await createEnvVariable(client, owner, repo, envName, name, value);
      result.created.push(name);
    }
  }

  return result;
}
