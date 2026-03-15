/**
 * Repository environment management via the GitHub API.
 */

import type { GitHubClient } from './client.ts';
import type { DeploymentBranchPolicy, Environment, EnvironmentReviewer } from '../types.ts';

export interface GitHubEnvironment {
  id: number;
  name: string;
  protection_rules: {
    id: number;
    type: string;
    wait_timer?: number;
    reviewers?: { type: string; reviewer: { id: number; login?: string } }[];
    prevent_self_review?: boolean;
  }[];
  deployment_branch_policy: DeploymentBranchPolicy | null;
}

export async function listEnvironments(
  client: GitHubClient,
  owner: string,
  repo: string,
): Promise<GitHubEnvironment[]> {
  const { data } = await client.get<{ environments: GitHubEnvironment[] }>(
    `/repos/${owner}/${repo}/environments`,
  );
  return data?.environments ?? [];
}

export async function getEnvironment(
  client: GitHubClient,
  owner: string,
  repo: string,
  envName: string,
): Promise<GitHubEnvironment | null> {
  try {
    const { data } = await client.get<GitHubEnvironment>(
      `/repos/${owner}/${repo}/environments/${envName}`,
    );
    return data;
  } catch {
    return null;
  }
}

export async function createOrUpdateEnvironment(
  client: GitHubClient,
  owner: string,
  repo: string,
  env: Environment,
): Promise<GitHubEnvironment> {
  const body: Record<string, unknown> = {};

  if (env.wait_timer !== undefined) body.wait_timer = env.wait_timer;
  if (env.prevent_self_review !== undefined) body.prevent_self_review = env.prevent_self_review;

  if (env.reviewers) {
    body.reviewers = env.reviewers.map((r: EnvironmentReviewer) => ({
      type: r.type,
      id: r.id,
    }));
  }

  if (env.deployment_branch_policy) {
    body.deployment_branch_policy = env.deployment_branch_policy;
  }

  const { data } = await client.put<GitHubEnvironment>(
    `/repos/${owner}/${repo}/environments/${env.name}`,
    body,
  );
  return data;
}

export async function deleteEnvironment(
  client: GitHubClient,
  owner: string,
  repo: string,
  envName: string,
): Promise<void> {
  await client.delete(`/repos/${owner}/${repo}/environments/${envName}`);
}

export async function syncEnvironments(
  client: GitHubClient,
  owner: string,
  repo: string,
  desired: Environment[],
): Promise<{ created: string[]; updated: string[] }> {
  const result = { created: [] as string[], updated: [] as string[] };

  for (const env of desired) {
    const existing = await getEnvironment(client, owner, repo, env.name);
    await createOrUpdateEnvironment(client, owner, repo, env);

    if (existing) {
      result.updated.push(env.name);
    } else {
      result.created.push(env.name);
    }
  }

  return result;
}
