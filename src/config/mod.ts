/**
 * Configuration loader and parser for vcs-agent YAML configs.
 */

import { parse as parseYaml } from '@std/yaml';
import type { VcsAgentConfig } from '../types.ts';
import { validateConfig } from './schema.ts';

export { ConfigValidationError } from './schema.ts';

export async function loadConfigFromFile(path: string): Promise<VcsAgentConfig> {
  const content = await Deno.readTextFile(path);
  return parseConfig(content);
}

export function parseConfig(yamlContent: string): VcsAgentConfig {
  const raw = parseYaml(yamlContent);
  return validateConfig(raw);
}

export function resolveSecretValue(
  value: string,
  runtimeSecrets: Record<string, string>,
): string {
  if (value.startsWith('$')) {
    const envName = value.slice(1);
    const resolved = runtimeSecrets[envName] ?? Deno.env.get(envName);
    if (!resolved) {
      throw new Error(`Secret reference '${value}' could not be resolved from environment or runtime flags`);
    }
    return resolved;
  }
  return value;
}

export function resolveAllSecrets(
  secrets: Record<string, string>,
  runtimeSecrets: Record<string, string>,
): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const [key, value] of Object.entries(secrets)) {
    resolved[key] = resolveSecretValue(value, runtimeSecrets);
  }
  return resolved;
}
