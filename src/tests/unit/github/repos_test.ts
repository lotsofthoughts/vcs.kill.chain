import { assertEquals } from '@std/assert';
import { diffRepoSettings, type GitHubRepoData } from '../../../github/repos.ts';
import type { RepoSettings } from '../../../types.ts';

const mockCurrentRepo: GitHubRepoData = {
  name: 'repo',
  full_name: 'owner/repo',
  description: 'Old description',
  homepage: null,
  private: false,
  visibility: 'public',
  default_branch: 'main',
  has_issues: true,
  has_projects: true,
  has_wiki: true,
  has_discussions: false,
  is_template: false,
  allow_squash_merge: true,
  allow_merge_commit: true,
  allow_rebase_merge: true,
  allow_auto_merge: false,
  delete_branch_on_merge: false,
  allow_update_branch: false,
  web_commit_signoff_required: false,
  squash_merge_commit_title: 'COMMIT_OR_PR_TITLE',
  squash_merge_commit_message: 'COMMIT_MESSAGES',
  merge_commit_title: 'MERGE_MESSAGE',
  merge_commit_message: 'PR_TITLE',
};

Deno.test('diffRepoSettings - detects description change', () => {
  const desired: RepoSettings = { description: 'New description' };
  const diffs = diffRepoSettings(mockCurrentRepo, desired);
  assertEquals(Object.keys(diffs).length, 1);
  assertEquals(diffs.description.current, 'Old description');
  assertEquals(diffs.description.desired, 'New description');
});

Deno.test('diffRepoSettings - detects multiple changes', () => {
  const desired: RepoSettings = {
    description: 'New',
    private: true,
    has_wiki: false,
    delete_branch_on_merge: true,
  };
  const diffs = diffRepoSettings(mockCurrentRepo, desired);
  assertEquals(Object.keys(diffs).length, 4);
  assertEquals(diffs.description !== undefined, true);
  assertEquals(diffs.private !== undefined, true);
  assertEquals(diffs.has_wiki !== undefined, true);
  assertEquals(diffs.delete_branch_on_merge !== undefined, true);
});

Deno.test('diffRepoSettings - no diffs when values match', () => {
  const desired: RepoSettings = {
    description: 'Old description',
    has_issues: true,
    allow_squash_merge: true,
  };
  const diffs = diffRepoSettings(mockCurrentRepo, desired);
  assertEquals(Object.keys(diffs).length, 0);
});

Deno.test('diffRepoSettings - empty desired returns no diffs', () => {
  const diffs = diffRepoSettings(mockCurrentRepo, {});
  assertEquals(Object.keys(diffs).length, 0);
});
