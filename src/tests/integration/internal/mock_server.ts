/**
 * Mock GitHub API server for integration testing.
 * Simulates a subset of the GitHub REST API endpoints.
 */

interface MockRepo {
  settings: Record<string, unknown>;
  rulesets: { id: number; name: string; target: string; enforcement: string; rules: unknown[] }[];
  collaborators: { login: string; permissions: Record<string, boolean>; role_name: string }[];
  environments: { name: string; protection_rules: unknown[] }[];
  variables: { name: string; value: string }[];
  secrets: { name: string }[];
  publicKey: { key_id: string; key: string };
}

function defaultRepo(): MockRepo {
  return {
    settings: {
      name: 'repo',
      full_name: 'test-owner/test-repo',
      description: 'Original description',
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
    },
    rulesets: [],
    collaborators: [
      { login: 'test-owner', permissions: { admin: true, push: true, pull: true, maintain: true, triage: true }, role_name: 'admin' },
    ],
    environments: [],
    variables: [],
    secrets: [],
    publicKey: {
      key_id: 'mock-key-id',
      key: 'lNRLKFcAGBWzuSLGhhKPeJois9YKFMQGT0Q/K07TRNE=',
    },
  };
}

export function createMockGitHubServer(): {
  port: number;
  close: () => void;
  repo: MockRepo;
} {
  const repo = defaultRepo();
  let nextRulesetId = 1;

  function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }

  const server = Deno.serve({ port: 0, onListen() {} }, async (req) => {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Repository settings
    if (path.match(/^\/repos\/[^/]+\/[^/]+$/) && method === 'GET') {
      return jsonResponse(repo.settings);
    }
    if (path.match(/^\/repos\/[^/]+\/[^/]+$/) && method === 'PATCH') {
      const body = await req.json();
      Object.assign(repo.settings, body);
      return jsonResponse(repo.settings);
    }

    // Rulesets
    if (path.match(/^\/repos\/[^/]+\/[^/]+\/rulesets$/) && method === 'GET') {
      return jsonResponse(repo.rulesets);
    }
    if (path.match(/^\/repos\/[^/]+\/[^/]+\/rulesets$/) && method === 'POST') {
      const body = await req.json();
      const ruleset = { id: nextRulesetId++, ...body };
      repo.rulesets.push(ruleset);
      return jsonResponse(ruleset, 201);
    }
    if (path.match(/^\/repos\/[^/]+\/[^/]+\/rulesets\/\d+$/) && method === 'PUT') {
      const id = parseInt(path.split('/').pop()!);
      const body = await req.json();
      const idx = repo.rulesets.findIndex((r) => r.id === id);
      if (idx >= 0) {
        repo.rulesets[idx] = { ...repo.rulesets[idx], ...body };
        return jsonResponse(repo.rulesets[idx]);
      }
      return jsonResponse({ message: 'Not Found' }, 404);
    }
    if (path.match(/^\/repos\/[^/]+\/[^/]+\/rulesets\/\d+$/) && method === 'DELETE') {
      const id = parseInt(path.split('/').pop()!);
      repo.rulesets = repo.rulesets.filter((r) => r.id !== id);
      return new Response(null, { status: 204 });
    }

    // Collaborators
    if (path.match(/^\/repos\/[^/]+\/[^/]+\/collaborators$/) && method === 'GET') {
      return jsonResponse(repo.collaborators);
    }
    if (path.match(/^\/repos\/[^/]+\/[^/]+\/collaborators\/[^/]+$/) && method === 'PUT') {
      const username = path.split('/').pop()!;
      const body = await req.json();
      const idx = repo.collaborators.findIndex((c) => c.login === username);
      const entry = {
        login: username,
        permissions: { admin: false, push: false, pull: true, maintain: false, triage: false },
        role_name: body.permission || 'read',
      };
      if (idx >= 0) {
        repo.collaborators[idx] = entry;
      } else {
        repo.collaborators.push(entry);
      }
      return new Response(null, { status: 204 });
    }
    if (path.match(/^\/repos\/[^/]+\/[^/]+\/collaborators\/[^/]+$/) && method === 'DELETE') {
      const username = path.split('/').pop()!;
      repo.collaborators = repo.collaborators.filter((c) => c.login !== username);
      return new Response(null, { status: 204 });
    }

    // Environments
    if (path.match(/^\/repos\/[^/]+\/[^/]+\/environments$/) && method === 'GET') {
      return jsonResponse({ environments: repo.environments });
    }
    if (path.match(/^\/repos\/[^/]+\/[^/]+\/environments\/[^/]+$/) && method === 'GET') {
      const envName = decodeURIComponent(path.split('/').pop()!);
      const env = repo.environments.find((e) => e.name === envName);
      if (env) return jsonResponse(env);
      return jsonResponse({ message: 'Not Found' }, 404);
    }
    if (path.match(/^\/repos\/[^/]+\/[^/]+\/environments\/[^/]+$/) && method === 'PUT') {
      const envName = decodeURIComponent(path.split('/').pop()!);
      const body = await req.json();
      const idx = repo.environments.findIndex((e) => e.name === envName);
      const entry = { name: envName, protection_rules: [], ...body };
      if (idx >= 0) {
        repo.environments[idx] = entry;
      } else {
        repo.environments.push(entry);
      }
      return jsonResponse(entry);
    }

    // Variables (repo-level)
    if (path.match(/^\/repos\/[^/]+\/[^/]+\/actions\/variables$/) && method === 'GET') {
      return jsonResponse({ variables: repo.variables });
    }
    if (path.match(/^\/repos\/[^/]+\/[^/]+\/actions\/variables\/[^/]+$/) && method === 'GET') {
      const name = path.split('/').pop()!;
      const v = repo.variables.find((x) => x.name === name);
      if (v) return jsonResponse(v);
      return jsonResponse({ message: 'Not Found' }, 404);
    }
    if (path.match(/^\/repos\/[^/]+\/[^/]+\/actions\/variables$/) && method === 'POST') {
      const body = await req.json();
      repo.variables.push({ name: body.name, value: body.value });
      return new Response(null, { status: 201 });
    }
    if (path.match(/^\/repos\/[^/]+\/[^/]+\/actions\/variables\/[^/]+$/) && method === 'PATCH') {
      const name = path.split('/').pop()!;
      const body = await req.json();
      const idx = repo.variables.findIndex((v) => v.name === name);
      if (idx >= 0) repo.variables[idx].value = body.value;
      return new Response(null, { status: 204 });
    }

    // Secrets (repo-level)
    if (path.match(/^\/repos\/[^/]+\/[^/]+\/actions\/secrets\/public-key$/) && method === 'GET') {
      return jsonResponse(repo.publicKey);
    }
    if (path.match(/^\/repos\/[^/]+\/[^/]+\/actions\/secrets$/) && method === 'GET') {
      return jsonResponse({ secrets: repo.secrets });
    }
    if (path.match(/^\/repos\/[^/]+\/[^/]+\/actions\/secrets\/[^/]+$/) && method === 'PUT') {
      const name = path.split('/').pop()!;
      if (name === 'public-key') return jsonResponse({ message: 'Not Found' }, 404);
      const existing = repo.secrets.find((s) => s.name === name);
      if (!existing) {
        repo.secrets.push({ name });
      }
      return new Response(null, { status: 204 });
    }

    // Environment secrets
    if (path.match(/\/environments\/[^/]+\/secrets\/public-key$/) && method === 'GET') {
      return jsonResponse(repo.publicKey);
    }
    if (path.match(/\/environments\/[^/]+\/secrets$/) && method === 'GET') {
      return jsonResponse({ secrets: [] });
    }
    if (path.match(/\/environments\/[^/]+\/secrets\/[^/]+$/) && method === 'PUT') {
      return new Response(null, { status: 204 });
    }

    // Environment variables
    if (path.match(/\/environments\/[^/]+\/variables$/) && method === 'GET') {
      return jsonResponse({ variables: [] });
    }
    if (path.match(/\/environments\/[^/]+\/variables$/) && method === 'POST') {
      return new Response(null, { status: 201 });
    }

    // Vulnerability alerts
    if (path.match(/\/vulnerability-alerts$/) && method === 'GET') {
      return new Response(null, { status: 204 });
    }
    if (path.match(/\/vulnerability-alerts$/) && method === 'PUT') {
      return new Response(null, { status: 204 });
    }
    if (path.match(/\/automated-security-fixes$/) && method === 'PUT') {
      return new Response(null, { status: 204 });
    }
    if (path.match(/\/code-scanning\/default-setup$/) && method === 'PATCH') {
      return jsonResponse({ run_id: 1, status: 'configured' });
    }

    return jsonResponse({ message: `Mock: unhandled ${method} ${path}` }, 404);
  });

  const addr = server.addr as Deno.NetAddr;
  return {
    port: addr.port,
    close: () => server.shutdown(),
    repo,
  };
}
