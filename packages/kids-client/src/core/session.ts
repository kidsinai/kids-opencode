/**
 * Session lifecycle wrapper. Thin shim around SDK v2 session resource.
 *
 * Public API:
 * - createSession(): create a new session, return its ID
 * - prompt(text): send a kid message; returns immediately (SSE delivers stream)
 * - abort(): stop the in-flight prompt; session stays live
 *
 * Errors propagate to caller; UI maps to ErrorScreen variants.
 */

import type { OpencodeClient } from "./connection.ts"
import type { SessionSummary, ChatMessage } from "./store.ts"
import { debug } from "./debug.ts"

/**
 * SDK 1.14.x default is `ThrowOnError=false` which returns the discriminated
 * union { data, error }. If we don't inspect `.error`, auth / 4xx / 5xx
 * responses are silently swallowed and the kid sees "thinking…" forever.
 * Pass this options object to every call so the SDK throws and the
 * orchestrator's existing try/catch can surface the error on ErrorScreen.
 */
const SDK_THROW: { throwOnError: true } = { throwOnError: true }

export class SessionManager {
  private client: OpencodeClient
  private currentSessionId: string | null = null

  constructor(client: OpencodeClient) {
    this.client = client
  }

  getId(): string | null {
    return this.currentSessionId
  }

  /** Forget the current session so the next prompt() opens a fresh one. */
  reset(): void {
    this.currentSessionId = null
  }

  /** List past sessions (for the `/sessions` picker). Newest-ish first. */
  async list(): Promise<SessionSummary[]> {
    const api = (this.client as unknown as { session?: { list?: () => Promise<unknown> } }).session
    if (!api?.list) return []
    const raw = await api.list()
    const arr = unwrapArray(raw)
    return arr
      .map((s) => {
        const o = s as { id?: string; title?: string }
        if (!o?.id) return null
        return { id: o.id, title: (o.title ?? "").trim() || o.id }
      })
      .filter((s): s is SessionSummary => s !== null)
  }

  /** Continue an existing session: subsequent prompt()s append to it. */
  switchTo(sessionID: string): void {
    this.currentSessionId = sessionID
  }

  /**
   * Load a past session's transcript as ChatMessages (for `/sessions`
   * rehydration) AND make it current. user → kid, assistant → agent (text parts
   * joined); tool/reasoning/control messages are skipped. Defensive: an
   * unavailable endpoint just yields an empty transcript.
   */
  async loadMessages(sessionID: string): Promise<ChatMessage[]> {
    this.currentSessionId = sessionID
    const api = (this.client as unknown as { session?: { messages?: (p: unknown) => Promise<unknown> } }).session
    if (typeof api?.messages !== "function") return []
    let raw: unknown
    try {
      raw = await api.messages({ sessionID, order: "asc", limit: 200 })
    } catch {
      return []
    }
    return unwrapItems(raw).map(mapServerMessage).filter((m): m is ChatMessage => m !== null)
  }

  /** Compress a long session server-side (the `/compact` command). */
  async compact(): Promise<void> {
    if (!this.currentSessionId) return
    const api = (this.client as unknown as { session?: { compact?: (p: unknown, o?: unknown) => Promise<unknown> } }).session
    if (typeof api?.compact !== "function") throw new Error("SDK: session.compact unavailable")
    await api.compact({ sessionID: this.currentSessionId }, SDK_THROW)
  }

  async create(): Promise<string> {
    const api = (this.client as unknown as { session?: { create: (input?: unknown, options?: unknown) => Promise<{ data?: { id?: string } } | { id?: string } | string> } }).session
    if (!api?.create) throw new Error("SDK v2: client.session.create unavailable")
    debug("session.create: calling SDK")
    const result = await api.create({}, SDK_THROW)
    debug("session.create: result shape", { keys: result && typeof result === "object" ? Object.keys(result) : typeof result })
    const id = extractId(result)
    if (!id) throw new Error("SDK v2 session.create returned no id")
    this.currentSessionId = id
    debug("session.create: id", { id })
    return id
  }

