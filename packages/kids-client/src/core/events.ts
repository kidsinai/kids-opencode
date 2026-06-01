/**
 * SSE subscriber over `client.global.event()`.
 *
 * Handles:
 * - automatic reconnect on disconnect (5s back-off, max ten retries before
 *   surfacing serve_unreachable to the store)
 * - dispatch of the discriminated union GlobalEvent.payload to per-type
 *   handlers
 * - graceful shutdown via AbortSignal
 *
 * The actual `client.global.event()` return shape is an async iterable
 * of GlobalEvent. We narrow on `payload.type`. See
 * `~/Documents/sites/kidsinai/opencode-kernel/packages/sdk/js/src/v2/types.gen.ts`
 * for the full union.
 */

import type { OpencodeClient } from "./connection.ts"

export type EventHandlers = {
  onSessionCreated?: (e: { sessionID: string }) => void
  onMessagePartDelta?: (e: { sessionID: string; messageID: string; partID: string; delta: string }) => void
  onTextEnded?: (e: { sessionID: string; messageID: string }) => void
  onPermissionAsked?: (e: { requestID: string; sessionID: string; tool?: string; metadata?: Record<string, unknown> }) => void
  onLlmError?: (e: { message: string }) => void
  onCompactionEnded?: () => void
  onUnknown?: (type: string, payload: unknown) => void
  /** Fires when the SSE loop fails too many times in a row. */
  onDisconnected?: (reason: string) => void
  /** Fires once when reconnected after at least one failure. */
  onReconnected?: () => void
}

export class EventSubscriber {
  private client: OpencodeClient
  private handlers: EventHandlers
  private abort: AbortController
  private retries = 0
  private readonly MAX_RETRIES = 10

  constructor(client: OpencodeClient, handlers: EventHandlers) {
    this.client = client
    this.handlers = handlers
    this.abort = new AbortController()
  }

  /** Start the subscription loop. Resolves only when the loop exits. */
  async run(): Promise<void> {
    while (!this.abort.signal.aborted) {
      try {
        await this.consume()
        // SSE stream ended cleanly (server-side); loop reconnects.
        await this.sleep(1000)
      } catch (err) {
        if (this.abort.signal.aborted) return
        this.retries++
        if (this.retries > this.MAX_RETRIES) {
          this.handlers.onDisconnected?.(`event stream failed ${this.retries} times: ${stringifyErr(err)}`)
          return
        }
        await this.sleep(5000)
      }
    }
  }

  stop(): void {
    this.abort.abort()
  }

  private dbg(message: string, fields?: Record<string, unknown>): void {
    // Lazy require to avoid a hard dep cycle if debug.ts grows imports.
    try {
      const { debug } = require("./debug.ts") as { debug: (m: string, f?: Record<string, unknown>) => void }
      debug(`[events] ${message}`, fields)
    } catch { /* never let logging block events */ }
  }

  private async consume(): Promise<void> {
    // The SDK exposes the SSE stream via client.global.event(). The shape
    // has changed across SDK versions:
    //   • old: event() returns an AsyncIterable directly
    //   • new (>=1.14.51): event() returns Promise<{ stream: AsyncGenerator }>
    // Handle both. The error "undefined is not a function (near '...raw of
    // stream...')" came from `for await`-ing a Promise (the new shape) under
    // the old code path.
    const eventApi = (this.client as unknown as { global?: { event: (...a: unknown[]) => unknown } }).global
    if (!eventApi || typeof eventApi.event !== "function") {
      throw new Error("@opencode-ai/sdk/v2: client.global.event() not available — SDK version drift")
    }
    this.dbg("consume: calling event()")
    const result = await Promise.resolve(eventApi.event())
    this.dbg("consume: event() returned", { shape: describeShape(result) })
    const iterable = pickAsyncIterable(result)
    if (!iterable) {
      throw new Error(`@opencode-ai/sdk/v2: client.global.event() returned an unrecognised shape: ${describeShape(result)}`)
    }
    this.dbg("consume: got iterable, awaiting SSE events…")
    for await (const raw of iterable) {
      if (this.abort.signal.aborted) return
      if (this.retries > 0) {
        this.retries = 0
        this.handlers.onReconnected?.()
      }
      this.dbg("consume: raw event", { preview: previewRaw(raw) })
      this.dispatch(raw)
    }
    this.dbg("consume: iterable ended")
  }

