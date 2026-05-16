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
 *   7. Ink render(<App />) — kid sees Startup screen, picks a flow
 *
 * Cleanup on SIGINT / SIGTERM: stop subscriber, stop audit pipeline,
 * kill serve child, exit. (V0 MVP: client crash takes serve with it.)
 */

import React from "react"
import { render } from "ink"
import { join } from "node:path"
import { readEnv, validateEnv } from "./core/env.ts"
import { ServeManager } from "./core/serve-manager.ts"
import { createKidsClient, type OpencodeClient } from "./core/connection.ts"
import { SessionManager } from "./core/session.ts"
import { EventSubscriber } from "./core/events.ts"
import { AuditPipeline } from "./core/audit-pipeline.ts"
import { Store } from "./core/store.ts"
import { listInstalledPacks, resolveContext } from "./core/course-pack.ts"
import { readLastSession, writeLastSession } from "./core/last-session.ts"
import { isCompletionTrigger, runCheck } from "./core/check-runner.ts"
import { App } from "./render/ink/App.tsx"
import { detectDangerousTopicEn, detectDangerousTopicZh } from "./dangerous-topic-bridge.ts"
import type { InstalledPack } from "./core/course-pack.ts"
import { findMission, loadCoursePack } from "@kidsinai/kids-opencode-plugin"

async function main(): Promise<void> {
  const env = readEnv()
  const store = new Store()
  const installedPacks = listInstalledPacks()
  store.update({
    coursePack: env.coursePack,
    mission: env.mission,
    screen: { kind: "loading", message: env.locale === "zh-Hans" ? "正在唤醒 AI 老师…" : "Waking up the AI teacher…" },
  })

  const check = validateEnv(env)
  if (!check.ok) {
    store.update({ screen: { kind: "error", variant: check.variant, detail: check.reason } })
    renderApp(store, env, installedPacks, baseHandlers(store, env, null, null, null))
    return
  }

  // Resolve course pack context up front (free-play if coursePack is null).
  const ctx = resolveContext(env.coursePack, env.mission)
  if (ctx) {
    store.update({
      packTitle: ctx.packTitle,
      missionTitle: ctx.missionTitle,
      missionIndex: ctx.missionIndex,
      missionTotal: ctx.missionTotal,
      starsBudget: ctx.starsBudget,
      starsBalance: ctx.starsBudget, // start full; charges deduct via audit hook
    })
  } else if (env.coursePack) {
    // Pack id provided but not found — surface as a toast on the startup screen.
    store.update({
      toast: {
        kind: "warn",
        text: env.locale === "zh-Hans"
          ? `没找到 Course Pack: ${env.coursePack}（按 c 重新选）`
          : `Course Pack not found: ${env.coursePack} (press c to pick)`,
      },
    })
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
      handlePluginAudit(event, store)
    },
  })

  const readiness = await serve.ensureReady()
  if (readiness.kind === "timeout") {
    store.update({ screen: { kind: "error", variant: "serve_unreachable", detail: readiness.lastError } })
    renderApp(store, env, installedPacks, baseHandlers(store, env, null, null, serve))
    return
  }

  const client = createKidsClient({
    baseUrl: env.opencodeBaseUrl,
    serverPassword: env.opencodeServerPassword,
  })
  const session = new SessionManager(client)

  const subscriber = new EventSubscriber(client, {
    onSessionCreated: (e) => {
      store.update({ sessionId: e.sessionID })
      writeLastSession(env.configDir, {
        coursePack: env.coursePack,
        mission: env.mission,
        lastActiveAt: new Date().toISOString(),
        projectDir: process.cwd(),
      })
    },
    onMessagePartDelta: (e) => {
      const snap = store.getSnapshot()
      const active = snap.messages.find((m) => m.streaming && m.actor === "agent" && m.id === e.messageID)
      if (!active) {
        store.appendMessage({ id: e.messageID, actor: "agent", text: "", streaming: true, ts: Date.now() })
      }
      store.appendDelta(e.messageID, e.delta)
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
      // pickup of stars_estimated from the latest plugin audit event.
      const recentAudit = store.getSnapshot().auditBuffer.slice(-10).reverse() as Array<Record<string, unknown>>
      const matching = recentAudit.find(
        (a) => a && typeof a === "object" && a.event === "tool.execute.before" && a.tool === e.tool,
      )
      const starsEstimated = typeof matching?.stars_estimated === "number" ? (matching.stars_estimated as number) : undefined
      store.update({
        pendingPermission: {
          requestID: e.requestID,
          tool: e.tool,
          summary: summarisePermission(e, env.locale),
          metadata: e.metadata ?? {},
          starsEstimated,
        },
      })
    },
    onLlmError: (e) => {
      store.update({ thinking: false, screen: { kind: "error", variant: "network_down", detail: e.message } })
    },
    onCompactionEnded: () => {
      flashToast(store, {
        kind: "info",
        text: env.locale === "zh-Hans" ? "上下文压缩完成 ✓" : "Context compacted ✓",
      })
    },
    onDisconnected: (reason) => {
      store.update({ screen: { kind: "error", variant: "serve_unreachable", detail: reason } })
    },
    onReconnected: () => {
      flashToast(store, {
        kind: "success",
        text: env.locale === "zh-Hans" ? "重新连上了 ✓" : "Reconnected ✓",
      })
    },
  })
  void subscriber.run()

  // First screen: startup. If env already had a course pack, kid can either
  // jump straight in (Enter) or pick a different one (c).
  store.update({ screen: { kind: "startup" } })

  const handleQuit = async (): Promise<void> => {
    subscriber.stop()
    await audit.stop()
    await serve.shutdown()
    process.exit(0)
  }
  process.on("SIGINT", () => void handleQuit())
  process.on("SIGTERM", () => void handleQuit())

  const handlers = fullHandlers(store, env, session, client, serve, handleQuit)
  renderApp(store, env, installedPacks, handlers)
}

