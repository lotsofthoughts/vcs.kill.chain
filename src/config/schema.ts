/**
 * Configuration schema validation for vcs-agent YAML configs.
 */

import type {
  AzureKeyVaultConfig,
  Collaborator,
  Environment,
  RepoConfig,
  RepoSettings,
  Ruleset,
  RulesetRule,
  SecuritySettings,
  VcsAgentConfig,
} from '../types.ts';

export class ConfigValidationError extends Error {
  constructor(
    public path: string,
    message: string,
  ) {
    super(`Config error at '${path}': ${message}`);
    this.name = 'ConfigValidationError';
  }
}

function assertString(val: unknown, path: string): asserts val is string {
  if (typeof val !== 'string') {
    throw new ConfigValidationError(path, `expected string, got ${typeof val}`);
  }
}

function assertOptionalString(val: unknown, path: string): void {
  if (val !== undefined && typeof val !== 'string') {
    throw new ConfigValidationError(path, `expected string, got ${typeof val}`);
  }
}

function assertOptionalBool(val: unknown, path: string): void {
  if (val !== undefined && typeof val !== 'boolean') {
    throw new ConfigValidationError(path, `expected boolean, got ${typeof val}`);
  }
}

function assertOptionalNumber(val: unknown, path: string): void {
  if (val !== undefined && typeof val !== 'number') {
    throw new ConfigValidationError(path, `expected number, got ${typeof val}`);
  }
}

function assertArray(val: unknown, path: string): asserts val is unknown[] {
  if (!Array.isArray(val)) {
    throw new ConfigValidationError(path, `expected array, got ${typeof val}`);
  }
}

function assertObject(val: unknown, path: string): asserts val is Record<string, unknown> {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) {
    throw new ConfigValidationError(path, `expected object, got ${typeof val}`);
  }
}

function assertEnum(val: unknown, allowed: string[], path: string): void {
  if (!allowed.includes(val as string)) {
    throw new ConfigValidationError(path, `must be one of [${allowed.join(', ')}], got '${val}'`);
  }
}

export function validateRepoSettings(settings: unknown, path: string): RepoSettings {
  assertObject(settings, path);
  const s = settings as Record<string, unknown>;

  assertOptionalString(s.description, `${path}.description`);
  assertOptionalString(s.homepage, `${path}.homepage`);
  assertOptionalBool(s.private, `${path}.private`);
  if (s.visibility !== undefined) {
    assertEnum(s.visibility, ['public', 'private', 'internal'], `${path}.visibility`);
  }
  assertOptionalBool(s.has_issues, `${path}.has_issues`);
  assertOptionalBool(s.has_projects, `${path}.has_projects`);
  assertOptionalBool(s.has_wiki, `${path}.has_wiki`);
  assertOptionalBool(s.has_discussions, `${path}.has_discussions`);
  assertOptionalBool(s.is_template, `${path}.is_template`);
  assertOptionalString(s.default_branch, `${path}.default_branch`);
  assertOptionalBool(s.allow_squash_merge, `${path}.allow_squash_merge`);
  assertOptionalBool(s.allow_merge_commit, `${path}.allow_merge_commit`);
  assertOptionalBool(s.allow_rebase_merge, `${path}.allow_rebase_merge`);
  assertOptionalBool(s.allow_auto_merge, `${path}.allow_auto_merge`);
  assertOptionalBool(s.delete_branch_on_merge, `${path}.delete_branch_on_merge`);
  assertOptionalBool(s.allow_update_branch, `${path}.allow_update_branch`);
  assertOptionalBool(s.web_commit_signoff_required, `${path}.web_commit_signoff_required`);

  return s as unknown as RepoSettings;
}

export function validateRulesetRule(rule: unknown, path: string): RulesetRule {
  assertObject(rule, path);
  const r = rule as Record<string, unknown>;
  assertString(r.type, `${path}.type`);

  const validTypes = [
    'creation',
    'update',
    'deletion',
    'required_linear_history',
    'required_signatures',
    'pull_request',
    'required_status_checks',
    'non_fast_forward',
    'required_deployments',
    'merge_queue',
  ];
  assertEnum(r.type, validTypes, `${path}.type`);

  return r as unknown as RulesetRule;
}

export function validateRuleset(ruleset: unknown, path: string): Ruleset {
  assertObject(ruleset, path);
  const r = ruleset as Record<string, unknown>;

  assertString(r.name, `${path}.name`);
  assertEnum(r.target, ['branch', 'tag'], `${path}.target`);
  assertEnum(r.enforcement, ['disabled', 'active', 'evaluate'], `${path}.enforcement`);

  if (r.rules !== undefined) {
    assertArray(r.rules, `${path}.rules`);
    (r.rules as unknown[]).forEach((rule, i) => validateRulesetRule(rule, `${path}.rules[${i}]`));
  }

  return r as unknown as Ruleset;
}

