/**
 * Repository collaborator management via the GitHub API.
 */

import type { GitHubClient } from './client.ts';
import type { Collaborator } from '../types.ts';

export interface GitHubCollaborator {
  login: string;
  id: number;
  permissions: {
    pull: boolean;
    triage: boolean;
    push: boolean;
    maintain: boolean;
    admin: boolean;
  };
  role_name: string;
}

export async function listCollaborators(
  client: GitHubClient,
  owner: string,
  repo: string,
): Promise<GitHubCollaborator[]> {
  const { data } = await client.get<GitHubCollaborator[]>(
    `/repos/${owner}/${repo}/collaborators`,
  );
  return data ?? [];
}

export async function addCollaborator(
  client: GitHubClient,
  owner: string,
  repo: string,
  username: string,
  permission: string,
): Promise<void> {
  await client.put(`/repos/${owner}/${repo}/collaborators/${username}`, {
    permission,
  });
}

export async function removeCollaborator(
  client: GitHubClient,
  owner: string,
  repo: string,
  username: string,
): Promise<void> {
  await client.delete(`/repos/${owner}/${repo}/collaborators/${username}`);
}

function permissionToRole(permission: string): string {
  const map: Record<string, string> = {
    pull: 'read',
    triage: 'triage',
    push: 'write',
    maintain: 'maintain',
    admin: 'admin',
  };
  return map[permission] ?? permission;
}

export async function syncCollaborators(
  client: GitHubClient,
  owner: string,
  repo: string,
  desired: Collaborator[],
): Promise<{ added: string[]; updated: string[]; removed: string[] }> {
  const existing = await listCollaborators(client, owner, repo);
  const result = { added: [] as string[], updated: [] as string[], removed: [] as string[] };

  const desiredMap = new Map(desired.map((c) => [c.username, c]));
  const existingMap = new Map(existing.map((c) => [c.login, c]));

  for (const collab of desired) {
    const current = existingMap.get(collab.username);
    if (!current) {
      await addCollaborator(client, owner, repo, collab.username, collab.permission);
      result.added.push(collab.username);
    } else if (current.role_name !== permissionToRole(collab.permission)) {
      await addCollaborator(client, owner, repo, collab.username, collab.permission);
      result.updated.push(collab.username);
    }
  }

  for (const existing_c of existing) {
    if (!desiredMap.has(existing_c.login) && existing_c.login !== owner) {
      await removeCollaborator(client, owner, repo, existing_c.login);
      result.removed.push(existing_c.login);
    }
  }

  return result;
}
