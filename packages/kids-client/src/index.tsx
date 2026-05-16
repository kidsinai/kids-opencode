/**
 * kids-client entry. Composes core/* and renders the Ink app.
 *
 * Boot orchestration (V0.0.3):
 *   1. readEnv + initial render in "loading"
 *   2. validateEnv:
 *      - "needs_setup" → render SetupScreen, await user completion,
 *         reload env from file, re-validate, continue inline
 *      - "config_missing" / "auth_failed" → error screen, exit
 *      - ok → fall through to bootServices
 *   3. bootServices: audit pipeline + opencode serve subprocess +
 *      SDK v2 client + SSE subscriber + SIGINT/SIGTERM
 *   4. Render startup screen; user picks a flow.
 *
 * Inline boot guarantee: the user never sees "run kids-opencode again".
 * SetupScreen → save → reload env → boot serve → MissionScreen,
 * all in the SAME process.
 */

import React from "react"
import { render } from "ink"
import { join } from "node:path"
import { readEnv, validateEnv, type KidsClientEnv } from "./core/env.ts"
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
import { saveSetup, type ProviderId } from "./core/setup.ts"
import { reloadEnvFile } from "./core/env-reload.ts"
import type { InstalledPack } from "./core/course-pack.ts"
import { loadCoursePack } from "@kidsinai/kids-opencode-plugin"

interface ServiceSet {
  audit: AuditPipeline
  serve: ServeManager
  client: OpencodeClient
  session: SessionManager
  subscriber: EventSubscriber
  quit: () => Promise<void>
  handlers: FullHandlers
}

interface FullHandlers {
  onStart: (mode: "free" | "course" | "resume" | "help") => void
  onPrompt: (text: string) => Promise<void>
  onPermissionReply: (decision: "allow" | "deny" | "edit") => Promise<void>
  onAbort: () => Promise<void>
  onErrorRetry: () => Promise<void>
  onPickPack: (packId: string) => void
  onMissionNext: () => void
}

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
  onSetupSave: (provider: ProviderId, apiKey: string) => Promise<{ ok: true } | { ok: false; reason: string }>
  onSetupContinue: () => Promise<void>
  onSetupSkip: () => void
}

async function main(): Promise<void> {
  const env: KidsClientEnv = readEnv()
  const store = new Store()
  const installedPacks = listInstalledPacks()

  store.update({
    coursePack: env.coursePack,
    mission: env.mission,
    screen: { kind: "loading", message: env.locale === "zh-Hans" ? "正在唤醒 AI 老师…" : "Waking up the AI teacher…" },
  })

  // Resolve course pack metadata upfront if available.
  applyCoursePackContext(env, store)

  // Mutable holder for service set; populated by bootServices().
  const servicesHolder: { current: ServiceSet | null } = { current: null }

  // Promise that the SetupScreen flow resolves when the user has completed
  // (or chosen to skip) setup. main() awaits it before continuing.
  let resolveSetup: (() => void) | null = null
  const setupGate = new Promise<void>((r) => { resolveSetup = r })

  const handlers: AppHandlers = makeHandlers(store, env, servicesHolder, resolveSetupFn => {
    resolveSetup = resolveSetupFn
  }, () => resolveSetup)

  renderApp(store, env, installedPacks, handlers)

  // First validation pass.
  let check = validateEnv(env)
  if (!check.ok && check.variant === "needs_setup") {
    store.update({ screen: { kind: "setup" } })
    await setupGate

    // Re-source env file (the setup wizard wrote it).
    reloadEnvFile(env.configDir)
    Object.assign(env, readEnv())
    check = validateEnv(env)
  }

  if (!check.ok) {
    const variant = check.variant === "needs_setup" ? "auth_failed" : check.variant
    store.update({ screen: { kind: "error", variant, detail: check.reason } })
    return
  }

  // Bootstrap services in-process. Loading screen is shown while we wait.
  store.update({
    screen: {
      kind: "loading",
      message: env.locale === "zh-Hans" ? "启动 AI 引擎…" : "Starting AI engine…",
    },
  })

  const services = await bootServices(env, store)
  if (!services) {
    // bootServices already updated the store with the failure screen.
    return
  }
  servicesHolder.current = services

  // SIGINT / SIGTERM cleanly tears down.
  process.on("SIGINT", () => void services.quit())
  process.on("SIGTERM", () => void services.quit())

  // Land on startup screen.
  store.update({ screen: { kind: "startup" } })
}

// ─── handler factory ──────────────────────────────────────────────────────

