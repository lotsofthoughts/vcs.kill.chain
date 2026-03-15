import { assertEquals } from '@std/assert';
import { buildGitHubFederatedCredential } from '../../../azure/oidc.ts';

Deno.test('buildGitHubFederatedCredential - generates credential for main branch', () => {
  const cred = buildGitHubFederatedCredential('acme', 'webapp');
  assertEquals(cred.issuer, 'https://token.actions.githubusercontent.com');
  assertEquals(cred.subject, 'repo:acme/webapp:ref:refs/heads/main');
  assertEquals(cred.audiences, ['api://AzureADTokenExchange']);
  assertEquals(cred.name.startsWith('github-acme-webapp'), true);
});

Deno.test('buildGitHubFederatedCredential - generates credential for environment', () => {
  const cred = buildGitHubFederatedCredential('acme', 'webapp', 'production');
  assertEquals(cred.subject, 'repo:acme/webapp:environment:production');
  assertEquals(cred.name.includes('production'), true);
});

Deno.test('buildGitHubFederatedCredential - generates credential for custom branch', () => {
  const cred = buildGitHubFederatedCredential('acme', 'webapp', undefined, 'release');
  assertEquals(cred.subject, 'repo:acme/webapp:ref:refs/heads/release');
});

Deno.test('buildGitHubFederatedCredential - sanitizes name', () => {
  const cred = buildGitHubFederatedCredential('my.org', 'repo_name', 'env/path');
  assertEquals(cred.name.includes('.'), false);
  assertEquals(cred.name.includes('/'), false);
  assertEquals(cred.name.includes('_'), false);
});

Deno.test('buildGitHubFederatedCredential - truncates long names', () => {
  const longOwner = 'a'.repeat(100);
  const longRepo = 'b'.repeat(100);
  const cred = buildGitHubFederatedCredential(longOwner, longRepo);
  assertEquals(cred.name.length <= 120, true);
});