// ─── handler factories ───────────────────────────────────────────────────

interface AppHandlers {
  onStart: (mode: "free" | "course" | "resume" | "help") => void
  onPrompt: (text: string) => void
  onPermissionReply: (decision: "allow" | "deny" | "edit") => void
  onDangerousAcknowledge: () => void
  onErrorRetry: () => void | Promise<void>
  onQuit: () => void | Promise<void>
  onAbort: () => void
  onHelpBack: () => void
  onPickPack: (packId: string) => void
  onPickerBack: () => void
  onMissionNext: () => void
  onMissionBack: () => void
}

/**
 * Minimal handlers for the pre-validation / pre-readiness error path.
 * Many actions are no-ops because the app isn't fully booted; quit is
 * the realistic action.
 */
function baseHandlers(
  store: Store,
  env: ReturnType<typeof readEnv>,
  _session: SessionManager | null,
  _client: OpencodeClient | null,
  serve: ServeManager | null,
): AppHandlers {
  const noop = (): void => {}
  return {
    onStart: noop,
    onPrompt: noop,
    onPermissionReply: noop,
    onDangerousAcknowledge: () => store.update({ dangerousTopic: null }),
    onErrorRetry: async () => {
      if (!serve) {
        process.exit(1)
        return
      }
      store.update({
        screen: {
          kind: "loading",
          message: env.locale === "zh-Hans" ? "再试一次…" : "Trying again…",
        },
      })
      const again = await serve.ensureReady()
      if (again.kind === "timeout") {
        store.update({ screen: { kind: "error", variant: "serve_unreachable", detail: again.lastError } })
      } else {
        store.update({ screen: { kind: "startup" } })
      }
    },
    onQuit: async () => {
      if (serve) await serve.shutdown()
      process.exit(0)
    },
    onAbort: noop,
    onHelpBack: () => store.update({ screen: { kind: "startup" } }),
    onPickPack: noop,
    onPickerBack: () => store.update({ screen: { kind: "startup" } }),
    onMissionNext: noop,
    onMissionBack: noop,
  }
}

