/**
 * Core type definitions for the VCS Agent configuration system.
 * All YAML config maps to these types before being applied to GitHub/Azure APIs.
 */

// ─── Repository Settings ─────────────────────────────────────────────────────

export interface RepoSettings {
  description?: string;
  homepage?: string;
  private?: boolean;
  visibility?: 'public' | 'private' | 'internal';
  has_issues?: boolean;
  has_projects?: boolean;
  has_wiki?: boolean;
  has_discussions?: boolean;
  is_template?: boolean;
  default_branch?: string;
  allow_squash_merge?: boolean;
  allow_merge_commit?: boolean;
  allow_rebase_merge?: boolean;
  allow_auto_merge?: boolean;
  delete_branch_on_merge?: boolean;
  allow_update_branch?: boolean;
  squash_merge_commit_title?: 'PR_TITLE' | 'COMMIT_OR_PR_TITLE';
  squash_merge_commit_message?: 'PR_BODY' | 'COMMIT_MESSAGES' | 'BLANK';
  merge_commit_title?: 'PR_TITLE' | 'MERGE_MESSAGE';
  merge_commit_message?: 'PR_TITLE' | 'PR_BODY' | 'BLANK';
  web_commit_signoff_required?: boolean;
}

// ─── Rulesets ─────────────────────────────────────────────────────────────────

export interface RulesetCondition {
  ref_name?: {
    include?: string[];
    exclude?: string[];
  };
  repository_name?: {
    include?: string[];
    exclude?: string[];
  };
}

export interface StatusCheckConfig {
  context: string;
  integration_id?: number;
}

export interface PullRequestRuleParams {
  required_approving_review_count?: number;
  dismiss_stale_reviews_on_push?: boolean;
  require_code_owner_review?: boolean;
  require_last_push_approval?: boolean;
  required_review_thread_resolution?: boolean;
}

export interface StatusCheckRuleParams {
  strict_required_status_checks_policy?: boolean;
  required_status_checks?: StatusCheckConfig[];
}

export interface MergeQueueRuleParams {
  check_response_timeout_minutes?: number;
  grouping_strategy?: 'ALLGREEN' | 'HEADGREEN';
  max_entries_to_build?: number;
  max_entries_to_merge?: number;
  merge_method?: 'MERGE' | 'SQUASH' | 'REBASE';
  min_entries_to_merge?: number;
  min_entries_to_merge_wait_minutes?: number;
}

export type RuleType =
  | 'creation'
  | 'update'
  | 'deletion'
  | 'required_linear_history'
  | 'required_signatures'
  | 'pull_request'
  | 'required_status_checks'
  | 'non_fast_forward'
  | 'required_deployments'
  | 'merge_queue';

export interface RulesetRule {
  type: RuleType;
  parameters?: PullRequestRuleParams | StatusCheckRuleParams | MergeQueueRuleParams | Record<string, unknown>;
}

export interface Ruleset {
  name: string;
  target: 'branch' | 'tag';
  enforcement: 'disabled' | 'active' | 'evaluate';
  bypass_actors?: {
    actor_id: number;
    actor_type: 'OrganizationAdmin' | 'RepositoryRole' | 'Team' | 'Integration';
    bypass_mode: 'always' | 'pull_request';
  }[];
  conditions?: RulesetCondition;
  rules: RulesetRule[];
}

// ─── Collaborators ────────────────────────────────────────────────────────────

export interface Collaborator {
  username: string;
  permission: 'pull' | 'triage' | 'push' | 'maintain' | 'admin';
}

// ─── Security ─────────────────────────────────────────────────────────────────

export interface SecuritySettings {
  vulnerability_alerts?: boolean;
  automated_security_fixes?: boolean;
  secret_scanning?: boolean;
  secret_scanning_push_protection?: boolean;
  code_scanning?: CodeScanningConfig;
}

export interface CodeScanningConfig {
  state: 'configured' | 'not-configured';
  query_suite?: 'default' | 'extended';
  languages?: string[];
}

// ─── Environments ─────────────────────────────────────────────────────────────

export interface EnvironmentReviewer {
  type: 'User' | 'Team';
  id: number;
}

export interface DeploymentBranchPolicy {
  protected_branches?: boolean;
  custom_branch_policies?: boolean;
}

export interface Environment {
  name: string;
  wait_timer?: number;
  prevent_self_review?: boolean;
  reviewers?: EnvironmentReviewer[];
  deployment_branch_policy?: DeploymentBranchPolicy;
  variables?: Record<string, string>;
  secrets?: Record<string, string>;
}

// ─── Azure Key Vault ──────────────────────────────────────────────────────────

export interface AzureKeyVaultConfig {
  enabled: boolean;
  vault_name: string;
  tenant_id: string;
  subscription_id: string;
  resource_group: string;
  client_id?: string;
  federated_identity?: {
    subject: string;
    audiences?: string[];
  };
}

// ─── Top-Level Configuration ──────────────────────────────────────────────────

export interface RepoConfig {
  name: string; // owner/repo format
  settings?: RepoSettings;
  rulesets?: Ruleset[];
  collaborators?: Collaborator[];
  security?: SecuritySettings;
  environments?: Environment[];
  variables?: Record<string, string>;
  secrets?: Record<string, string>;
  azure_keyvault?: AzureKeyVaultConfig;
}

export interface GlobalSettings {
  conjur_api_key_env?: string;
  github_token_env?: string;
}

export interface AzureGlobalConfig {
  tenant_id?: string;
  subscription_id?: string;
  client_id?: string;
}

export interface VcsAgentConfig {
  version: string;
  settings?: GlobalSettings;
  azure?: AzureGlobalConfig;
  repositories: RepoConfig[];
}

// ─── Sync Plan ────────────────────────────────────────────────────────────────

export type ActionType = 'create' | 'update' | 'delete' | 'skip';

export interface PlanAction {
  resource: string;
  path: string;
  action: ActionType;
  current?: unknown;
  desired?: unknown;
  reason?: string;
}

export interface SyncPlan {
  repository: string;
  actions: PlanAction[];
  timestamp: string;
}

export interface SyncResult {
  repository: string;
  success: boolean;
  actions_taken: number;
  actions_failed: number;
  errors: string[];
  duration_ms: number;
}
