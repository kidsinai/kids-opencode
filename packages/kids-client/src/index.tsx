/**
 * kids-client entry. Composes core/* and renders the Ink app.
 *
 * Boot sequence:
 *   1. readEnv()      — pull KIDS_* + OPENCODE_* from process.env
 *   2. validateEnv()  — hard-fail with ErrorScreen if password/key missing
 *   3. ServeManager.ensureReady() — spawn `opencode serve` if down, poll /app
 *   4. createKidsClient() — instantiate SDK v2 client w/ Basic Auth
 *   5. SessionManager — ready to prompt
 *   6. EventSubscriber.run() — SSE loop dispatches to store
 *   7. Ink render(<App />) — kid sees Startup screen
 *
 * Cleanup on SIGINT / SIGTERM: stop subscriber, stop audit pipeline,
 * kill serve child, exit. (V0 MVP: client crash takes serve with it.)
 */

import React from "react"
import { render } from "ink"
import { join } from "node:path"
import { readEnv, validateEnv } from "./core/env.ts"
import { ServeManager } from "./core/serve-manager.ts"
import { createKidsClient } from "./core/connection.ts"
import { SessionManager } from "./core/session.ts"
import { EventSubscriber } from "./core/events.ts"
import { AuditPipeline } from "./core/audit-pipeline.ts"
import { Store } from "./core/store.ts"
import { App } from "./render/ink/App.tsx"
import {
  detectDangerousTopicEn,
  detectDangerousTopicZh,
} from "./dangerous-topic-bridge.ts"

