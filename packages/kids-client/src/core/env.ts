/**
 * Env contract between the wrapper (`bin/kids-opencode`) and this client.
 * Wrapper resolves auth + flag → env vars → exec kids-client.
 *
 * Required keys cause hard-fail at startup with a friendly ErrorScreen
 * (config_missing / auth_failed variant).
 */

import { homedir } from "node:os"
import { join } from "node:path"

export interface KidsClientEnv {
  /** Local opencode serve endpoint. Default http://127.0.0.1:4096. */
  opencodeBaseUrl: string
  /** HTTP Basic Auth password for serve. Mandatory. */
  opencodeServerPassword: string
  /** DeepRouter tenant key. May be empty when using BYOK bypass. */
  deeprouterApiKey: string
  /** True if the wrapper set KIDS_LLM_BYPASS_GATEWAY=1 (BYOK dogfood mode). */
  bypassGateway: boolean
  /** Optional course pack id (e.g. "portfolio-site"). */
  coursePack: string | null
  /** Optional mission id (e.g. "mission-1"). */
  mission: string | null
  /** Locale hint ("zh-Hans" / "en"). Picked from KIDS_LOCALE or $LANG. */
  locale: "zh-Hans" | "en"
  /** Path to opencode binary so client can spawn `opencode serve`. */
  opencodeBin: string
  /** Path to ~/.config/kids-opencode/ for audit buffer + future state. */
  configDir: string
  /** When true, the client renders a "Tony banner" / suppresses interactive prompts (CI). */
  noBanner: boolean
}

export function readEnv(): KidsClientEnv {
  const password = process.env.OPENCODE_SERVER_PASSWORD ?? ""
  const lang = process.env.KIDS_LOCALE ?? process.env.LANG ?? "en"
  const locale: "zh-Hans" | "en" = lang.toLowerCase().startsWith("zh") ? "zh-Hans" : "en"
  return {
    opencodeBaseUrl: process.env.OPENCODE_BASE_URL ?? "http://127.0.0.1:4096",
    opencodeServerPassword: password,
    deeprouterApiKey: process.env.DEEPROUTER_API_KEY ?? "",
    bypassGateway: process.env.KIDS_LLM_BYPASS_GATEWAY === "1",
    coursePack: process.env.KIDS_COURSE_PACK || null,
    mission: process.env.KIDS_MISSION || null,
    locale,
    opencodeBin: process.env.OPENCODE_BIN ?? "opencode",
    configDir: process.env.KIDS_OPENCODE_CONFIG_DIR ?? join(homedir(), ".config", "kids-opencode"),
    noBanner: process.env.KIDS_OPENCODE_NO_BANNER === "1",
  }
}

export function validateEnv(env: KidsClientEnv): { ok: true } | { ok: false; reason: string; variant: "config_missing" | "auth_failed" | "needs_setup" } {
  if (!env.opencodeServerPassword) {
    return {
      ok: false,
      reason: "OPENCODE_SERVER_PASSWORD is empty. The wrapper should have loaded it from " + join(env.configDir, "server-password"),
      variant: "config_missing",
    }
  }
  // Accept any supported provider's API key, not just DeepRouter. The
  // setup wizard writes whatever the parent picked into ~/.config/kids-opencode/env
  // which the wrapper sources before exec.
  //
  // KIDS_OAUTH_PROVIDER was previously trusted as a credential signal —
  // that was wrong: upstream opencode dropped Anthropic Pro/Max OAuth in
  // 1.3.0, so the marker existed without a real credential and opencode
  // silently fell back to its own api-key picker. Users now get re-routed
  // through SetupScreen until they paste an actual API key.
  const hasAnyKey =
    env.deeprouterApiKey
    || process.env.ANTHROPIC_API_KEY
    || process.env.OPENAI_API_KEY
  if (!env.bypassGateway && !hasAnyKey) {
    return {
      ok: false,
      reason: "No LLM provider key found. The first-run setup wizard will walk you through this.",
      variant: "needs_setup",
    }
  }
  return { ok: true }
}
