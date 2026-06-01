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
    const result = await Promise.resolve(eventApi.event())
    const iterable = pickAsyncIterable(result)
    if (!iterable) {
      throw new Error(`@opencode-ai/sdk/v2: client.global.event() returned an unrecognised shape: ${describeShape(result)}`)
    }
    for await (const raw of iterable) {
      if (this.abort.signal.aborted) return
      if (this.retries > 0) {
        this.retries = 0
        this.handlers.onReconnected?.()
      }
      this.dispatch(raw)
    }
  }

  private dispatch(raw: unknown): void {
    // Across SDK versions an event is either:
    //   • { payload: { type, …fields } }            (older shape)
    //   • { type, …fields }                          (newer shape — yielded
    //                                                  directly by the
    //                                                  AsyncGenerator)
    //   • { data: { type, …fields } } (StreamEvent wrapper from some helpers)
    // Unwrap to a single `payload` view so the switch below stays the same.
    const e = raw as { payload?: Record<string, unknown>; data?: Record<string, unknown>; type?: string } & Record<string, unknown>
    const payload: ({ type?: string } & Record<string, unknown>) | null =
      (e?.payload && typeof e.payload === "object") ? (e.payload as { type?: string } & Record<string, unknown>)
      : (e?.data && typeof e.data === "object" && typeof (e.data as { type?: unknown }).type === "string") ? (e.data as { type?: string } & Record<string, unknown>)
      : (typeof e?.type === "string") ? (e as { type?: string } & Record<string, unknown>)
      : null
    if (!payload || typeof payload.type !== "string") return
    const t = payload.type
    switch (t) {
      case "session.created":
      case "session.next.session.created":
        this.handlers.onSessionCreated?.({ sessionID: String(payload.sessionID ?? "") })
        return
      case "message.part.delta": {
        const messageID = String(payload.messageID ?? "")
        const partID = String(payload.partID ?? "")
        const sessionID = String(payload.sessionID ?? "")
        const delta = String((payload.delta as { text?: string } | undefined)?.text ?? payload.delta ?? "")
        if (delta) this.handlers.onMessagePartDelta?.({ sessionID, messageID, partID, delta })
        return
      }
      case "session.next.text.delta": {
        const messageID = String(payload.messageID ?? "")
        const partID = String(payload.partID ?? "stream")
        const sessionID = String(payload.sessionID ?? "")
        const delta = String(payload.delta ?? "")
        if (delta) this.handlers.onMessagePartDelta?.({ sessionID, messageID, partID, delta })
        return
      }
      case "session.next.text.ended": {
        const messageID = String(payload.messageID ?? "")
        const sessionID = String(payload.sessionID ?? "")
        this.handlers.onTextEnded?.({ sessionID, messageID })
        return
      }
      case "permission.asked":
      case "session.next.permission.asked": {
        const requestID = String(payload.requestID ?? payload.id ?? "")
        const sessionID = String(payload.sessionID ?? "")
        this.handlers.onPermissionAsked?.({
          requestID,
          sessionID,
          tool: payload.tool as string | undefined,
          metadata: payload.metadata as Record<string, unknown> | undefined,
        })
        return
      }
      case "session.error":
      case "llm.error": {
        const message = String((payload.error as { message?: string } | undefined)?.message ?? payload.message ?? "unknown LLM error")
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
