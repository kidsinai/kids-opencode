/**
 * Flatten the server's provider/model list into kid-friendly choices for the
 * `/model` picker. Duck-typed and defensive: opencode's provider list shape has
 * shifted across versions and a missing/!errored endpoint must degrade to an
 * empty list (the picker shows a friendly "no models" note) rather than crash.
 */

import type { OpencodeClient } from "./connection.ts"
import type { ModelChoice } from "./store.ts"

const MAX_MODELS = 40

export async function listModels(client: OpencodeClient): Promise<ModelChoice[]> {
  const api = client as unknown as {
    provider?: { list?: () => Promise<unknown> }
    config?: { providers?: () => Promise<unknown> }
  }
  let raw: unknown
  try {
    // Prefer config.providers: it returns the configured/usable providers as
    // { providers:[{id,models:[…]}], default } which flattenModels understands.
    // provider.list returns the full models.dev catalog in a different shape
    // ({ all, connected, default }) that flattens to 0 — that mismatch was why
    // the /model picker showed "No models available". Verified vs serve 1.15.x.
    if (typeof api.config?.providers === "function") raw = await api.config.providers()
    else if (typeof api.provider?.list === "function") raw = await api.provider.list()
    else return []
  } catch {
    return []
  }
  return flattenModels(raw).slice(0, MAX_MODELS)
}

export function flattenModels(raw: unknown): ModelChoice[] {
  const providers = pickProviders(raw)
  const out: ModelChoice[] = []
  const seen = new Set<string>()
  for (const p of providers) {
    const prov = p as { id?: string; name?: string; models?: unknown }
    const pid = prov.id ?? ""
    const pname = prov.name ?? pid
    for (const m of pickModels(prov.models)) {
      const mod = m as { id?: string; name?: string }
      const mid = mod.id ?? ""
      if (!pid || !mid) continue
      const fullId = `${pid}/${mid}`
      if (seen.has(fullId)) continue
      seen.add(fullId)
      const mname = mod.name ?? mid
      out.push({ id: fullId, label: pname ? `${mname} · ${pname}` : mname })
    }
  }
  return out
}

function pickProviders(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === "object") {
    const o = raw as { providers?: unknown; data?: { providers?: unknown } }
    if (Array.isArray(o.providers)) return o.providers
    if (Array.isArray(o.data?.providers)) return o.data!.providers as unknown[]
  }
  return []
}

function pickModels(models: unknown): unknown[] {
  if (Array.isArray(models)) return models
  // Most shapes use a Record<modelId, Model> map.
  if (models && typeof models === "object") return Object.values(models)
  return []
}

/** True when an LLM error is about the *model itself* (not auth/network) — e.g.
 *  a model the current ChatGPT-account auth isn't allowed to use. The fix is to
 *  switch models, so callers should re-pick rather than retry or re-auth. */
export function isModelUnavailable(msg: string): boolean {
  const m = msg.toLowerCase()
  return m.includes("not supported")
    || m.includes("model_not_found")
    || m.includes("does not have access")
    || m.includes("not available")
    || m.includes("unsupported model")
}

/** Pick a kid-safe default model: prefer the small/standard tiers that work
 *  with ChatGPT-account auth; skip the `-pro` tiers (API-key only, rejected by
 *  the Codex/OAuth path). Returns null only if the server reports no models. */
export function pickDefaultModel(models: ModelChoice[]): ModelChoice | null {
  const usable = models.filter((m) => !/-pro\b/i.test(m.id))
  const prefer = ["gpt-5.4-mini", "gpt-5.4", "claude-3-5-sonnet", "sonnet", "gpt-5.5"]
  for (const p of prefer) {
    const hit = usable.find((m) => m.id.toLowerCase().includes(p))
    if (hit) return hit
  }
  return usable[0] ?? models[0] ?? null
}
