import { assertEquals } from '@std/assert';
import { findRulesetByName, type GitHubRuleset } from '../../../github/rulesets.ts';

const mockRulesets: GitHubRuleset[] = [
  {
    id: 1,
    name: 'main-protection',
    target: 'branch',
    source_type: 'Repository',
    source: 'owner/repo',
    enforcement: 'active',
    bypass_actors: [],
    rules: [{ type: 'pull_request' }],
  },
  {
    id: 2,
    name: 'release-tags',
    target: 'tag',
    source_type: 'Repository',
    source: 'owner/repo',
    enforcement: 'active',
    bypass_actors: [],
    rules: [{ type: 'creation' }],
  },
];

Deno.test('findRulesetByName - finds existing ruleset', () => {
  const result = findRulesetByName(mockRulesets, 'main-protection');
  assertEquals(result?.id, 1);
  assertEquals(result?.name, 'main-protection');
});

Deno.test('findRulesetByName - returns undefined for missing ruleset', () => {
  const result = findRulesetByName(mockRulesets, 'nonexistent');
  assertEquals(result, undefined);
});

Deno.test('findRulesetByName - finds second ruleset', () => {
  const result = findRulesetByName(mockRulesets, 'release-tags');
  assertEquals(result?.id, 2);
});

Deno.test('findRulesetByName - handles empty array', () => {
  const result = findRulesetByName([], 'test');
  assertEquals(result, undefined);
});
