/**
 * Repository and environment secrets management via the GitHub API.
 * Uses tweetnacl (libsodium-compatible) for encrypting secret values.
 */

import type { GitHubClient } from './client.ts';

export interface GitHubPublicKey {
  key_id: string;
  key: string;
}

export interface GitHubSecret {
  name: string;
  created_at: string;
  updated_at: string;
}

async function encryptSecret(publicKeyBase64: string, secretValue: string): Promise<string> {
  const nacl = await import('tweetnacl');
  const naclUtil = await import('tweetnacl-util');

  const publicKeyBytes = naclUtil.default.decodeBase64(publicKeyBase64);
  const messageBytes = naclUtil.default.decodeUTF8(secretValue);
  const encrypted = nacl.default.box.after(
    messageBytes,
    new Uint8Array(24),
    nacl.default.box.before(publicKeyBytes, nacl.default.box.keyPair().secretKey),
  );

  // Use the sealed box approach: generate ephemeral keypair
  const ephemeralKeyPair = nacl.default.box.keyPair();
  const nonce = new Uint8Array(24);
  const encryptedValue = nacl.default.box(
    messageBytes,
    nonce,
    publicKeyBytes,
    ephemeralKeyPair.secretKey,
  );

  // Sealed box = ephemeral public key + encrypted message
  const sealedBox = new Uint8Array(ephemeralKeyPair.publicKey.length + encryptedValue.length);
  sealedBox.set(ephemeralKeyPair.publicKey);
  sealedBox.set(encryptedValue, ephemeralKeyPair.publicKey.length);

  return naclUtil.default.encodeBase64(sealedBox);
}

// ─── Repository-level secrets ─────────────────────────────────────────────────

export async function getRepoPublicKey(
  client: GitHubClient,
  owner: string,
  repo: string,
): Promise<GitHubPublicKey> {
  const { data } = await client.get<GitHubPublicKey>(
    `/repos/${owner}/${repo}/actions/secrets/public-key`,
  );
  return data;
}

export async function listRepoSecrets(
  client: GitHubClient,
  owner: string,
  repo: string,
): Promise<GitHubSecret[]> {
  const { data } = await client.get<{ secrets: GitHubSecret[] }>(
    `/repos/${owner}/${repo}/actions/secrets`,
  );
  return data?.secrets ?? [];
}

export async function createOrUpdateRepoSecret(
  client: GitHubClient,
  owner: string,
  repo: string,
  name: string,
  value: string,
): Promise<void> {
  const publicKey = await getRepoPublicKey(client, owner, repo);
  const encryptedValue = await encryptSecret(publicKey.key, value);

  await client.put(`/repos/${owner}/${repo}/actions/secrets/${name}`, {
    encrypted_value: encryptedValue,
    key_id: publicKey.key_id,
  });
}

export async function deleteRepoSecret(
  client: GitHubClient,
  owner: string,
  repo: string,
  name: string,
): Promise<void> {
  await client.delete(`/repos/${owner}/${repo}/actions/secrets/${name}`);
}

export async function syncRepoSecrets(
  client: GitHubClient,
  owner: string,
  repo: string,
  desired: Record<string, string>,
): Promise<{ created: string[]; updated: string[] }> {
  const existing = await listRepoSecrets(client, owner, repo);
  const existingNames = new Set(existing.map((s) => s.name));
  const result = { created: [] as string[], updated: [] as string[] };

  for (const [name, value] of Object.entries(desired)) {
    await createOrUpdateRepoSecret(client, owner, repo, name, value);
    if (existingNames.has(name)) {
      result.updated.push(name);
    } else {
      result.created.push(name);
    }
  }

  return result;
}

// ─── Environment-level secrets ────────────────────────────────────────────────

export async function getEnvPublicKey(
  client: GitHubClient,
  owner: string,
  repo: string,
  envName: string,
): Promise<GitHubPublicKey> {
  const { data } = await client.get<GitHubPublicKey>(
    `/repos/${owner}/${repo}/environments/${envName}/secrets/public-key`,
  );
  return data;
}

export async function listEnvSecrets(
  client: GitHubClient,
  owner: string,
  repo: string,
  envName: string,
): Promise<GitHubSecret[]> {
  const { data } = await client.get<{ secrets: GitHubSecret[] }>(
    `/repos/${owner}/${repo}/environments/${envName}/secrets`,
  );
  return data?.secrets ?? [];
}

export async function createOrUpdateEnvSecret(
  client: GitHubClient,
  owner: string,
  repo: string,
  envName: string,
  name: string,
  value: string,
): Promise<void> {
  const publicKey = await getEnvPublicKey(client, owner, repo, envName);
  const encryptedValue = await encryptSecret(publicKey.key, value);

  await client.put(
    `/repos/${owner}/${repo}/environments/${envName}/secrets/${name}`,
    {
      encrypted_value: encryptedValue,
      key_id: publicKey.key_id,
    },
  );
}

export async function syncEnvSecrets(
  client: GitHubClient,
  owner: string,
  repo: string,
  envName: string,
  desired: Record<string, string>,
): Promise<{ created: string[]; updated: string[] }> {
  const existing = await listEnvSecrets(client, owner, repo, envName);
  const existingNames = new Set(existing.map((s) => s.name));
  const result = { created: [] as string[], updated: [] as string[] };

  for (const [name, value] of Object.entries(desired)) {
    await createOrUpdateEnvSecret(client, owner, repo, envName, name, value);
    if (existingNames.has(name)) {
      result.updated.push(name);
    } else {
      result.created.push(name);
    }
  }

  return result;
}