  async prompt(text: string, opts?: { model?: string; agent?: string }): Promise<void> {
    if (!this.currentSessionId) await this.create()
    const sessionID = this.currentSessionId!
    const api = (this.client as unknown as { session?: { prompt: (parameters: unknown, options?: unknown) => Promise<unknown> } }).session
    if (!api?.prompt) throw new Error("SDK v2: client.session.prompt unavailable")
    // SDK 1.14.51 signature: single parameters object, kid's text under .prompt.text.
    // Pass SDK_THROW so 4xx/5xx surface as exceptions instead of getting
    // silently swallowed (the bug behind the "thinking…" hang).
    // `model` (from the /model picker) is a "providerID/modelID" string; the SDK
    // wants it split into { providerID, modelID }.
    const model = splitModelId(opts?.model)
    const payload = {
      sessionID,
      prompt: { text },
      ...(model ? { model } : {}),
      ...(opts?.agent ? { agent: opts.agent } : {}),
    }
    debug("session.prompt: sending", { sessionID, textLen: text.length })
    try {
      const result = await api.prompt(payload, SDK_THROW)
      debug("session.prompt: SDK returned", { keys: result && typeof result === "object" ? Object.keys(result) : typeof result })
    } catch (err) {
      debug("session.prompt: SDK threw", { error: errMsg(err) })
      throw err
    }
  }

  async abort(): Promise<void> {
    if (!this.currentSessionId) return
    const api = (this.client as unknown as { session?: { abort: (parameters: unknown, options?: unknown) => Promise<unknown> } }).session
    if (!api?.abort) return
    debug("session.abort", { sessionID: this.currentSessionId })
    await api.abort({ sessionID: this.currentSessionId }, SDK_THROW)
  }
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`
  try { return JSON.stringify(err) } catch { return String(err) }
}

function extractId(result: unknown): string | null {
  if (typeof result === "string") return result
  if (result && typeof result === "object") {
    const r = result as { id?: string; data?: { id?: string } }
    return r.id ?? r.data?.id ?? null
  }
  return null
}

/**
 * Split a "providerID/modelID" id (as built by the /model picker) into the
 * shape the SDK prompt body wants. Splits on the FIRST slash so model ids that
 * themselves contain "/" survive. Returns undefined for empty/no input.
 */
function splitModelId(id: string | undefined): { providerID: string; modelID: string } | undefined {
  if (!id) return undefined
  const slash = id.indexOf("/")
  if (slash <= 0 || slash === id.length - 1) return undefined
  return { providerID: id.slice(0, slash), modelID: id.slice(slash + 1) }
}

/** session.messages returns `{ items }` or `{ data: { items } }`. */
function unwrapItems(result: unknown): unknown[] {
  if (result && typeof result === "object") {
    const r = result as { items?: unknown; data?: { items?: unknown } }
    if (Array.isArray(r.items)) return r.items
    if (Array.isArray(r.data?.items)) return r.data!.items as unknown[]
  }
  return []
}

/** Map a server SessionMessage to our ChatMessage; null = skip (tool/control). */
export function mapServerMessage(m: unknown): ChatMessage | null {
  if (!m || typeof m !== "object") return null
  const o = m as {
    id?: string
    type?: string
    text?: string
    content?: Array<{ type?: string; text?: string }>
    time?: { created?: number }
  }
  const id = o.id ?? `srv-${o.time?.created ?? 0}`
  const ts = typeof o.time?.created === "number" ? o.time.created : 0
  if (o.type === "user" && typeof o.text === "string") {
    return { id, actor: "kid", text: o.text, streaming: false, ts }
  }
  if (o.type === "assistant" && Array.isArray(o.content)) {
    const text = o.content
      .filter((p) => p?.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join("")
      .trim()
    if (!text) return null
    return { id, actor: "agent", text, streaming: false, ts }
  }
  return null
}

/** SDK list responses come back as `T[]` or `{ data: T[] }` across versions. */
function unwrapArray(result: unknown): unknown[] {
  if (Array.isArray(result)) return result
  if (result && typeof result === "object") {
    const d = (result as { data?: unknown }).data
    if (Array.isArray(d)) return d
  }
  return []
}
