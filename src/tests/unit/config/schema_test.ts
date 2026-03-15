import { assertEquals, assertThrows } from '@std/assert';
import {
  validateConfig,
  validateRepoSettings,
  validateRuleset,
  validateCollaborator,
  validateSecuritySettings,
  validateEnvironment,
  validateAzureKeyVault,
  ConfigValidationError,
} from '../../../config/schema.ts';

Deno.test('schema - validateRepoSettings accepts valid settings', () => {
  const settings = {
    description: 'test',
    private: true,
    has_issues: true,
    allow_squash_merge: true,
    delete_branch_on_merge: true,
    visibility: 'private',
  };
  const result = validateRepoSettings(settings, 'test');
  assertEquals(result.description, 'test');
  assertEquals(result.private, true);
});

Deno.test('schema - validateRepoSettings rejects invalid visibility', () => {
  assertThrows(
    () => validateRepoSettings({ visibility: 'secret' }, 'test'),
    ConfigValidationError,
    'visibility',
  );
});

Deno.test('schema - validateRuleset accepts valid ruleset', () => {
  const ruleset = {
    name: 'test-ruleset',
    target: 'branch',
    enforcement: 'active',
    rules: [{ type: 'pull_request' }],
  };
  const result = validateRuleset(ruleset, 'test');
  assertEquals(result.name, 'test-ruleset');
});

Deno.test('schema - validateRuleset rejects invalid target', () => {
  assertThrows(
    () =>
      validateRuleset(
        { name: 'test', target: 'invalid', enforcement: 'active', rules: [] },
        'test',
      ),
    ConfigValidationError,
    'target',
  );
});

Deno.test('schema - validateCollaborator accepts valid collaborator', () => {
  const result = validateCollaborator({ username: 'dev', permission: 'push' }, 'test');
  assertEquals(result.username, 'dev');
  assertEquals(result.permission, 'push');
});

Deno.test('schema - validateCollaborator rejects missing username', () => {
  assertThrows(
    () => validateCollaborator({ permission: 'push' }, 'test'),
    ConfigValidationError,
    'username',
  );
});

Deno.test('schema - validateSecuritySettings accepts all options', () => {
  const settings = {
    vulnerability_alerts: true,
    automated_security_fixes: true,
    secret_scanning: true,
    secret_scanning_push_protection: true,
    code_scanning: {
      state: 'configured',
      query_suite: 'extended',
      languages: ['typescript'],
    },
  };
  const result = validateSecuritySettings(settings, 'test');
  assertEquals(result.vulnerability_alerts, true);
});

Deno.test('schema - validateSecuritySettings rejects invalid code_scanning state', () => {
  assertThrows(
    () =>
      validateSecuritySettings(
        { code_scanning: { state: 'invalid' } },
        'test',
      ),
    ConfigValidationError,
    'state',
  );
});

Deno.test('schema - validateEnvironment accepts valid environment', () => {
  const env = {
    name: 'production',
    wait_timer: 30,
    prevent_self_review: true,
    variables: { KEY: 'value' },
    secrets: { SECRET: '$REF' },
  };
  const result = validateEnvironment(env, 'test');
  assertEquals(result.name, 'production');
  assertEquals(result.wait_timer, 30);
});

Deno.test('schema - validateEnvironment rejects missing name', () => {
  assertThrows(
    () => validateEnvironment({ wait_timer: 0 }, 'test'),
    ConfigValidationError,
    'name',
  );
});

Deno.test('schema - validateEnvironment rejects non-number wait_timer', () => {
  assertThrows(
    () => validateEnvironment({ name: 'test', wait_timer: 'five' }, 'test'),
    ConfigValidationError,
    'wait_timer',
  );
});

Deno.test('schema - validateAzureKeyVault accepts valid config', () => {
  const config = {
    enabled: true,
    vault_name: 'my-vault',
    tenant_id: 'tid',
    subscription_id: 'sid',
    resource_group: 'rg',
  };
  const result = validateAzureKeyVault(config, 'test');
  assertEquals(result.vault_name, 'my-vault');
});

Deno.test('schema - validateAzureKeyVault rejects missing vault_name', () => {
  assertThrows(
    () =>
      validateAzureKeyVault(
        { tenant_id: 't', subscription_id: 's', resource_group: 'r' },
        'test',
      ),
    ConfigValidationError,
    'vault_name',
  );
});

Deno.test('schema - validateConfig validates full config', () => {
  const config = {
    version: '1.0',
    repositories: [
      {
        name: 'owner/repo',
        settings: { description: 'test', private: true },
        rulesets: [
          {
            name: 'main',
            target: 'branch',
            enforcement: 'active',
            rules: [{ type: 'pull_request' }],
          },
        ],
        collaborators: [{ username: 'dev', permission: 'push' }],
        security: { vulnerability_alerts: true },
        environments: [{ name: 'prod', wait_timer: 30 }],
        variables: { KEY: 'value' },
        secrets: { SECRET: '$REF' },
      },
    ],
  };
  const result = validateConfig(config);
  assertEquals(result.repositories.length, 1);
});
