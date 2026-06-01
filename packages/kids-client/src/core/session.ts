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
import type { SessionSummary } from "./store.ts"

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

  async create(): Promise<string> {
    const api = (this.client as unknown as { session?: { create: (input?: unknown) => Promise<{ data?: { id?: string } } | { id?: string } | string> } }).session
    if (!api?.create) throw new Error("SDK v2: client.session.create unavailable")
    const result = await api.create({})
    const id = extractId(result)
    if (!id) throw new Error("SDK v2 session.create returned no id")
    this.currentSessionId = id
    return id
  }

  async prompt(text: string, opts?: { model?: string; agent?: string }): Promise<void> {
    if (!this.currentSessionId) await this.create()
    const sessionID = this.currentSessionId!
    const api = (this.client as unknown as { session?: { prompt: (sessionID: string, body: unknown) => Promise<unknown> } }).session
    if (!api?.prompt) throw new Error("SDK v2: client.session.prompt unavailable")
    await api.prompt(sessionID, {
      parts: [{ type: "text", text }],
      model: opts?.model,
      agent: opts?.agent,
    })
  }

  async abort(): Promise<void> {
    if (!this.currentSessionId) return
    const api = (this.client as unknown as { session?: { abort: (sessionID: string) => Promise<unknown> } }).session
    if (!api?.abort) return
    await api.abort(this.currentSessionId)
  }
}

function extractId(result: unknown): string | null {
  if (typeof result === "string") return result
  if (result && typeof result === "object") {
    const r = result as { id?: string; data?: { id?: string } }
    return r.id ?? r.data?.id ?? null
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