function fullHandlers(
  store: Store,
  env: ReturnType<typeof readEnv>,
  session: SessionManager,
  client: OpencodeClient,
  serve: ServeManager,
  quit: () => Promise<void>,
): AppHandlers {
  const updateLastSession = (): void => {
    writeLastSession(env.configDir, {
      coursePack: store.getSnapshot().coursePack,
      mission: store.getSnapshot().mission,
      lastActiveAt: new Date().toISOString(),
      projectDir: process.cwd(),
    })
  }
  const refreshContext = (): void => {
    const snap = store.getSnapshot()
    const ctx = resolveContext(snap.coursePack, snap.mission)
    if (ctx) {
      store.update({
        packTitle: ctx.packTitle,
        missionTitle: ctx.missionTitle,
        missionIndex: ctx.missionIndex,
        missionTotal: ctx.missionTotal,
        starsBudget: ctx.starsBudget,
        starsBalance: ctx.starsBudget,
      })
    }
  }

  return {
    onStart: (mode) => {
      if (mode === "help") {
        store.update({ screen: { kind: "help" } })
        return
      }
      if (mode === "course") {
        store.update({ screen: { kind: "course_picker" } })
        return
      }
      if (mode === "resume") {
        const last = readLastSession(env.configDir)
        if (last && last.coursePack) {
          store.update({ coursePack: last.coursePack, mission: last.mission })
          refreshContext()
          flashToast(store, {
            kind: "info",
            text:
              env.locale === "zh-Hans"
                ? `继续上次：${last.coursePack}${last.mission ? " · " + last.mission : ""}`
                : `Resuming: ${last.coursePack}${last.mission ? " · " + last.mission : ""}`,
          })
        } else {
          flashToast(store, {
            kind: "warn",
            text: env.locale === "zh-Hans" ? "没找到上次的项目，先开始一个新的" : "No previous project found — starting fresh",
          })
        }
        store.update({ screen: { kind: "mission" } })
        return
      }
      // mode === "free" (or unrecognised) — enter MissionScreen.
      store.update({ screen: { kind: "mission" } })
    },
    onPrompt: async (text) => {
      const snap = store.getSnapshot()
      store.appendMessage({ id: `kid-${Date.now()}`, actor: "kid", text, streaming: false, ts: Date.now() })

      // In-TUI mission check intercept. Don't even hit the LLM.
      if (snap.mission && isCompletionTrigger(text, env.locale)) {
        const outcome = runCheck({
          missionId: snap.mission,
          packId: snap.coursePack ?? "",
          locale: env.locale,
        })
        store.appendMessage({
          id: `sys-${Date.now()}`,
          actor: "system",
          text: outcome.message + (outcome.details.length ? "\n" + outcome.details.join("\n") : ""),
          streaming: false,
          ts: Date.now(),
        })
        if (outcome.kind === "pass" && snap.coursePack && snap.mission) {
          const pack = loadCoursePack(snap.coursePack)
          const missions = pack?.missions ?? []
          const idx = missions.findIndex((m) => m.id === snap.mission)
          const hasNext = idx >= 0 && idx + 1 < missions.length
          store.update({
            screen: {
              kind: "mission_complete",
              missionId: snap.mission,
              missionTitle: snap.missionTitle,
              passed: outcome.result?.passed ?? 0,
              total: outcome.result?.total ?? 0,
              completionMessage: outcome.result?.completion_message ?? outcome.message,
              hasNextMission: hasNext,
            },
          })
        }
        return
      }

      // Dangerous topic intercept on kid input.
      const hit = env.locale === "zh-Hans" ? detectDangerousTopicZh(text) : detectDangerousTopicEn(text)
      if (hit) {
        store.update({ dangerousTopic: { category: hit, snippet: text } })
        return
      }

      // Normal LLM prompt.
      store.update({ thinking: true })
      updateLastSession()
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
        const reply = decision === "allow" ? "once" : "reject"
        const api = (client as unknown as { permission?: { reply: (id: string, body: unknown) => Promise<unknown> } }).permission
        await api?.reply(pending.requestID, { reply })
        if (decision === "edit") {
          flashToast(store, {
            kind: "info",
            text:
              env.locale === "zh-Hans"
                ? "你来改这一步，告诉 AI 你想怎么做"
                : "You take this step — tell the AI what you'd prefer",
          })
        }
      } catch {
        // SSE will surface the timeout / error via onLlmError.
      }
    },
    onDangerousAcknowledge: () => store.update({ dangerousTopic: null }),
    onErrorRetry: async () => {
      store.update({
        screen: {
          kind: "loading",
          message: env.locale === "zh-Hans" ? "再试一次…" : "Trying again…",
        },
      })
      const again = await serve.ensureReady()
      if (again.kind === "timeout") {
        store.update({ screen: { kind: "error", variant: "serve_unreachable", detail: again.lastError } })
      } else {
        store.update({ screen: { kind: "startup" } })
      }
    },
    onQuit: quit,
    onAbort: async () => {
      try {
        await session.abort()
        store.update({ thinking: false })
        flashToast(store, {
          kind: "warn",
          text: env.locale === "zh-Hans" ? "已停止" : "Stopped",
        })
      } catch {
        // ignore
      }
    },
    onHelpBack: () => store.update({ screen: { kind: "startup" } }),
    onPickPack: (packId) => {
      store.update({ coursePack: packId, mission: null })
      refreshContext()
      store.update({ screen: { kind: "mission" } })
    },
    onPickerBack: () => store.update({ screen: { kind: "startup" } }),
    onMissionNext: () => {
      const snap = store.getSnapshot()
      if (!snap.coursePack || !snap.mission) {
        store.update({ screen: { kind: "mission" } })
        return
      }
      const pack = loadCoursePack(snap.coursePack)
      const missions = pack?.missions ?? []
      const idx = missions.findIndex((m) => m.id === snap.mission)
      const next = idx >= 0 && idx + 1 < missions.length ? missions[idx + 1] : null
      if (!next) {
        store.update({ screen: { kind: "mission" } })
        return
      }
      store.update({ mission: next.id })
      refreshContext()
      store.update({ screen: { kind: "mission" } })
      flashToast(store, {
        kind: "success",
        text: env.locale === "zh-Hans" ? `开始：${next.title}` : `Starting: ${next.title}`,
      })
    },
    onMissionBack: () => store.update({ screen: { kind: "mission" } }),
  }
}

