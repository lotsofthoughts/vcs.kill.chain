/**
 * vcs-agent: GitHub repository configuration management CLI.
 *
 * Manages repository settings, rulesets, collaborators, security,
 * environments, variables, secrets, and Azure Key Vault integration.
 */

import { createCli } from './cli/mod.ts';

if (import.meta.main) {
  await createCli().parse(Deno.args);
}
