/**
 * Repository settings management via the GitHub API.
 */

import type { GitHubClient } from './client.ts';
import type { RepoSettings } from '../types.ts';

export interface GitHubRepoData {
  name: string;
  full_name: string;
  description: string | null;
  homepage: string | null;
  private: boolean;
  visibility: string;
  default_branch: string;
  has_issues: boolean;
  has_projects: boolean;
  has_wiki: boolean;
  has_discussions: boolean;
  is_template: boolean;
  allow_squash_merge: boolean;
  allow_merge_commit: boolean;
  allow_rebase_merge: boolean;
  allow_auto_merge: boolean;
  delete_branch_on_merge: boolean;
  allow_update_branch: boolean;
  web_commit_signoff_required: boolean;
  squash_merge_commit_title: string;
  squash_merge_commit_message: string;
  merge_commit_title: string;
  merge_commit_message: string;
}

export async function getRepoSettings(
  client: GitHubClient,
  owner: string,
  repo: string,
): Promise<GitHubRepoData> {
  const { data } = await client.get<GitHubRepoData>(`/repos/${owner}/${repo}`);
  return data;
}

export async function updateRepoSettings(
  client: GitHubClient,
  owner: string,
  repo: string,
  settings: RepoSettings,
): Promise<GitHubRepoData> {
  const { data } = await client.patch<GitHubRepoData>(
    `/repos/${owner}/${repo}`,
    settings,
  );
  return data;
}

export function diffRepoSettings(
  current: GitHubRepoData,
  desired: RepoSettings,
): Record<string, { current: unknown; desired: unknown }> {
  const diffs: Record<string, { current: unknown; desired: unknown }> = {};

  for (const [key, value] of Object.entries(desired)) {
    const currentValue = (current as unknown as Record<string, unknown>)[key];
    if (currentValue !== value) {
      diffs[key] = { current: currentValue, desired: value };
    }
  }

  return diffs;
}
