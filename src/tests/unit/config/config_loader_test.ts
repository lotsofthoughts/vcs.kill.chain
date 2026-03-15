import { assertEquals, assertRejects, assertThrows } from '@std/assert';
import { parseConfig, resolveSecretValue, resolveAllSecrets } from '../../../config/mod.ts';
import { ConfigValidationError } from '../../../config/schema.ts';

const VALID_MINIMAL = `
version: "1.0"
repositories:
  - name: "owner/repo"
    settings:
      description: "Test repo"
`;

const VALID_FULL = `
version: "1.0"
settings:
  conjur_api_key_env: CONJUR_API_KEY
repositories:
  - name: "acme/webapp"
    settings:
      description: "Test"
      private: true
      has_issues: true
      allow_squash_merge: true
    rulesets:
      - name: main-protection
        target: branch
        enforcement: active
        rules:
          - type: pull_request
            parameters:
              required_approving_review_count: 2
    collaborators:
      - username: dev-lead
        permission: admin
    security:
      vulnerability_alerts: true
      code_scanning:
        state: configured
    environments:
      - name: staging
        variables:
          ENV: staging
        secrets:
          API_KEY: "$MY_KEY"
    variables:
      TEAM: platform
    secrets:
      CONJUR_API_KEY: "$CONJUR_API_KEY"
`;

Deno.test('config - parses minimal valid YAML', () => {
  const config = parseConfig(VALID_MINIMAL);
  assertEquals(config.version, '1.0');
  assertEquals(config.repositories.length, 1);
  assertEquals(config.repositories[0].name, 'owner/repo');
  assertEquals(config.repositories[0].settings?.description, 'Test repo');
});

Deno.test('config - parses full valid YAML with all features', () => {
  const config = parseConfig(VALID_FULL);
  assertEquals(config.version, '1.0');
  assertEquals(config.repositories.length, 1);

  const repo = config.repositories[0];
  assertEquals(repo.name, 'acme/webapp');
  assertEquals(repo.settings?.private, true);
  assertEquals(repo.rulesets?.length, 1);
  assertEquals(repo.rulesets![0].name, 'main-protection');
  assertEquals(repo.collaborators?.length, 1);
  assertEquals(repo.collaborators![0].username, 'dev-lead');
  assertEquals(repo.security?.vulnerability_alerts, true);
  assertEquals(repo.environments?.length, 1);
  assertEquals(repo.environments![0].name, 'staging');
  assertEquals(repo.variables?.TEAM, 'platform');
  assertEquals(repo.secrets?.CONJUR_API_KEY, '$CONJUR_API_KEY');
});

Deno.test('config - rejects missing version field', () => {
  assertThrows(
    () => parseConfig('repositories:\n  - name: "o/r"'),
    ConfigValidationError,
    'version',
  );
});

Deno.test('config - rejects missing repositories field', () => {
  assertThrows(
    () => parseConfig('version: "1.0"'),
    ConfigValidationError,
    'repositories',
  );
});

Deno.test('config - rejects empty repositories array', () => {
  assertThrows(
    () => parseConfig('version: "1.0"\nrepositories: []'),
    ConfigValidationError,
    'at least one repository',
  );
});

Deno.test('config - rejects repo name without slash', () => {
  assertThrows(
    () => parseConfig('version: "1.0"\nrepositories:\n  - name: "noslash"'),
    ConfigValidationError,
    'owner/repo format',
  );
});

Deno.test('config - rejects invalid ruleset enforcement', () => {
  const yaml = `
version: "1.0"
repositories:
  - name: "o/r"
    rulesets:
      - name: test
        target: branch
        enforcement: invalid
        rules: []
`;
  assertThrows(() => parseConfig(yaml), ConfigValidationError, 'enforcement');
});

Deno.test('config - rejects invalid collaborator permission', () => {
  const yaml = `
version: "1.0"
repositories:
  - name: "o/r"
    collaborators:
      - username: user1
        permission: superadmin
`;
  assertThrows(() => parseConfig(yaml), ConfigValidationError, 'permission');
});

Deno.test('config - rejects invalid rule type', () => {
  const yaml = `
version: "1.0"
repositories:
  - name: "o/r"
    rulesets:
      - name: test
        target: branch
        enforcement: active
        rules:
          - type: nonexistent_rule
`;
  assertThrows(() => parseConfig(yaml), ConfigValidationError, 'type');
});

Deno.test('config - rejects non-boolean setting value', () => {
  const yaml = `
version: "1.0"
repositories:
  - name: "o/r"
    settings:
      has_issues: "yes"
`;
  assertThrows(() => parseConfig(yaml), ConfigValidationError, 'boolean');
});

Deno.test('config - loads valid config from file', async () => {
  const config = await Deno.readTextFile('src/tests/fixtures/valid_config.yml');
  const parsed = parseConfig(config);
  assertEquals(parsed.repositories.length, 2);
  assertEquals(parsed.repositories[0].name, 'acme/webapp');
  assertEquals(parsed.repositories[1].name, 'acme/api-service');
});

Deno.test('resolveSecretValue - resolves env var reference', () => {
  const runtime = { MY_SECRET: 'secret123' };
  assertEquals(resolveSecretValue('$MY_SECRET', runtime), 'secret123');
});

Deno.test('resolveSecretValue - returns literal for non-reference', () => {
  assertEquals(resolveSecretValue('literal-value', {}), 'literal-value');
});

Deno.test('resolveSecretValue - throws for unresolvable reference', () => {
  assertThrows(
    () => resolveSecretValue('$MISSING_VAR', {}),
    Error,
    'could not be resolved',
  );
});

Deno.test('resolveAllSecrets - resolves multiple secrets', () => {
  const secrets = { A: '$KEY_A', B: 'literal', C: '$KEY_C' };
  const runtime = { KEY_A: 'val_a', KEY_C: 'val_c' };
  const resolved = resolveAllSecrets(secrets, runtime);
  assertEquals(resolved, { A: 'val_a', B: 'literal', C: 'val_c' });
});