  private dispatch(raw: unknown): void {
    // The SDK shape evolved over the 1.14.x line. Yielded events arrive as:
    //   • { payload: { type, properties: { … } } }   (current — 1.14.51 GlobalEvent)
    //   • { payload: { type, …flatfields } }         (older — flat fields on payload)
    //   • { type, properties: { … } }                (some intermediate releases)
    //   • { type, …flatfields }                      (oldest)
    //   • { data: { type, …. } }                     (StreamEvent helper wrapper)
    //
    // CRITICAL: the current 1.14.51 GlobalEvent puts event fields
    // (sessionID, messageID, delta, …) under .payload.properties, NOT
    // directly on .payload. The previous code read .payload.sessionID
    // (always undefined), so deltas were silently dropped and the
    // "thinking" indicator never cleared. This split + the
    // `props ?? payload` fallback handle both layouts uniformly.
    const e = raw as { payload?: Record<string, unknown>; data?: Record<string, unknown>; type?: string } & Record<string, unknown>
    const payload: ({ type?: string; properties?: Record<string, unknown> } & Record<string, unknown>) | null =
      (e?.payload && typeof e.payload === "object") ? (e.payload as { type?: string; properties?: Record<string, unknown> } & Record<string, unknown>)
      : (e?.data && typeof e.data === "object" && typeof (e.data as { type?: unknown }).type === "string") ? (e.data as { type?: string; properties?: Record<string, unknown> } & Record<string, unknown>)
      : (typeof e?.type === "string") ? (e as { type?: string; properties?: Record<string, unknown> } & Record<string, unknown>)
      : null
    if (!payload || typeof payload.type !== "string") return
    let t = payload.type
    // Where the actual event fields live: `.properties` (Event* legacy shape)
    // OR `.data` (SyncEvent* shape) OR flat on payload (oldest).
    let props: Record<string, unknown> = (payload.properties && typeof payload.properties === "object")
      ? payload.properties as Record<string, unknown>
      : payload
    // 1.14.51 Sync events: type="sync", real event name in .name with a
    // version suffix like ".1", fields under .data. Without this normalize,
    // our switch never matches and streaming text events drop on the floor
    // (kid sees "thinking..." forever).
    if (t === "sync" && typeof (payload as { name?: unknown }).name === "string") {
      t = String((payload as { name: string }).name).replace(/\.\d+$/, "")
      const dataField = (payload as { data?: unknown }).data
      if (dataField && typeof dataField === "object") {
        props = dataField as Record<string, unknown>
      }
    }
    switch (t) {
      case "session.created":
      case "session.next.session.created":
        this.handlers.onSessionCreated?.({ sessionID: String(props.sessionID ?? "") })
        return
      case "message.part.delta": {
        const messageID = String(props.messageID ?? "")
        const partID = String(props.partID ?? "")
        const sessionID = String(props.sessionID ?? "")
        const delta = String((props.delta as { text?: string } | undefined)?.text ?? props.delta ?? "")
        if (delta) this.handlers.onMessagePartDelta?.({ sessionID, messageID, partID, delta })
        return
      }
      case "session.next.text.delta": {
        const messageID = String(props.messageID ?? "")
        const partID = String(props.partID ?? "stream")
        const sessionID = String(props.sessionID ?? "")
        const delta = String(props.delta ?? "")
        if (delta) this.handlers.onMessagePartDelta?.({ sessionID, messageID, partID, delta })
        return
      }
      case "session.next.text.ended": {
        const messageID = String(props.messageID ?? "")
        const sessionID = String(props.sessionID ?? "")
        this.handlers.onTextEnded?.({ sessionID, messageID })
        return
      }
      case "permission.asked":
      case "session.next.permission.asked": {
        const requestID = String(props.requestID ?? props.id ?? "")
        const sessionID = String(props.sessionID ?? "")
        this.handlers.onPermissionAsked?.({
          requestID,
          sessionID,
          tool: props.tool as string | undefined,
          metadata: props.metadata as Record<string, unknown> | undefined,
        })
        return
      }
      case "session.error":
      case "llm.error": {
        const message = String((props.error as { message?: string } | undefined)?.message ?? props.message ?? "unknown LLM error")
        this.handlers.onLlmError?.({ message })
        return
      }
      case "session.next.compaction.ended":
        this.handlers.onCompactionEnded?.()
        return
      default:
        this.handlers.onUnknown?.(t, payload)
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, ms)
      this.abort.signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer)
          resolve()
        },
        { once: true },
      )
    })
  }
}

function stringifyErr(err: unknown): string {
  if (err instanceof Error) return err.message
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

/**
 * The SDK has shipped at least three event() return shapes over its 1.14.x
 * line. Find the AsyncIterable in whichever shape we got, or null if none.
 */
function pickAsyncIterable(value: unknown): AsyncIterable<unknown> | null {
  if (!value) return null
  // Shape 1: the value IS the iterable.
  if (typeof (value as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] === "function") {
    return value as AsyncIterable<unknown>
  }
  // Shape 2: { stream: AsyncGenerator } — the >=1.14.51 ServerSentEventsResult.
  const s = (value as { stream?: unknown }).stream
  if (s && typeof (s as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] === "function") {
    return s as AsyncIterable<unknown>
  }
  // Shape 3: { data: { stream: ... } } — wrapped data envelope.
  const d = (value as { data?: { stream?: unknown } }).data
  if (d && typeof d === "object") {
    const inner = (d as { stream?: unknown }).stream
    if (inner && typeof (inner as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] === "function") {
      return inner as AsyncIterable<unknown>
    }
  }
  return null
}

function describeShape(value: unknown): string {
  if (value == null) return String(value)
  if (typeof value !== "object") return typeof value
  return `object keys=[${Object.keys(value as object).join(",")}]`
}

function previewRaw(raw: unknown): string {
  try {
    const s = JSON.stringify(raw)
    return s.length > 220 ? s.slice(0, 220) + "…" : s
  } catch {
    return describeShape(raw)
  }
}
