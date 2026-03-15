/**
 * Azure module re-exports.
 */

export {
  KeyVaultClient,
  AzureKeyVaultError,
  getAzureTokenViaManagedIdentity,
  getAzureTokenViaOidc,
} from './keyvault.ts';

export {
  AzureOidcError,
  listFederatedCredentials,
  createFederatedCredential,
  buildGitHubFederatedCredential,
} from './oidc.ts';
export type { FederatedCredential } from './oidc.ts';
