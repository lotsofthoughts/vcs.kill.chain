/**
 * GitHub API module re-exports.
 */

export { GitHubClient, GitHubApiError } from './client.ts';
export type { GitHubClientOptions, GitHubResponse } from './client.ts';

export { getRepoSettings, updateRepoSettings, diffRepoSettings } from './repos.ts';
export type { GitHubRepoData } from './repos.ts';

export {
  listRulesets,
  getRuleset,
  createRuleset,
  updateRuleset,
  deleteRuleset,
  syncRulesets,
} from './rulesets.ts';

export {
  listCollaborators,
  addCollaborator,
  removeCollaborator,
  syncCollaborators,
} from './collaborators.ts';

export {
  getVulnerabilityAlerts,
  enableVulnerabilityAlerts,
  disableVulnerabilityAlerts,
  enableAutomatedSecurityFixes,
  disableAutomatedSecurityFixes,
  getCodeScanningDefaultSetup,
  updateCodeScanningDefaultSetup,
  syncSecuritySettings,
} from './security.ts';

export {
  listEnvironments,
  getEnvironment,
  createOrUpdateEnvironment,
  deleteEnvironment,
  syncEnvironments,
} from './environments.ts';

export {
  listRepoVariables,
  createRepoVariable,
  updateRepoVariable,
  syncRepoVariables,
  listEnvVariables,
  createEnvVariable,
  updateEnvVariable,
  syncEnvVariables,
} from './variables.ts';

export {
  getRepoPublicKey,
  listRepoSecrets,
  createOrUpdateRepoSecret,
  deleteRepoSecret,
  syncRepoSecrets,
  getEnvPublicKey,
  listEnvSecrets,
  createOrUpdateEnvSecret,
  syncEnvSecrets,
} from './secrets.ts';