async function main(): Promise<void> {
  const env = readEnv()
  const store = new Store()
  store.update({ coursePack: env.coursePack, mission: env.mission, screen: { kind: "loading" } })

  const check = validateEnv(env)
  if (!check.ok) {
    store.update({ screen: { kind: "error", variant: check.variant, detail: check.reason } })
    renderApp(store, env, {
      onStart: noop,
      onPrompt: noop,
      onPermissionReply: noop,
      onDangerousAcknowledge: noop,
      onErrorRetry: () => process.exit(1),
      onQuit: () => process.exit(0),
    })
    return
  }

  const audit = new AuditPipeline({
    bufferPath: join(env.configDir, "audit-buffer.jsonl"),
  })
  audit.start()

  const serve = new ServeManager({
    baseUrl: env.opencodeBaseUrl,
    serverPassword: env.opencodeServerPassword,
    opencodeBin: env.opencodeBin,
    onAuditLine: (event) => {
      audit.push(event)
      store.pushAudit(event)
      // Detect mission completion / stars charge / dangerous topic from
      // plugin emits and reflect in the live UI.
      handlePluginAudit(event, store, env.locale)
    },
  })

  const readiness = await serve.ensureReady()
  if (readiness.kind === "timeout") {
    store.update({ screen: { kind: "error", variant: "serve_unreachable", detail: readiness.lastError } })
    renderApp(store, env, {
      onStart: noop,
      onPrompt: noop,
      onPermissionReply: noop,
      onDangerousAcknowledge: noop,
      onErrorRetry: async () => {
        store.update({ screen: { kind: "loading" } })
        const again = await serve.ensureReady()
        if (again.kind === "timeout") {
          store.update({ screen: { kind: "error", variant: "serve_unreachable", detail: again.lastError } })
        } else {
          store.update({ screen: { kind: "startup" } })
        }
      },
      onQuit: async () => {
        await serve.shutdown()
        await audit.stop()
        process.exit(0)
      },
    })
    return
  }

  const client = createKidsClient({
    baseUrl: env.opencodeBaseUrl,
    serverPassword: env.opencodeServerPassword,
  })
  const session = new SessionManager(client)

  const subscriber = new EventSubscriber(client, {
    onSessionCreated: (e) => store.update({ sessionId: e.sessionID }),
    onMessagePartDelta: (e) => {
      // Ensure there's an agent message receiving this delta.
      const snap = store.getSnapshot()
      const active = snap.messages.find((m) => m.streaming && m.actor === "agent" && m.id === e.messageID)
      if (!active) {
        store.appendMessage({ id: e.messageID, actor: "agent", text: "", streaming: true, ts: Date.now() })
      }
      store.appendDelta(e.messageID, e.delta)
      // Cheap dangerous-topic detector on the accumulated text.
      const message = store.getSnapshot().messages.find((m) => m.id === e.messageID)
      if (message) {
        const hit = env.locale === "zh-Hans" ? detectDangerousTopicZh(message.text) : detectDangerousTopicEn(message.text)
        if (hit && !store.getSnapshot().dangerousTopic) {
          store.update({ dangerousTopic: { category: hit, snippet: message.text.slice(-200) } })
        }
      }
    },
    onTextEnded: (e) => store.endStream(e.messageID),
    onPermissionAsked: (e) => {
      store.update({
        pendingPermission: {
          requestID: e.requestID,
          tool: e.tool,
          summary: summarisePermission(e, env.locale),
          metadata: e.metadata ?? {},
        },
      })
    },
    onLlmError: (e) => {
      store.update({ screen: { kind: "error", variant: "network_down", detail: e.message } })
    },
    onCompactionEnded: () => {
      // No-op for V0 MVP. Could surface a "context compacted" toast.
    },
    onDisconnected: (reason) => {
      store.update({ screen: { kind: "error", variant: "serve_unreachable", detail: reason } })
    },
  })
  void subscriber.run()

  // Initial screen.
  store.update({ screen: { kind: "startup" } })

  const handleQuit = async (): Promise<void> => {
    subscriber.stop()
    await audit.stop()
    await serve.shutdown()
    process.exit(0)
  }
  process.on("SIGINT", () => void handleQuit())
  process.on("SIGTERM", () => void handleQuit())

  renderApp(store, env, {
    onStart: (mode) => {
      if (mode === "help") {
        // Help is rendered separately in V0 MVP; for now just nudge to docs.
        return
      }
      if (mode === "resume") {
        // V0 MVP: resume not implemented; treat like fresh start.
      }
      store.update({ screen: { kind: "mission" } })
    },
    onPrompt: async (text) => {
      store.appendMessage({ id: `kid-${Date.now()}`, actor: "kid", text, streaming: false, ts: Date.now() })
      const hit = env.locale === "zh-Hans" ? detectDangerousTopicZh(text) : detectDangerousTopicEn(text)
      if (hit) {
        store.update({ dangerousTopic: { category: hit, snippet: text } })
        return
      }
      store.update({ thinking: true })
      try {
        await session.prompt(text)
      } catch (err) {
        store.update({ thinking: false, screen: { kind: "error", variant: "network_down", detail: errMessage(err) } })
      }
    },
    onPermissionReply: async (decision) => {
      const snap = store.getSnapshot()
      const pending = snap.pendingPermission
      if (!pending) return
      store.update({ pendingPermission: null })
      try {
        const reply = decision === "allow" ? "once" : decision === "deny" ? "reject" : "reject"
        const api = (client as unknown as { permission?: { reply: (id: string, body: unknown) => Promise<unknown> } }).permission
        await api?.reply(pending.requestID, { reply })
      } catch {
        // Swallow; the agent will time out and the LLM error path triggers ErrorScreen.
      }
    },
    onDangerousAcknowledge: () => store.update({ dangerousTopic: null }),
    onErrorRetry: () => store.update({ screen: { kind: "startup" } }),
    onQuit: handleQuit,
  })
}

interface AppHandlers {
  onStart: (mode: "free" | "course" | "resume" | "help") => void
  onPrompt: (text: string) => void
  onPermissionReply: (decision: "allow" | "deny" | "edit") => void
  onDangerousAcknowledge: () => void
  onErrorRetry: () => void | Promise<void>
  onQuit: () => void | Promise<void>
}

function renderApp(store: Store, env: ReturnType<typeof readEnv>, handlers: AppHandlers): void {
  render(
    React.createElement(App, {
      store,
      locale: env.locale,
      ...handlers,
    }),
  )
}

function summarisePermission(e: { tool?: string; metadata?: Record<string, unknown> }, locale: "zh-Hans" | "en"): string {
  if (locale === "zh-Hans") return `AI 想用「${e.tool ?? "工具"}」做下一步`
  return `The AI wants to use "${e.tool ?? "a tool"}"`
}

function handlePluginAudit(event: unknown, store: Store, _locale: "zh-Hans" | "en"): void {
  const e = event as { event?: string; stars_charged?: number; stars_estimated?: number }
  if (!e || typeof e.event !== "string") return
  if (e.event === "tool.execute.after" && typeof e.stars_charged === "number") {
    const snap = store.getSnapshot()
    const newBalance = Math.max(0, snap.starsBalance - e.stars_charged)
    store.update({ starsBalance: newBalance })
  }
}

function noop(): void {}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

void main().catch((err) => {
  console.error("kids-client: fatal startup error:", err)
  process.exit(1)
})
