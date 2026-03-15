import { assertEquals, assertRejects } from '@std/assert';
import { GitHubClient, GitHubApiError } from '../../../github/client.ts';

function createMockServer(
  handler: (req: Request) => Response | Promise<Response>,
): { port: number; close: () => void } {
  const server = Deno.serve({ port: 0, onListen() {} }, handler);
  const addr = server.addr as Deno.NetAddr;
  return {
    port: addr.port,
    close: () => server.shutdown(),
  };
}

Deno.test('GitHubClient - makes GET request with auth headers', async () => {
  const server = createMockServer((req) => {
    assertEquals(req.headers.get('Authorization'), 'Bearer test-token');
    assertEquals(req.headers.get('Accept'), 'application/vnd.github+json');
    assertEquals(req.headers.get('X-GitHub-Api-Version'), '2022-11-28');
    return new Response(JSON.stringify({ id: 1, name: 'test' }), {
      headers: { 'content-type': 'application/json' },
    });
  });

  try {
    const client = new GitHubClient({
      token: 'test-token',
      baseUrl: `http://localhost:${server.port}`,
      maxRetries: 0,
    });
    const result = await client.get<{ id: number; name: string }>('/repos/owner/repo');
    assertEquals(result.status, 200);
    assertEquals(result.data.id, 1);
    assertEquals(result.data.name, 'test');
  } finally {
    server.close();
  }
});

Deno.test('GitHubClient - makes POST request with body', async () => {
  const server = createMockServer(async (req) => {
    assertEquals(req.method, 'POST');
    const body = await req.json();
    assertEquals(body.name, 'new-repo');
    return new Response(JSON.stringify({ id: 2 }), {
      headers: { 'content-type': 'application/json' },
    });
  });

  try {
    const client = new GitHubClient({
      token: 'test-token',
      baseUrl: `http://localhost:${server.port}`,
      maxRetries: 0,
    });
    const result = await client.post<{ id: number }>('/repos', { name: 'new-repo' });
    assertEquals(result.data.id, 2);
  } finally {
    server.close();
  }
});

Deno.test('GitHubClient - makes PATCH request', async () => {
  const server = createMockServer(async (req) => {
    assertEquals(req.method, 'PATCH');
    const body = await req.json();
    assertEquals(body.description, 'updated');
    return new Response(JSON.stringify({ description: 'updated' }), {
      headers: { 'content-type': 'application/json' },
    });
  });

  try {
    const client = new GitHubClient({
      token: 'test-token',
      baseUrl: `http://localhost:${server.port}`,
      maxRetries: 0,
    });
    const result = await client.patch<{ description: string }>('/repos/o/r', {
      description: 'updated',
    });
    assertEquals(result.data.description, 'updated');
  } finally {
    server.close();
  }
});

Deno.test('GitHubClient - makes PUT request', async () => {
  const server = createMockServer((_req) => {
    return new Response(null, { status: 204 });
  });

  try {
    const client = new GitHubClient({
      token: 'test-token',
      baseUrl: `http://localhost:${server.port}`,
      maxRetries: 0,
    });
    const result = await client.put('/repos/o/r/vulnerability-alerts');
    assertEquals(result.status, 204);
  } finally {
    server.close();
  }
});

Deno.test('GitHubClient - makes DELETE request', async () => {
  const server = createMockServer((_req) => {
    return new Response(null, { status: 204 });
  });

  try {
    const client = new GitHubClient({
      token: 'test-token',
      baseUrl: `http://localhost:${server.port}`,
      maxRetries: 0,
    });
    const result = await client.delete('/repos/o/r/collaborators/user');
    assertEquals(result.status, 204);
  } finally {
    server.close();
  }
});

Deno.test('GitHubClient - throws GitHubApiError on 404', async () => {
  const server = createMockServer((_req) => {
    return new Response(JSON.stringify({ message: 'Not Found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  });

  try {
    const client = new GitHubClient({
      token: 'test-token',
      baseUrl: `http://localhost:${server.port}`,
      maxRetries: 0,
    });
    await assertRejects(
      () => client.get('/repos/nonexistent/repo'),
      GitHubApiError,
      'Not Found',
    );
  } finally {
    server.close();
  }
});

Deno.test('GitHubClient - throws GitHubApiError on 422', async () => {
  const server = createMockServer((_req) => {
    return new Response(JSON.stringify({ message: 'Validation Failed' }), {
      status: 422,
      headers: { 'content-type': 'application/json' },
    });
  });

  try {
    const client = new GitHubClient({
      token: 'test-token',
      baseUrl: `http://localhost:${server.port}`,
      maxRetries: 0,
    });
    await assertRejects(
      () => client.post('/repos/o/r/rulesets', {}),
      GitHubApiError,
      'Validation Failed',
    );
  } finally {
    server.close();
  }
});
