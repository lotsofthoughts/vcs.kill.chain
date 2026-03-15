/**
 * Sync engine: orchestrates applying a VcsAgentConfig to target repositories.
 */

import type { RepoConfig, SyncResult } from '../types.ts';
import { GitHubClient } from '../github/client.ts';
import { updateRepoSettings, getRepoSettings, diffRepoSettings } from '../github/repos.ts';
import { syncRulesets } from '../github/rulesets.ts';
import { syncCollaborators } from '../github/collaborators.ts';
import { syncSecuritySettings } from '../github/security.ts';
import { syncEnvironments } from '../github/environments.ts';
import { syncRepoVariables, syncEnvVariables } from '../github/variables.ts';
import { syncRepoSecrets, syncEnvSecrets } from '../github/secrets.ts';
import { resolveAllSecrets } from '../config/mod.ts';

export interface SyncOptions {
  dryRun?: boolean;
  verbose?: boolean;
  conjurApiKey?: string;
}

function log(verbose: boolean, ...args: unknown[]): void {
  if (verbose) console.log('[sync]', ...args);
}

export async function syncRepository(
  client: GitHubClient,
  repoConfig: RepoConfig,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const start = Date.now();
  const [owner, repo] = repoConfig.name.split('/');
  const errors: string[] = [];
  let actionsTaken = 0;
  let actionsFailed = 0;
  const { dryRun = false, verbose = false } = options;

  const runtimeSecrets: Record<string, string> = {};
  if (options.conjurApiKey) {
    runtimeSecrets['CONJUR_API_KEY'] = options.conjurApiKey;
  }

  log(verbose, `Syncing repository: ${repoConfig.name}`);

  // 1. Repository settings
  if (repoConfig.settings) {
    try {
      if (dryRun) {
        const current = await getRepoSettings(client, owner, repo);
        const diffs = diffRepoSettings(current, repoConfig.settings);
        const diffCount = Object.keys(diffs).length;
        log(verbose, `  Settings: ${diffCount} change(s) would be applied`);
        if (verbose) {
          for (const [key, diff] of Object.entries(diffs)) {
            log(verbose, `    ${key}: ${JSON.stringify(diff.current)} -> ${JSON.stringify(diff.desired)}`);
          }
        }
      } else {
        await updateRepoSettings(client, owner, repo, repoConfig.settings);
        log(verbose, '  Settings: updated');
      }
      actionsTaken++;
    } catch (e) {
      const msg = `Settings sync failed: ${(e as Error).message}`;
      errors.push(msg);
      actionsFailed++;
      log(verbose, `  ${msg}`);
    }
  }

  // 2. Rulesets
  if (repoConfig.rulesets) {
    try {
      if (dryRun) {
        log(verbose, `  Rulesets: ${repoConfig.rulesets.length} ruleset(s) would be synced`);
      } else {
        const result = await syncRulesets(client, owner, repo, repoConfig.rulesets);
        log(
          verbose,
          `  Rulesets: ${result.created.length} created, ${result.updated.length} updated, ${result.deleted.length} deleted`,
        );
      }
      actionsTaken++;
    } catch (e) {
      const msg = `Rulesets sync failed: ${(e as Error).message}`;
      errors.push(msg);
      actionsFailed++;
      log(verbose, `  ${msg}`);
    }
  }

  // 3. Collaborators
  if (repoConfig.collaborators) {
    try {
      if (dryRun) {
        log(verbose, `  Collaborators: ${repoConfig.collaborators.length} collaborator(s) would be synced`);
      } else {
        const result = await syncCollaborators(client, owner, repo, repoConfig.collaborators);
        log(
          verbose,
          `  Collaborators: ${result.added.length} added, ${result.updated.length} updated, ${result.removed.length} removed`,
        );
      }
      actionsTaken++;
    } catch (e) {
      const msg = `Collaborators sync failed: ${(e as Error).message}`;
      errors.push(msg);
      actionsFailed++;
      log(verbose, `  ${msg}`);
    }
  }

  // 4. Security settings
  if (repoConfig.security) {
    try {
      if (dryRun) {
        log(verbose, '  Security: settings would be applied');
      } else {
        const changes = await syncSecuritySettings(client, owner, repo, repoConfig.security);
        log(verbose, `  Security: ${changes.length} change(s) applied`);
      }
      actionsTaken++;
    } catch (e) {
      const msg = `Security sync failed: ${(e as Error).message}`;
      errors.push(msg);
      actionsFailed++;
      log(verbose, `  ${msg}`);
    }
  }

  // 5. Environments (with their variables and secrets)
  if (repoConfig.environments) {
    try {
      if (dryRun) {
        log(verbose, `  Environments: ${repoConfig.environments.length} environment(s) would be synced`);
      } else {
        const envResult = await syncEnvironments(client, owner, repo, repoConfig.environments);
        log(
          verbose,
          `  Environments: ${envResult.created.length} created, ${envResult.updated.length} updated`,
        );

        for (const env of repoConfig.environments) {
          if (env.variables) {
            const varResult = await syncEnvVariables(client, owner, repo, env.name, env.variables);
            log(
              verbose,
              `    ${env.name} vars: ${varResult.created.length} created, ${varResult.updated.length} updated`,
            );
          }
          if (env.secrets) {
            const resolved = resolveAllSecrets(env.secrets, runtimeSecrets);
            const secResult = await syncEnvSecrets(client, owner, repo, env.name, resolved);
            log(
              verbose,
              `    ${env.name} secrets: ${secResult.created.length} created, ${secResult.updated.length} updated`,
            );
          }
        }
      }
      actionsTaken++;
    } catch (e) {
      const msg = `Environments sync failed: ${(e as Error).message}`;
      errors.push(msg);
      actionsFailed++;
      log(verbose, `  ${msg}`);
    }
  }

  // 6. Repository-level variables
  if (repoConfig.variables) {
    try {
      if (dryRun) {
        log(verbose, `  Variables: ${Object.keys(repoConfig.variables).length} variable(s) would be synced`);
      } else {
        const result = await syncRepoVariables(client, owner, repo, repoConfig.variables);
        log(verbose, `  Variables: ${result.created.length} created, ${result.updated.length} updated`);
      }
      actionsTaken++;
    } catch (e) {
      const msg = `Variables sync failed: ${(e as Error).message}`;
      errors.push(msg);
      actionsFailed++;
      log(verbose, `  ${msg}`);
    }
  }

  // 7. Repository-level secrets
  if (repoConfig.secrets) {
    try {
      const resolved = resolveAllSecrets(repoConfig.secrets, runtimeSecrets);
      if (dryRun) {
        log(verbose, `  Secrets: ${Object.keys(resolved).length} secret(s) would be synced`);
      } else {
        const result = await syncRepoSecrets(client, owner, repo, resolved);
        log(verbose, `  Secrets: ${result.created.length} created, ${result.updated.length} updated`);
      }
      actionsTaken++;
    } catch (e) {
      const msg = `Secrets sync failed: ${(e as Error).message}`;
      errors.push(msg);
      actionsFailed++;
      log(verbose, `  ${msg}`);
    }
  }

  return {
    repository: repoConfig.name,
    success: actionsFailed === 0,
    actions_taken: actionsTaken,
    actions_failed: actionsFailed,
    errors,
    duration_ms: Date.now() - start,
  };
}