function makeHandlers(
  store: Store,
  env: KidsClientEnv,
  servicesHolder: { current: ServiceSet | null },
  _setResolveSetup: (fn: (() => void) | null) => void,
  getResolveSetup: () => (() => void) | null,
): AppHandlers {
  const ifBooted = <A extends unknown[]>(fn: (s: ServiceSet, ...args: A) => unknown) => (...args: A) => {
    const s = servicesHolder.current
    if (s) return fn(s, ...args)
    return undefined
  }

  return {
    onStart: ifBooted((s, mode: "free" | "course" | "resume" | "help") => s.handlers.onStart(mode)),
    onPrompt: ifBooted((s, text: string) => s.handlers.onPrompt(text)),
    onPermissionReply: ifBooted((s, d: "allow" | "deny" | "edit") => s.handlers.onPermissionReply(d)),
    onDangerousAcknowledge: () => store.update({ dangerousTopic: null }),
    onErrorRetry: async () => {
      const s = servicesHolder.current
      if (s) return s.handlers.onErrorRetry()
      // Pre-boot error retry: re-run main isn't trivial; just exit.
      process.exit(1)
    },
    onQuit: async () => {
      const s = servicesHolder.current
      if (s) return s.quit()
      process.exit(0)
    },
    onAbort: ifBooted((s) => s.handlers.onAbort()),
    onHelpBack: () => store.update({ screen: { kind: "startup" } }),
    onPickPack: ifBooted((s, id: string) => s.handlers.onPickPack(id)),
    onPickerBack: () => store.update({ screen: { kind: "startup" } }),
    onMissionNext: ifBooted((s) => s.handlers.onMissionNext()),
    onMissionBack: () => store.update({ screen: { kind: "mission" } }),
    onSetupSave: async (provider, apiKey) => {
      try {
        saveSetup({ configDir: env.configDir, provider, apiKey })
        return { ok: true }
      } catch (err) {
        return { ok: false, reason: err instanceof Error ? err.message : String(err) }
      }
    },
    onSetupContinue: async () => {
      const r = getResolveSetup()
      if (r) r()
    },
    onSetupSkip: () => {
      const r = getResolveSetup()
      if (r) r()
    },
  }
}

// ─── service bootstrap ────────────────────────────────────────────────────

async function bootServices(env: KidsClientEnv, store: Store): Promise<ServiceSet | null> {
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
    return null
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
        coursePack: store.getSnapshot().coursePack,
        mission: store.getSnapshot().mission,
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

  const quit = async (): Promise<void> => {
    subscriber.stop()
    await audit.stop()
    await serve.shutdown()
    process.exit(0)
  }

  const handlers = makeFullHandlers(store, env, session, client, serve)

  return { audit, serve, client, session, subscriber, quit, handlers }
}

function makeFullHandlers(
  store: Store,
  env: KidsClientEnv,
  session: SessionManager,
  client: OpencodeClient,
  serve: ServeManager,
): FullHandlers {
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
            text: env.locale === "zh-Hans"
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
      store.update({ screen: { kind: "mission" } })
    },
    onPrompt: async (text) => {
      const snap = store.getSnapshot()
      store.appendMessage({ id: `kid-${Date.now()}`, actor: "kid", text, streaming: false, ts: Date.now() })

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

      const hit = env.locale === "zh-Hans" ? detectDangerousTopicZh(text) : detectDangerousTopicEn(text)
      if (hit) {
        store.update({ dangerousTopic: { category: hit, snippet: text } })
        return
      }

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
            text: env.locale === "zh-Hans"
              ? "你来改这一步，告诉 AI 你想怎么做"
              : "You take this step — tell the AI what you'd prefer",
          })
        }
      } catch { /* SSE surfaces errors */ }
    },
    onAbort: async () => {
      try {
        await session.abort()
        store.update({ thinking: false })
        flashToast(store, {
          kind: "warn",
          text: env.locale === "zh-Hans" ? "已停止" : "Stopped",
        })
      } catch { /* ignore */ }
    },
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
    onPickPack: (packId) => {
      store.update({ coursePack: packId, mission: null })
      refreshContext()
      store.update({ screen: { kind: "mission" } })
    },
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
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────

function applyCoursePackContext(env: KidsClientEnv, store: Store): void {
  const ctx = resolveContext(env.coursePack, env.mission)
  if (ctx) {
    store.update({
      packTitle: ctx.packTitle,
      missionTitle: ctx.missionTitle,
      missionIndex: ctx.missionIndex,
      missionTotal: ctx.missionTotal,
      starsBudget: ctx.starsBudget,
      starsBalance: ctx.starsBudget,
    })
  } else if (env.coursePack) {
    store.update({
      toast: {
        kind: "warn",
        text: env.locale === "zh-Hans"
          ? `没找到 Course Pack: ${env.coursePack}（按 c 重新选）`
          : `Course Pack not found: ${env.coursePack} (press c to pick)`,
      },
    })
  }
}

function renderApp(
  store: Store,
  env: KidsClientEnv,
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

void main().catch((err) => {
  console.error("kids-client: fatal startup error:", err)
  process.exit(1)
})
