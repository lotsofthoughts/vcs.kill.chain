/**
 * CLI entry point using Cliffy. Defines all commands, options, and shell completions.
 */

import { Command } from '@cliffy/command';
import { CompletionsCommand } from '@cliffy/command/completions';
import { generatedVersion } from '../version.ts';
import { loadConfigFromFile } from '../config/mod.ts';
import { GitHubClient } from '../github/client.ts';
import { syncRepository } from '../sync/engine.ts';
import { generatePlan, formatPlan } from '../sync/plan.ts';

function resolveToken(tokenFlag?: string): string {
  if (tokenFlag) return tokenFlag;
  const envToken = Deno.env.get('GITHUB_TOKEN') ?? Deno.env.get('GH_TOKEN');
  if (!envToken) {
    console.error('Error: GitHub token required. Set GITHUB_TOKEN env var or use --token flag.');
    Deno.exit(1);
  }
  return envToken;
}

async function handleSync(options: {
  config: string;
  token?: string;
  conjurApiKey?: string;
  dryRun?: boolean;
  verbose?: boolean;
  parallel?: boolean;
}): Promise<void> {
  const token = resolveToken(options.token);
  const config = await loadConfigFromFile(options.config);
  const client = new GitHubClient({ token });

  const conjurApiKey = options.conjurApiKey ??
    Deno.env.get(config.settings?.conjur_api_key_env ?? 'CONJUR_API_KEY');

  console.log(`\nvcs-agent sync v${generatedVersion}`);
  console.log(`Config: ${options.config}`);
  console.log(`Repositories: ${config.repositories.length}`);
  console.log(`Dry run: ${options.dryRun ?? false}\n`);

  const syncFn = async (repoConfig: typeof config.repositories[number]) => {
    if (options.dryRun) {
      const plan = await generatePlan(client, repoConfig);
      console.log(formatPlan(plan));
    } else {
      const result = await syncRepository(client, repoConfig, {
        dryRun: false,
        verbose: options.verbose,
        conjurApiKey,
      });

      const icon = result.success ? '✅' : '❌';
      console.log(
        `${icon} ${result.repository}: ${result.actions_taken} actions, ${result.actions_failed} failed (${result.duration_ms}ms)`,
      );
      if (result.errors.length > 0) {
        for (const err of result.errors) {
          console.error(`   ⚠️  ${err}`);
        }
      }
    }
  };

  if (options.parallel) {
    await Promise.allSettled(config.repositories.map(syncFn));
  } else {
    for (const repoConfig of config.repositories) {
      await syncFn(repoConfig);
    }
  }
}

async function handlePlan(options: {
  config: string;
  token?: string;
  output?: string;
}): Promise<void> {
  const token = resolveToken(options.token);
  const config = await loadConfigFromFile(options.config);
  const client = new GitHubClient({ token });

  for (const repoConfig of config.repositories) {
    const plan = await generatePlan(client, repoConfig);
    if (options.output === 'json') {
      console.log(JSON.stringify(plan, null, 2));
    } else {
      console.log(formatPlan(plan));
    }
  }
}

async function handleValidate(options: { config: string }): Promise<void> {
  try {
    const config = await loadConfigFromFile(options.config);
    console.log(`✅ Config is valid`);
    console.log(`   Version: ${config.version}`);
    console.log(`   Repositories: ${config.repositories.length}`);
    for (const repo of config.repositories) {
      const features = [];
      if (repo.settings) features.push('settings');
      if (repo.rulesets) features.push(`${repo.rulesets.length} rulesets`);
      if (repo.collaborators) features.push(`${repo.collaborators.length} collaborators`);
      if (repo.security) features.push('security');
      if (repo.environments) features.push(`${repo.environments.length} environments`);
      if (repo.variables) features.push(`${Object.keys(repo.variables).length} variables`);
      if (repo.secrets) features.push(`${Object.keys(repo.secrets).length} secrets`);
      if (repo.azure_keyvault) features.push('azure keyvault');
      console.log(`   - ${repo.name}: ${features.join(', ')}`);
    }
  } catch (e) {
    console.error(`❌ Config validation failed: ${(e as Error).message}`);
    Deno.exit(1);
  }
}

export function createCli() {
  const cli = new Command()
    .name('vcs-agent')
    .version(generatedVersion)
    .description(
      'GitHub repository configuration management CLI.\n' +
        'Manages settings, rulesets, collaborators, security, environments, variables, and secrets.',
    );

  cli.command('sync', 'Sync repository configurations from a YAML file')
    .option('-c, --config <path:string>', 'Path to vcs-agent YAML config', { required: true })
    .option('-t, --token <token:string>', 'GitHub personal access token')
    .option('--conjur-api-key <key:string>', 'Conjur API key (overrides env var)')
    .option('--dry-run', 'Show what would change without applying')
    .option('-v, --verbose', 'Enable verbose output')
    .option('--parallel', 'Sync repositories in parallel')
    .action(handleSync);

  cli.command('plan', 'Generate a sync plan without applying changes')
    .option('-c, --config <path:string>', 'Path to vcs-agent YAML config', { required: true })
    .option('-t, --token <token:string>', 'GitHub personal access token')
    .option('-o, --output <format:string>', 'Output format: text or json')
    .action(handlePlan);

  cli.command('validate', 'Validate a vcs-agent YAML config file')
    .option('-c, --config <path:string>', 'Path to vcs-agent YAML config', { required: true })
    .action(handleValidate);

  cli.command('completions', new CompletionsCommand());

  return cli;
}