export function validateCollaborator(collab: unknown, path: string): Collaborator {
  assertObject(collab, path);
  const c = collab as Record<string, unknown>;

  assertString(c.username, `${path}.username`);
  assertEnum(c.permission, ['pull', 'triage', 'push', 'maintain', 'admin'], `${path}.permission`);

  return c as unknown as Collaborator;
}

export function validateSecuritySettings(security: unknown, path: string): SecuritySettings {
  assertObject(security, path);
  const s = security as Record<string, unknown>;

  assertOptionalBool(s.vulnerability_alerts, `${path}.vulnerability_alerts`);
  assertOptionalBool(s.automated_security_fixes, `${path}.automated_security_fixes`);
  assertOptionalBool(s.secret_scanning, `${path}.secret_scanning`);
  assertOptionalBool(s.secret_scanning_push_protection, `${path}.secret_scanning_push_protection`);

  if (s.code_scanning !== undefined) {
    assertObject(s.code_scanning, `${path}.code_scanning`);
    const cs = s.code_scanning as Record<string, unknown>;
    assertEnum(cs.state, ['configured', 'not-configured'], `${path}.code_scanning.state`);
  }

  return s as unknown as SecuritySettings;
}

export function validateEnvironment(env: unknown, path: string): Environment {
  assertObject(env, path);
  const e = env as Record<string, unknown>;

  assertString(e.name, `${path}.name`);
  assertOptionalNumber(e.wait_timer, `${path}.wait_timer`);
  assertOptionalBool(e.prevent_self_review, `${path}.prevent_self_review`);

  if (e.variables !== undefined) {
    assertObject(e.variables, `${path}.variables`);
  }
  if (e.secrets !== undefined) {
    assertObject(e.secrets, `${path}.secrets`);
  }

  return e as unknown as Environment;
}

export function validateAzureKeyVault(akv: unknown, path: string): AzureKeyVaultConfig {
  assertObject(akv, path);
  const a = akv as Record<string, unknown>;

  if (a.enabled !== undefined) assertOptionalBool(a.enabled, `${path}.enabled`);
  assertString(a.vault_name, `${path}.vault_name`);
  assertString(a.tenant_id, `${path}.tenant_id`);
  assertString(a.subscription_id, `${path}.subscription_id`);
  assertString(a.resource_group, `${path}.resource_group`);

  return a as unknown as AzureKeyVaultConfig;
}

export function validateRepoConfig(repo: unknown, path: string): RepoConfig {
  assertObject(repo, path);
  const r = repo as Record<string, unknown>;

  assertString(r.name, `${path}.name`);
  if (!r.name || !(r.name as string).includes('/')) {
    throw new ConfigValidationError(`${path}.name`, 'must be in owner/repo format');
  }

  if (r.settings !== undefined) validateRepoSettings(r.settings, `${path}.settings`);
  if (r.rulesets !== undefined) {
    assertArray(r.rulesets, `${path}.rulesets`);
    (r.rulesets as unknown[]).forEach((rs, i) => validateRuleset(rs, `${path}.rulesets[${i}]`));
  }
  if (r.collaborators !== undefined) {
    assertArray(r.collaborators, `${path}.collaborators`);
    (r.collaborators as unknown[]).forEach((c, i) =>
      validateCollaborator(c, `${path}.collaborators[${i}]`)
    );
  }
  if (r.security !== undefined) validateSecuritySettings(r.security, `${path}.security`);
  if (r.environments !== undefined) {
    assertArray(r.environments, `${path}.environments`);
    (r.environments as unknown[]).forEach((e, i) =>
      validateEnvironment(e, `${path}.environments[${i}]`)
    );
  }
  if (r.variables !== undefined) assertObject(r.variables, `${path}.variables`);
  if (r.secrets !== undefined) assertObject(r.secrets, `${path}.secrets`);
  if (r.azure_keyvault !== undefined) {
    validateAzureKeyVault(r.azure_keyvault, `${path}.azure_keyvault`);
  }

  return r as unknown as RepoConfig;
}

export function validateConfig(config: unknown): VcsAgentConfig {
  assertObject(config, 'root');
  const c = config as Record<string, unknown>;

  assertString(c.version, 'version');

  if (c.repositories === undefined) {
    throw new ConfigValidationError('repositories', 'required field missing');
  }
  assertArray(c.repositories, 'repositories');

  if ((c.repositories as unknown[]).length === 0) {
    throw new ConfigValidationError('repositories', 'must contain at least one repository');
  }

  (c.repositories as unknown[]).forEach((repo, i) =>
    validateRepoConfig(repo, `repositories[${i}]`)
  );

  return c as unknown as VcsAgentConfig;
}
