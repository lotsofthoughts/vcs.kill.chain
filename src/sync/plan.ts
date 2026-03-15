/**
 * Dry-run plan generator: computes the diff between current state and desired config.
 */

import type { RepoConfig, SyncPlan, PlanAction } from '../types.ts';
import { GitHubClient } from '../github/client.ts';
import { getRepoSettings, diffRepoSettings } from '../github/repos.ts';
import { listRulesets, findRulesetByName } from '../github/rulesets.ts';
import { listCollaborators } from '../github/collaborators.ts';
import { listEnvironments } from '../github/environments.ts';
import { listRepoVariables } from '../github/variables.ts';
import { listRepoSecrets } from '../github/secrets.ts';

export async function generatePlan(
  client: GitHubClient,
  repoConfig: RepoConfig,
): Promise<SyncPlan> {
  const [owner, repo] = repoConfig.name.split('/');
  const actions: PlanAction[] = [];

  // Settings diff
  if (repoConfig.settings) {
    const current = await getRepoSettings(client, owner, repo);
    const diffs = diffRepoSettings(current, repoConfig.settings);
    for (const [key, diff] of Object.entries(diffs)) {
      actions.push({
        resource: 'settings',
        path: `${repoConfig.name}/settings/${key}`,
        action: 'update',
        current: diff.current,
        desired: diff.desired,
      });
    }
  }

  // Rulesets diff
  if (repoConfig.rulesets) {
    const existing = await listRulesets(client, owner, repo);
    const desiredNames = new Set(repoConfig.rulesets.map((r) => r.name));

    for (const ruleset of repoConfig.rulesets) {
      const match = findRulesetByName(existing, ruleset.name);
      actions.push({
        resource: 'ruleset',
        path: `${repoConfig.name}/rulesets/${ruleset.name}`,
        action: match ? 'update' : 'create',
        desired: ruleset,
        current: match ?? undefined,
      });
    }

    for (const ex of existing) {
      if (!desiredNames.has(ex.name)) {
        actions.push({
          resource: 'ruleset',
          path: `${repoConfig.name}/rulesets/${ex.name}`,
          action: 'delete',
          current: ex,
        });
      }
    }
  }

  // Collaborators diff
  if (repoConfig.collaborators) {
    const existing = await listCollaborators(client, owner, repo);
    const existingMap = new Map(existing.map((c) => [c.login, c]));
    const desiredMap = new Map(repoConfig.collaborators.map((c) => [c.username, c]));

    for (const collab of repoConfig.collaborators) {
      const current = existingMap.get(collab.username);
      actions.push({
        resource: 'collaborator',
        path: `${repoConfig.name}/collaborators/${collab.username}`,
        action: current ? 'update' : 'create',
        current: current?.role_name,
        desired: collab.permission,
      });
    }

    for (const ex of existing) {
      if (!desiredMap.has(ex.login) && ex.login !== owner) {
        actions.push({
          resource: 'collaborator',
          path: `${repoConfig.name}/collaborators/${ex.login}`,
          action: 'delete',
          current: ex.role_name,
        });
      }
    }
  }

  // Environments diff
  if (repoConfig.environments) {
    const existing = await listEnvironments(client, owner, repo);
    const existingNames = new Set(existing.map((e) => e.name));

    for (const env of repoConfig.environments) {
      actions.push({
        resource: 'environment',
        path: `${repoConfig.name}/environments/${env.name}`,
        action: existingNames.has(env.name) ? 'update' : 'create',
        desired: env,
      });
    }
  }

  // Variables diff
  if (repoConfig.variables) {
    const existing = await listRepoVariables(client, owner, repo);
    const existingMap = new Map(existing.map((v) => [v.name, v.value]));

    for (const [name, value] of Object.entries(repoConfig.variables)) {
      const currentValue = existingMap.get(name);
      if (currentValue === value) {
        actions.push({
          resource: 'variable',
          path: `${repoConfig.name}/variables/${name}`,
          action: 'skip',
          reason: 'Value unchanged',
        });
      } else {
        actions.push({
          resource: 'variable',
          path: `${repoConfig.name}/variables/${name}`,
          action: currentValue !== undefined ? 'update' : 'create',
          current: currentValue,
          desired: value,
        });
      }
    }
  }

  // Secrets diff (can only detect existence, not value)
  if (repoConfig.secrets) {
    const existing = await listRepoSecrets(client, owner, repo);
    const existingNames = new Set(existing.map((s) => s.name));

    for (const name of Object.keys(repoConfig.secrets)) {
      actions.push({
        resource: 'secret',
        path: `${repoConfig.name}/secrets/${name}`,
        action: existingNames.has(name) ? 'update' : 'create',
        reason: existingNames.has(name) ? 'Secret exists, will overwrite' : 'New secret',
      });
    }
  }

  return {
    repository: repoConfig.name,
    actions,
    timestamp: new Date().toISOString(),
  };
}

export function formatPlan(plan: SyncPlan): string {
  const lines: string[] = [];
  lines.push(`\n📋 Sync Plan for ${plan.repository}`);
  lines.push(`   Generated: ${plan.timestamp}`);
  lines.push('');

  if (plan.actions.length === 0) {
    lines.push('   ✅ No changes needed - everything is in sync');
    return lines.join('\n');
  }

  const byAction = {
    create: plan.actions.filter((a) => a.action === 'create'),
    update: plan.actions.filter((a) => a.action === 'update'),
    delete: plan.actions.filter((a) => a.action === 'delete'),
    skip: plan.actions.filter((a) => a.action === 'skip'),
  };

  if (byAction.create.length > 0) {
    lines.push(`   ➕ Create (${byAction.create.length}):`);
    for (const a of byAction.create) {
      lines.push(`      + ${a.path}`);
    }
  }

  if (byAction.update.length > 0) {
    lines.push(`   🔄 Update (${byAction.update.length}):`);
    for (const a of byAction.update) {
      lines.push(`      ~ ${a.path}`);
      if (a.current !== undefined && a.desired !== undefined) {
        lines.push(`        ${JSON.stringify(a.current)} -> ${JSON.stringify(a.desired)}`);
      }
    }
  }

  if (byAction.delete.length > 0) {
    lines.push(`   🗑️  Delete (${byAction.delete.length}):`);
    for (const a of byAction.delete) {
      lines.push(`      - ${a.path}`);
    }
  }

  if (byAction.skip.length > 0) {
    lines.push(`   ⏭️  Skip (${byAction.skip.length}):`);
    for (const a of byAction.skip) {
      lines.push(`      = ${a.path} (${a.reason})`);
    }
  }

  lines.push('');
  lines.push(
    `   Summary: ${byAction.create.length} create, ${byAction.update.length} update, ${byAction.delete.length} delete, ${byAction.skip.length} skip`,
  );

  return lines.join('\n');
}
