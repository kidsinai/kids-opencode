/**
 * First-run setup wizard backend.
 *
 * Writes:
 *   ~/.config/kids-opencode/env          (KEY=value, chmod 600)
 *   ~/.config/kids-opencode/opencode.json (provider + model rewritten)
 *
 * The env file is sourced by bin/kids-opencode before exec'ing
 * kids-client, so the LLM key becomes available to the AI engine
 * (which reads it via opencode.json's `{env:NAME}` interpolation) without
 * polluting the user's shell rc.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, chmodSync } from "node:fs"
import { dirname, join } from "node:path"

export type ProviderId = "anthropic" | "openai" | "deeprouter"

/**
 * Wire protocol between SetupScreen and bin/kids-opencode wrapper:
 * kids-client exits with this code to ask the wrapper to run
 * `opencode auth login --provider <p>` (interactive OAuth that needs the
 * TTY), then re-exec kids-client. See bin/kids-opencode §11 loop.
 */
export const OAUTH_HANDOFF_EXIT_CODE = 123

/**
 * Providers for which upstream opencode currently ships an OAuth/subscription
 * login method. Anthropic Pro/Max was REMOVED in opencode 1.3.0 — Anthropic's
 * ToS prohibits using consumer Claude Pro/Max subscriptions through coding
 * agents like opencode. See:
 *   ~/Documents/sites/kidsinai/opencode-kernel/packages/web/src/content/docs/providers.mdx
 *
 * OpenAI ChatGPT Plus IS supported by upstream and is the obvious next
 * candidate to wire here — but until that's done, no provider triggers the
 * auth_choice step and every kid lands directly on the api-key screen.
 *
 * The OAuth handoff infrastructure below (OAUTH_HANDOFF_EXIT_CODE,
 * saveSetupOauth, the wrapper's exit-123 loop, the auth_choice screen) is
 * intentionally kept inert rather than deleted — flipping OPENAI back on
 * here when ChatGPT Plus is wired is a one-line revival.
 */
export const OAUTH_PROVIDERS: ReadonlyArray<ProviderId> = [] as const

export interface ProviderChoice {
  id: ProviderId
  label: string
  hint: string
  envVar: string
  apiKeyUrl: string
  /** opencode.json provider block to use. apiKey defaults to "{env:<envVar>}". */
  config: (envVar: string) => Record<string, unknown>
  /** Default model id for this provider. */
  defaultModel: string
}

export const PROVIDERS: ProviderChoice[] = [
  {
    id: "anthropic",
    label: "Anthropic Claude (recommended)",
    hint: "Best for ages 12+. ~$5/month for typical kid use.",
    envVar: "ANTHROPIC_API_KEY",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    config: (env) => ({
      anthropic: { apiKey: `{env:${env}}` },
    }),
    defaultModel: "anthropic/claude-3-5-sonnet-20241022",
  },
  {
    id: "openai",
    label: "OpenAI GPT-4",
    hint: "Also works. ~$5-10/month for typical kid use.",
    envVar: "OPENAI_API_KEY",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    config: (env) => ({
      openai: { apiKey: `{env:${env}}` },
    }),
    defaultModel: "openai/gpt-4o",
  },
  {
    id: "deeprouter",
    label: "DeepRouter (OpenAI-compatible gateway)",
    hint: "Cheaper than going direct + one key for all models (Anthropic, OpenAI, Google). Built-in kid-safe filters (NSFW + prompt-injection guard). Limited beta — invite-only.",
    envVar: "DEEPROUTER_API_KEY",
    apiKeyUrl: "https://deeprouter.ai/",
    config: (env) => ({
      deeprouter: {
        type: "openai-compatible",
        baseURL: "https://api.deeprouter.ai/v1",
        apiKey: `{env:${env}}`,
      },
    }),
    defaultModel: "deeprouter/claude-3-5-sonnet",
  },
]

export function findProvider(id: ProviderId): ProviderChoice {
  const p = PROVIDERS.find((p) => p.id === id)
  if (!p) throw new Error(`unknown provider: ${id}`)
  return p
}

export interface SaveOptions {
  configDir: string
  provider: ProviderId
  apiKey: string
}

/**
 * Persist the user's choice. Idempotent — re-running overwrites with the
 * latest. The env file is line-based KEY=value; we preserve unrelated
 * lines so multi-provider setups don't lose state.
 */
