/**
 * Azure OIDC federated identity credential management.
 * Configures trust between GitHub Actions and Azure AD applications.
 */

export interface FederatedCredential {
  name: string;
  issuer: string;
  subject: string;
  audiences: string[];
  description?: string;
}

export class AzureOidcError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(`Azure OIDC error (${status}): ${message}`);
    this.name = 'AzureOidcError';
  }
}

async function getGraphToken(
  tenantId: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
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
    throw new AzureOidcError(response.status, 'Failed to get Graph API token');
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export async function listFederatedCredentials(
  tenantId: string,
  clientId: string,
  clientSecret: string,
  appObjectId: string,
): Promise<FederatedCredential[]> {
  const token = await getGraphToken(tenantId, clientId, clientSecret);

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/applications/${appObjectId}/federatedIdentityCredentials`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    throw new AzureOidcError(response.status, 'Failed to list federated credentials');
  }

  const data = (await response.json()) as { value: FederatedCredential[] };
  return data.value;
}

export async function createFederatedCredential(
  tenantId: string,
  clientId: string,
  clientSecret: string,
  appObjectId: string,
  credential: FederatedCredential,
): Promise<void> {
  const token = await getGraphToken(tenantId, clientId, clientSecret);

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/applications/${appObjectId}/federatedIdentityCredentials`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credential),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new AzureOidcError(response.status, `Failed to create federated credential: ${body}`);
  }
}

export function buildGitHubFederatedCredential(
  owner: string,
  repo: string,
  environment?: string,
  branch?: string,
): FederatedCredential {
  let subject: string;
  if (environment) {
    subject = `repo:${owner}/${repo}:environment:${environment}`;
  } else if (branch) {
    subject = `repo:${owner}/${repo}:ref:refs/heads/${branch}`;
  } else {
    subject = `repo:${owner}/${repo}:ref:refs/heads/main`;
  }

  const name = `github-${owner}-${repo}${environment ? `-${environment}` : ''}${
    branch ? `-${branch}` : ''
  }`.replace(/[^a-zA-Z0-9-]/g, '-').substring(0, 120);

  return {
    name,
    issuer: 'https://token.actions.githubusercontent.com',
    subject,
    audiences: ['api://AzureADTokenExchange'],
    description: `GitHub Actions OIDC for ${owner}/${repo}`,
  };
}
