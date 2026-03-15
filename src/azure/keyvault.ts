/**
 * Azure Key Vault client using the Azure REST API.
 * Uses managed identity or OIDC for authentication.
 */

export interface AzureTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  resource: string;
}

export interface KeyVaultSecret {
  id: string;
  value: string;
  attributes: {
    enabled: boolean;
    created: number;
    updated: number;
  };
}

export class AzureKeyVaultError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(`Azure Key Vault error (${status}): ${message}`);
    this.name = 'AzureKeyVaultError';
  }
}

export async function getAzureTokenViaManagedIdentity(
  resource: string,
  clientId?: string,
): Promise<string> {
  const params = new URLSearchParams({
    resource,
    'api-version': '2019-08-01',
  });
  if (clientId) params.set('client_id', clientId);

  const response = await fetch(
    `http://169.254.169.254/metadata/identity/oauth2/token?${params}`,
    {
      headers: { Metadata: 'true' },
    },
  );

  if (!response.ok) {
    throw new AzureKeyVaultError(
      response.status,
      'Failed to acquire managed identity token',
    );
  }

  const data = (await response.json()) as AzureTokenResponse;
  return data.access_token;
}

export async function getAzureTokenViaOidc(
  tenantId: string,
  clientId: string,
  federatedToken: string,
): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: federatedToken,
    scope: 'https://vault.azure.net/.default',
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new AzureKeyVaultError(response.status, `OIDC token exchange failed: ${body}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export class KeyVaultClient {
  private vaultUrl: string;
  private accessToken: string;

  constructor(vaultName: string, accessToken: string) {
    this.vaultUrl = `https://${vaultName}.vault.azure.net`;
    this.accessToken = accessToken;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.vaultUrl}${path}?api-version=7.4`;
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new AzureKeyVaultError(response.status, errBody);
    }

    return (await response.json()) as T;
  }

  async getSecret(name: string): Promise<string> {
    const data = await this.request<KeyVaultSecret>('GET', `/secrets/${name}`);
    return data.value;
  }

  async setSecret(name: string, value: string): Promise<void> {
    await this.request('PUT', `/secrets/${name}`, { value });
  }

  async listSecrets(): Promise<string[]> {
    const data = await this.request<{ value: { id: string }[] }>('GET', '/secrets');
    return data.value.map((s) => {
      const parts = s.id.split('/');
      return parts[parts.length - 1];
    });
  }
}