// ─── utilities ───────────────────────────────────────────────────────────

function renderApp(
  store: Store,
  env: ReturnType<typeof readEnv>,
  installedPacks: InstalledPack[],
  handlers: AppHandlers,
): void {
  render(
    React.createElement(App, {
      store,
      locale: env.locale,
      installedPacks,
      ...handlers,
    }),
  )
}

function summarisePermission(
  e: { tool?: string; metadata?: Record<string, unknown> },
  locale: "zh-Hans" | "en",
): string {
  if (locale === "zh-Hans") return `AI 想用「${e.tool ?? "工具"}」做下一步`
  return `The AI wants to use "${e.tool ?? "a tool"}"`
}

function handlePluginAudit(event: unknown, store: Store): void {
  const e = event as { event?: string; stars_charged?: number; stars_estimated?: number }
  if (!e || typeof e.event !== "string") return
  if (e.event === "tool.execute.after" && typeof e.stars_charged === "number") {
    const snap = store.getSnapshot()
    const newBalance = Math.max(0, snap.starsBalance - e.stars_charged)
    store.update({ starsBalance: newBalance })
  }
}

const TOAST_TTL_MS = 3500
function flashToast(store: Store, toast: { kind: "info" | "warn" | "success"; text: string }): void {
  store.update({ toast })
  setTimeout(() => {
    const snap = store.getSnapshot()
    if (snap.toast?.text === toast.text) {
      store.update({ toast: null })
    }
  }, TOAST_TTL_MS)
}

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

// Touch findMission so TS doesn't complain about the import being unused
// when typecheck runs against the v0.0.1 SDK that doesn't expose v2 yet.
void findMission
void loadCoursePack

void main().catch((err) => {
  console.error("kids-client: fatal startup error:", err)
  process.exit(1)
})
