/**
 * Repository rulesets management via the GitHub API.
 */

import type { GitHubClient } from './client.ts';
import type { Ruleset, RulesetRule, RulesetCondition } from '../types.ts';

export interface GitHubRuleset {
  id: number;
  name: string;
  target: string;
  source_type: string;
  source: string;
  enforcement: string;
  bypass_actors: unknown[];
  conditions?: RulesetCondition;
  rules: RulesetRule[];
}

export async function listRulesets(
  client: GitHubClient,
  owner: string,
  repo: string,
): Promise<GitHubRuleset[]> {
  const { data } = await client.get<GitHubRuleset[]>(
    `/repos/${owner}/${repo}/rulesets`,
  );
  return data ?? [];
}

export async function getRuleset(
  client: GitHubClient,
  owner: string,
  repo: string,
  rulesetId: number,
): Promise<GitHubRuleset> {
  const { data } = await client.get<GitHubRuleset>(
    `/repos/${owner}/${repo}/rulesets/${rulesetId}`,
  );
  return data;
}

export async function createRuleset(
  client: GitHubClient,
  owner: string,
  repo: string,
  ruleset: Ruleset,
): Promise<GitHubRuleset> {
  const { data } = await client.post<GitHubRuleset>(
    `/repos/${owner}/${repo}/rulesets`,
    ruleset,
  );
  return data;
}

export async function updateRuleset(
  client: GitHubClient,
  owner: string,
  repo: string,
  rulesetId: number,
  ruleset: Ruleset,
): Promise<GitHubRuleset> {
  const { data } = await client.put<GitHubRuleset>(
    `/repos/${owner}/${repo}/rulesets/${rulesetId}`,
    ruleset,
  );
  return data;
}

export async function deleteRuleset(
  client: GitHubClient,
  owner: string,
  repo: string,
  rulesetId: number,
): Promise<void> {
  await client.delete(`/repos/${owner}/${repo}/rulesets/${rulesetId}`);
}

export function findRulesetByName(
  existing: GitHubRuleset[],
  name: string,
): GitHubRuleset | undefined {
  return existing.find((r) => r.name === name);
}

export async function syncRulesets(
  client: GitHubClient,
  owner: string,
  repo: string,
  desired: Ruleset[],
): Promise<{ created: string[]; updated: string[]; deleted: string[] }> {
  const existing = await listRulesets(client, owner, repo);
  const result = { created: [] as string[], updated: [] as string[], deleted: [] as string[] };

  const desiredNames = new Set(desired.map((r) => r.name));

  for (const ruleset of desired) {
    const match = findRulesetByName(existing, ruleset.name);
    if (match) {
      await updateRuleset(client, owner, repo, match.id, ruleset);
      result.updated.push(ruleset.name);
    } else {
      await createRuleset(client, owner, repo, ruleset);
      result.created.push(ruleset.name);
    }
  }

  for (const existing_rs of existing) {
    if (!desiredNames.has(existing_rs.name)) {
      await deleteRuleset(client, owner, repo, existing_rs.id);
      result.deleted.push(existing_rs.name);
    }
  }

  return result;
}