export function saveSetup(opts: SaveOptions): void {
  const provider = findProvider(opts.provider)
  ensureConfigDir(opts.configDir)

  // 1. Write the env file with the provider's key.
  const envPath = join(opts.configDir, "env")
  const existing = readEnvFile(envPath)
  existing[provider.envVar] = opts.apiKey
  // If the user previously chose OAuth and is now switching to API key, drop
  // the marker so validateEnv doesn't keep routing through OAuth handoff.
  delete existing.KIDS_OAUTH_PROVIDER
  writeEnvFile(envPath, existing)

  // 2. Rewrite opencode.json provider section.
  writeOpencodeConfig(opts.configDir, provider, { withApiKey: true })
}

export interface SaveOauthOptions {
  configDir: string
  provider: ProviderId
}

/**
 * Stage the OAuth handoff. We write opencode.json without an apiKey block
 * (opencode reads OAuth tokens from its own auth.json), drop any stale
 * provider API keys, and write a KIDS_OAUTH_PROVIDER marker so the
 * wrapper knows which provider to log into. The actual
 * `opencode auth login --provider <p>` invocation happens in
 * bin/kids-opencode after kids-client exits with OAUTH_HANDOFF_EXIT_CODE.
 */
export function saveSetupOauth(opts: SaveOauthOptions): void {
  const provider = findProvider(opts.provider)
  ensureConfigDir(opts.configDir)

  // 1. Update env file: clear this provider's API key (avoid stale leakage),
  //    set marker pointing at the OAuth provider.
  const envPath = join(opts.configDir, "env")
  const existing = readEnvFile(envPath)
  delete existing[provider.envVar]
  existing.KIDS_OAUTH_PROVIDER = opts.provider
  writeEnvFile(envPath, existing)

  // 2. opencode.json without apiKey — opencode uses its auth.json store.
  writeOpencodeConfig(opts.configDir, provider, { withApiKey: false })
}

function writeOpencodeConfig(
  configDir: string,
  provider: ProviderChoice,
  flags: { withApiKey: boolean },
): void {
  const configPath = join(configDir, "opencode.json")
  const config = readJsonOrEmpty(configPath)
  config.provider = flags.withApiKey
    ? provider.config(provider.envVar)
    : { [provider.id]: {} }
  config.model = provider.defaultModel
  if (!config.permission) {
    config.permission = {
      default: "ask",
      tools: { read: "ask", write: "ask", edit: "ask", glob: "ask", grep: "ask", webfetch: "ask" },
    }
  }
  if (!config.agent) {
    config.agent = { tools: ["read", "write", "edit", "glob", "grep", "webfetch"] }
  }
  if (!Array.isArray(config.plugin)) {
    config.plugin = ["@kidsinai/kids-opencode-plugin"]
  }
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf8")
  chmodSync(configPath, 0o600)
}

/** True if the user already has a valid key for any supported provider. */
export function hasAnyProviderKey(configDir: string): boolean {
  const env = readEnvFile(join(configDir, "env"))
  if (env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY || env.DEEPROUTER_API_KEY) return true
  // Also accept keys present in the parent shell env (advanced users).
  return !!(
    process.env.ANTHROPIC_API_KEY
    || process.env.OPENAI_API_KEY
    || process.env.DEEPROUTER_API_KEY
  )
  // Note: KIDS_OAUTH_PROVIDER marker is intentionally NOT accepted anymore.
  // Users who got stuck with the marker but no actual OAuth credential
  // (because opencode never had an Anthropic Pro/Max method to begin with)
  // will be routed back through SetupScreen to pick an API-key flow.
}

/** Crude check of API key shape — refuses obvious typos. */
export function looksLikeApiKey(provider: ProviderId, key: string): boolean {
  const trimmed = key.trim()
  if (trimmed.length < 20) return false
  switch (provider) {
    case "anthropic":  return trimmed.startsWith("sk-ant-")
    case "openai":     return trimmed.startsWith("sk-") || trimmed.startsWith("sk-proj-")
    case "deeprouter": return trimmed.length >= 24
  }
}

// ─── internals ────────────────────────────────────────────────────────────

function ensureConfigDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  try { chmodSync(dir, 0o700) } catch { /* not fatal */ }
}

function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {}
  const out: Record<string, string> = {}
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    out[key] = value
  }
  return out
}

function writeEnvFile(path: string, vars: Record<string, string>): void {
  ensureConfigDir(dirname(path))
  const lines: string[] = [
    "# Generated by kids-opencode setup wizard. Edit at your own risk.",
    "# The wrapper sources this file before launching the AI engine.",
  ]
  for (const [k, v] of Object.entries(vars)) {
    lines.push(`${k}="${v}"`)
  }
  writeFileSync(path, lines.join("\n") + "\n", "utf8")
  try { chmodSync(path, 0o600) } catch { /* not fatal */ }
}

function readJsonOrEmpty(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>
  } catch {
    return {}
  }
}
