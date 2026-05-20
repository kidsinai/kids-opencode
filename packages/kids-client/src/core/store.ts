/**
 * In-process state store. Pure TS, no Ink imports — V1 Tauri (WebView)
 * reuses this verbatim.
 *
 * Subscription pattern: dumb pub/sub. Renderers (Ink today, WebView later)
 * subscribe to changes via getSnapshot + subscribe pair, suitable for
 * React 18 useSyncExternalStore.
 */

export type Screen =
  | { kind: "loading"; message?: string }
  | { kind: "setup" }
  | { kind: "tour" }
  | { kind: "startup" }
  | { kind: "mission" }
  | { kind: "help" }
  | { kind: "course_picker" }
  | {
      kind: "mission_complete"
      missionId: string
      missionTitle: string | null
      passed: number
      total: number
      completionMessage: string
      hasNextMission: boolean
    }
  | { kind: "error"; variant: ErrorVariant; detail?: string }

export type ErrorVariant =
  | "serve_unreachable"
  | "port_taken"
  | "network_down"
  | "stars_exhausted"
  | "auth_failed"
  | "config_missing"
  | "ai_hung"

export interface ChatMessage {
  id: string
  actor: "kid" | "agent" | "system"
  text: string
  /** Stream still flowing for this message. */
  streaming: boolean
  ts: number
}

export interface PendingPermission {
  requestID: string
  tool?: string
  /** Free-form text the kid sees ("AI 想要读取 index.html") */
  summary: string
  metadata: Record<string, unknown>
  /** Plugin-reported predicted Stars cost for this tool call. */
  starsEstimated?: number
}

export interface DangerousTopic {
  category: "self_harm" | "violence" | "adult" | "other"
  snippet: string
}

export interface ToastState {
  kind: "info" | "warn" | "success"
  text: string
}

export interface KidsClientState {
  screen: Screen
  sessionId: string | null
  messages: ChatMessage[]
  starsBalance: number
  starsBudget: number
  pendingPermission: PendingPermission | null
  dangerousTopic: DangerousTopic | null
  thinking: boolean
  /** Set when wrapper passed --course or KIDS_COURSE_PACK. */
  coursePack: string | null
  mission: string | null
  /** Resolved from CoursePack metadata. null in free-play. */
  packTitle: string | null
  missionTitle: string | null
  /** 1-based current mission index within pack.missions; null in free-play. */
  missionIndex: number | null
  missionTotal: number | null
  /** Transient toast (auto-dismisses after a few seconds in the orchestrator). */
  toast: ToastState | null
  /** Plugin emitted audit events kept for parent dashboard sync (capped). */
  auditBuffer: unknown[]
}

type Listener = (state: KidsClientState) => void

const INITIAL: KidsClientState = {
  screen: { kind: "loading" },
  sessionId: null,
  messages: [],
  starsBalance: 0,
  starsBudget: 0,
  pendingPermission: null,
  dangerousTopic: null,
  thinking: false,
  coursePack: null,
  mission: null,
  packTitle: null,
  missionTitle: null,
  missionIndex: null,
  missionTotal: null,
  toast: null,
  auditBuffer: [],
}

const AUDIT_BUFFER_CAP = 500

export class Store {
  private state: KidsClientState = INITIAL
  private listeners = new Set<Listener>()

  getSnapshot(): KidsClientState {
    return this.state
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  update(patch: Partial<KidsClientState>): void {
    this.state = { ...this.state, ...patch }
    this.notify()
  }

  appendMessage(msg: ChatMessage): void {
    this.state = { ...this.state, messages: [...this.state.messages, msg] }
    this.notify()
  }

  appendDelta(messageId: string, delta: string): void {
    const messages = this.state.messages.map((m) =>
      m.id === messageId ? { ...m, text: m.text + delta } : m,
    )
    this.state = { ...this.state, messages }
    this.notify()
  }

  endStream(messageId: string): void {
    const messages = this.state.messages.map((m) =>
      m.id === messageId ? { ...m, streaming: false } : m,
    )
    this.state = { ...this.state, messages, thinking: false }
    this.notify()
  }

  pushAudit(event: unknown): void {
    const next = [...this.state.auditBuffer, event]
    if (next.length > AUDIT_BUFFER_CAP) next.shift()
    this.state = { ...this.state, auditBuffer: next }
    this.notify()
  }

  reset(): void {
    this.state = INITIAL
    this.notify()
  }

  private notify(): void {
    for (const fn of this.listeners) fn(this.state)
  }
}
