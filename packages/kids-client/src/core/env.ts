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
  /**
   * HTTP Basic Auth *username* for serve. Defaults to "opencode" to match
   * upstream's `OPENCODE_SERVER_USERNAME` default (opencode-kernel
   * packages/opencode/src/server/auth.ts) — sending an empty username here
   * causes a 401 against opencode ≥1.x even when the password is correct.
   */
  opencodeServerUsername: string
  /** DeepRouter tenant key. May be empty when using BYOK bypass. */
  deeprouterApiKey: string
  /** True if the wrapper set KIDS_LLM_BYPASS_GATEWAY=1 (BYOK dogfood mode). */
  bypassGateway: boolean
  /** Optional course pack id (e.g. "portfolio-site"). */
  coursePack: string | null
  /** Optional mission id (e.g. "mission-1"). */
  mission: string | null
  /** Optional guided-flow vibe id picked by the kid (e.g. "space"). */
  vibeId: string | null
  /** Optional kid-chosen project name. Surfaced in scaffold template vars. */
  projectName: string | null
  /** Locale hint ("zh-Hans" / "en"). Picked from KIDS_LOCALE or $LANG. */
  locale: "zh-Hans" | "en"
  /** Path to opencode binary so client can spawn `opencode serve`. */
  opencodeBin: string
  /** Path to ~/.config/kids-opencode/ for audit buffer + future state. */
  configDir: string
  /** When true, the client renders a "Tony banner" / suppresses interactive prompts (CI). */
  noBanner: boolean
  /**
   * Airbotix Portal base URL — used by the [w] Wallet / Top-up shortcut to
   * deep-link parents into login + Airwallex top-up. Defaults to
   * https://app.airbotix.ai; staging overrides via AIRBOTIX_PORTAL_URL.
   */
  portalBaseUrl: string
}

export function readEnv(): KidsClientEnv {
  const password = process.env.OPENCODE_SERVER_PASSWORD ?? ""
  const lang = process.env.KIDS_LOCALE ?? process.env.LANG ?? "en"
  const locale: "zh-Hans" | "en" = lang.toLowerCase().startsWith("zh") ? "zh-Hans" : "en"
  return {
    opencodeBaseUrl: process.env.OPENCODE_BASE_URL ?? "http://127.0.0.1:4096",
    opencodeServerPassword: password,
    opencodeServerUsername: process.env.OPENCODE_SERVER_USERNAME || "opencode",
    deeprouterApiKey: process.env.DEEPROUTER_API_KEY ?? "",
    bypassGateway: process.env.KIDS_LLM_BYPASS_GATEWAY === "1",
    coursePack: process.env.KIDS_COURSE_PACK || null,
    mission: process.env.KIDS_MISSION || null,
    vibeId: process.env.KIDS_VIBE_ID || null,
    projectName: process.env.KIDS_PROJECT_NAME || null,
    locale,
    opencodeBin: process.env.OPENCODE_BIN ?? "opencode",
    configDir: process.env.KIDS_OPENCODE_CONFIG_DIR ?? join(homedir(), ".config", "kids-opencode"),
    noBanner: process.env.KIDS_OPENCODE_NO_BANNER === "1",
    portalBaseUrl: process.env.AIRBOTIX_PORTAL_URL || "https://app.airbotix.ai",
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
  // KIDS_OAUTH_PROVIDER signals that the wrapper finished
  // `opencode auth login` and opencode now holds an OAuth token in its
  // own auth.json store. Only trusted when paired with a provider opencode
  // actually supports OAuth for — Anthropic Pro/Max stale markers from
  // 0.0.7/0.0.8 are filtered out in hasAnyProviderKey via the
  // OAUTH_PROVIDERS check, but here at the env level we accept the bare
  // marker since validity will be re-checked by opencode at serve time.
  const hasAnyKey =
    env.deeprouterApiKey
    || process.env.ANTHROPIC_API_KEY
    || process.env.OPENAI_API_KEY
    || process.env.KIDS_OAUTH_PROVIDER
  if (!env.bypassGateway && !hasAnyKey) {
    return {
      ok: false,
      reason: "No LLM provider key found. The first-run setup wizard will walk you through this.",
      variant: "needs_setup",
    }
  }
  return { ok: true }
}
