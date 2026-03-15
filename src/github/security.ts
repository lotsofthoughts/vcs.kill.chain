/**
 * Repository security settings management via the GitHub API.
 * Handles vulnerability alerts, secret scanning, and code scanning.
 */

import type { GitHubClient } from './client.ts';
import type { SecuritySettings } from '../types.ts';

export async function getVulnerabilityAlerts(
  client: GitHubClient,
  owner: string,
  repo: string,
): Promise<boolean> {
  try {
    await client.get(`/repos/${owner}/${repo}/vulnerability-alerts`);
    return true;
  } catch {
    return false;
  }
}

export async function enableVulnerabilityAlerts(
  client: GitHubClient,
  owner: string,
  repo: string,
): Promise<void> {
  await client.put(`/repos/${owner}/${repo}/vulnerability-alerts`);
}

export async function disableVulnerabilityAlerts(
  client: GitHubClient,
  owner: string,
  repo: string,
): Promise<void> {
  await client.delete(`/repos/${owner}/${repo}/vulnerability-alerts`);
}

export async function enableAutomatedSecurityFixes(
  client: GitHubClient,
  owner: string,
  repo: string,
): Promise<void> {
  await client.put(`/repos/${owner}/${repo}/automated-security-fixes`);
}

export async function disableAutomatedSecurityFixes(
  client: GitHubClient,
  owner: string,
  repo: string,
): Promise<void> {
  await client.delete(`/repos/${owner}/${repo}/automated-security-fixes`);
}

export interface CodeScanningDefaultSetup {
  state: string;
  query_suite: string;
  languages: string[];
  updated_at: string | null;
}

export async function getCodeScanningDefaultSetup(
  client: GitHubClient,
  owner: string,
  repo: string,
): Promise<CodeScanningDefaultSetup | null> {
  try {
    const { data } = await client.get<CodeScanningDefaultSetup>(
      `/repos/${owner}/${repo}/code-scanning/default-setup`,
    );
    return data;
  } catch {
    return null;
  }
}

export async function updateCodeScanningDefaultSetup(
  client: GitHubClient,
  owner: string,
  repo: string,
  state: string,
  querySuite?: string,
  languages?: string[],
): Promise<void> {
  const body: Record<string, unknown> = { state };
  if (querySuite) body.query_suite = querySuite;
  if (languages) body.languages = languages;

  await client.patch(`/repos/${owner}/${repo}/code-scanning/default-setup`, body);
}

export async function syncSecuritySettings(
  client: GitHubClient,
  owner: string,
  repo: string,
  desired: SecuritySettings,
): Promise<string[]> {
  const changes: string[] = [];

  if (desired.vulnerability_alerts !== undefined) {
    const current = await getVulnerabilityAlerts(client, owner, repo);
    if (desired.vulnerability_alerts && !current) {
      await enableVulnerabilityAlerts(client, owner, repo);
      changes.push('Enabled vulnerability alerts');
    } else if (!desired.vulnerability_alerts && current) {
      await disableVulnerabilityAlerts(client, owner, repo);
      changes.push('Disabled vulnerability alerts');
    }
  }

  if (desired.automated_security_fixes !== undefined) {
    if (desired.automated_security_fixes) {
      await enableAutomatedSecurityFixes(client, owner, repo);
      changes.push('Enabled automated security fixes');
    } else {
      await disableAutomatedSecurityFixes(client, owner, repo);
      changes.push('Disabled automated security fixes');
    }
  }

  if (desired.code_scanning) {
    await updateCodeScanningDefaultSetup(
      client,
      owner,
      repo,
      desired.code_scanning.state,
      desired.code_scanning.query_suite,
      desired.code_scanning.languages,
    );
    changes.push(`Code scanning: ${desired.code_scanning.state}`);
  }

  return changes;
}
