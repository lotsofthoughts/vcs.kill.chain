/**
 * GitHub REST API client with retry logic and rate-limit handling.
 */

export interface GitHubClientOptions {
  token: string;
  baseUrl?: string;
  maxRetries?: number;
  userAgent?: string;
}

export interface GitHubResponse<T = unknown> {
  status: number;
  data: T;
  headers: Headers;
}

export class GitHubApiError extends Error {
  constructor(
    public status: number,
    public endpoint: string,
    message: string,
    public responseBody?: unknown,
  ) {
    super(`GitHub API ${status} on ${endpoint}: ${message}`);
    this.name = 'GitHubApiError';
  }
}

export class GitHubClient {
  private token: string;
  private baseUrl: string;
  private maxRetries: number;
  private userAgent: string;

  constructor(options: GitHubClientOptions) {
    this.token = options.token;
    this.baseUrl = options.baseUrl ?? 'https://api.github.com';
    this.maxRetries = options.maxRetries ?? 3;
    this.userAgent = options.userAgent ?? 'vcs-agent/1.0';
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<GitHubResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': this.userAgent,
        };
        if (body !== undefined) {
          headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(url, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });

        if (response.status === 403) {
          const remaining = response.headers.get('x-ratelimit-remaining');
          if (remaining === '0') {
            const resetTime = parseInt(response.headers.get('x-ratelimit-reset') ?? '0') * 1000;
            const waitMs = Math.max(resetTime - Date.now(), 1000);
            if (attempt < this.maxRetries) {
              await new Promise((r) => setTimeout(r, Math.min(waitMs, 60000)));
              continue;
            }
          }
        }

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('retry-after') ?? '5');
          if (attempt < this.maxRetries) {
            await new Promise((r) => setTimeout(r, retryAfter * 1000));
            continue;
          }
        }

        if (response.status >= 500 && attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
          continue;
        }

        let data: T;
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('application/json') && response.status !== 204) {
          data = await response.json() as T;
        } else {
          await response.body?.cancel();
          data = undefined as unknown as T;
        }

        if (response.status >= 400) {
          throw new GitHubApiError(
            response.status,
            `${method} ${path}`,
            (data as Record<string, unknown>)?.message as string ?? 'Unknown error',
            data,
          );
        }

        return { status: response.status, data, headers: response.headers };
      } catch (error) {
        if (error instanceof GitHubApiError) throw error;
        lastError = error as Error;
        if (attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError ?? new Error(`Request failed after ${this.maxRetries} retries`);
  }

  get<T>(path: string): Promise<GitHubResponse<T>> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body: unknown): Promise<GitHubResponse<T>> {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body?: unknown): Promise<GitHubResponse<T>> {
    return this.request<T>('PUT', path, body);
  }

  patch<T>(path: string, body: unknown): Promise<GitHubResponse<T>> {
    return this.request<T>('PATCH', path, body);
  }

  delete<T>(path: string): Promise<GitHubResponse<T>> {
    return this.request<T>('DELETE', path);
  }
}
