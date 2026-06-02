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
