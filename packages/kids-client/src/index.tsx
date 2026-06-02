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
import { readFileSync } from "node:fs"
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
import { parseSlash, matchCommand } from "./core/commands.ts"
import { listModels, isModelUnavailable, pickDefaultModel } from "./core/models.ts"
import { findFiles } from "./core/files.ts"
import { App } from "./render/ink/App.tsx"
import { FREE_PLAY_PACK_ID } from "./render/ink/screens/CoursePackPicker.tsx"
import { detectDangerousTopicEn, detectDangerousTopicZh } from "./dangerous-topic-bridge.ts"
import { OAUTH_HANDOFF_EXIT_CODE, saveSetup, saveSetupOauth, type ProviderId } from "./core/setup.ts"
import { reloadEnvFile } from "./core/env-reload.ts"
import { hasSeenTour, markTourSeen } from "./core/tour-marker.ts"
import type { InstalledPack } from "./core/course-pack.ts"
import { loadCoursePack } from "@kidsinai/kids-opencode-plugin"
import { buildWalletUrl, getOrCreateDeviceId, openInBrowser } from "./core/wallet-link.ts"

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
  onStart: (mode: "free" | "course" | "resume" | "help" | "settings") => void
  onPrompt: (text: string) => Promise<void>
  onPermissionReply: (decision: "allow" | "deny" | "edit") => Promise<void>
  onAbort: () => Promise<void>
  onErrorRetry: () => Promise<void>
  onPickPack: (packId: string) => void
  onMissionNext: () => void
  onSessionPick: (sessionId: string) => void
  onFindFiles: (query: string) => Promise<string[]>
}

interface AppHandlers {
  onStart: (mode: "free" | "course" | "resume" | "help" | "settings") => void
  onPrompt: (text: string) => void
  onPermissionReply: (decision: "allow" | "deny" | "edit") => void
  onDangerousAcknowledge: () => void
  onErrorRetry: () => void | Promise<void>
  onReconfigure: () => void
  onQuit: () => void | Promise<void>
  onAbort: () => void
  onHelpBack: () => void
  onPickPack: (packId: string) => void
  onPickerBack: () => void
  onMissionNext: () => void
  onMissionBack: () => void
  onMissionExit: () => void
  onModelPick: (modelId: string) => void
  onSessionPick: (sessionId: string) => void
  onPickerClose: () => void
  onFindFiles: (query: string) => Promise<string[]>
  onSetupSave: (provider: ProviderId, apiKey: string) => Promise<{ ok: true } | { ok: false; reason: string }>
  onSetupContinue: () => Promise<void>
  onSetupSkip: () => void
  onSetupOAuthHandoff: (provider: ProviderId) => Promise<void>
  onTourDone: () => void
  onOpenWallet: () => void
}

async function main(): Promise<void> {
  // Switch to the terminal's alternate screen buffer so Ink draws on a
  // canvas isolated from whatever was in the terminal before us — most
  // importantly the green "Complete authorization…" lines printed by
  // `opencode auth login` between two execs of kids-client. On exit, the
  // kid's original terminal contents (incl. scrollback) come back.
  //
  // NOTE: do NOT install SIGINT/SIGTERM handlers here — the existing
  // `process.on("SIGINT", () => void services.quit())` registration below
  // is the cleanup owner; double-handling closed the raw-mode stdin out
  // from under Ink and surfaced as "EIO on fd 8" when the kid pressed Esc.
  // The "exit" listener alone is enough to restore the terminal for normal
  // exits + the OAuth handoff `process.exit(OAUTH_HANDOFF_EXIT_CODE)`.
  if (process.stdout.isTTY) {
    process.stdout.write("\x1b[?1049h\x1b[H")
    process.on("exit", () => {
      try { process.stdout.write("\x1b[?1049l") } catch { /* terminal already closed */ }
    })
  }

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

  // Same pattern for the first-run welcome tour. Only awaited if we actually
  // route to it (returning users with valid env skip both setup and tour).
  let resolveTour: (() => void) | null = null
  const tourGate = new Promise<void>((r) => { resolveTour = r })

  const handlers: AppHandlers = makeHandlers(store, env, servicesHolder, resolveSetupFn => {
    resolveSetup = resolveSetupFn
  }, () => resolveSetup, () => resolveTour)

  renderApp(store, env, installedPacks, handlers)

  // First validation pass.
  let check = validateEnv(env)
  let didSetup = false
  if (!check.ok && check.variant === "needs_setup") {
    store.update({ screen: { kind: "setup" } })
    await setupGate
    didSetup = true

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

  // First-run tour: only fires if the kid just went through setup AND hasn't
  // seen the tour. Returning users with inherited env vars skip it entirely.
  if (didSetup && !hasSeenTour(env.configDir)) {
    store.update({ screen: { kind: "tour" } })
    await tourGate
    markTourSeen(env.configDir)
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
  getResolveTour: () => (() => void) | null,
): AppHandlers {
  const ifBooted = <A extends unknown[]>(fn: (s: ServiceSet, ...args: A) => unknown) => (...args: A) => {
    const s = servicesHolder.current
    if (s) return fn(s, ...args)
    return undefined
  }

  return {
    onStart: ifBooted((s, mode: "free" | "course" | "resume" | "help" | "settings") => s.handlers.onStart(mode)),
    onPrompt: ifBooted((s, text: string) => s.handlers.onPrompt(text)),
    onPermissionReply: ifBooted((s, d: "allow" | "deny" | "edit") => s.handlers.onPermissionReply(d)),
    onDangerousAcknowledge: () => store.update({ dangerousTopic: null }),
    onErrorRetry: async () => {
      const s = servicesHolder.current
      if (s) return s.handlers.onErrorRetry()
      // Pre-boot error retry: re-run main isn't trivial; just exit.
      process.exit(1)
    },
    onReconfigure: () => {
      // From an error screen, jump into the setup wizard so the parent can
      // change provider / paste a new API key. onSetupContinue knows whether
      // we're in first-run (resolve gate) or post-boot (reload env + retry).
      store.update({ screen: { kind: "setup" } })
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
    onModelPick: (modelId) => {
      const sc = store.getSnapshot().screen
      if (sc.kind !== "model_picker") return
      const chosen = sc.models.find((m) => m.id === modelId)
      store.update({
        selectedModel: modelId,
        selectedModelLabel: chosen?.label ?? modelId,
        screen: sc.returnTo,
      })
      flashToast(store, {
        kind: "success",
        text: (env.locale === "zh-Hans" ? "已切换模型：" : "Model: ") + (chosen?.label ?? modelId),
      })
    },
    onSessionPick: ifBooted((s, id: string) => s.handlers.onSessionPick(id)),
    onFindFiles: async (query: string) => {
      const s = servicesHolder.current
      return s ? s.handlers.onFindFiles(query) : []
    },
    onPickerClose: () => {
      const sc = store.getSnapshot().screen
      if (sc.kind === "model_picker" || sc.kind === "session_list") {
        store.update({ screen: sc.returnTo })
      }
    },
    // Leave an in-progress mission and return to the startup menu. The serve +
    // session keep running in the background; the kid just re-enters from the
    // picker. Mirrors onHelpBack / onPickerBack.
    onMissionExit: () => store.update({ screen: { kind: "startup" } }),
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
      // Post-boot reconfigure path: services are already up but the env they
      // were booted with is stale. Re-source the env file (the wizard wrote
      // it) and replay the same recovery as [Enter] Retry on the error
      // screen — push the loading screen and re-run readiness probe.
      const s = servicesHolder.current
      if (s) {
        reloadEnvFile(env.configDir)
        Object.assign(env, readEnv())
        await s.handlers.onErrorRetry()
      }
    },
    onSetupSkip: () => {
      const r = getResolveSetup()
      if (r) r()
    },
    onSetupOAuthHandoff: async (provider) => {
      try {
        saveSetupOauth({ configDir: env.configDir, provider })
      } catch (err) {
        console.error("kids-client: OAuth handoff prep failed:", err)
        process.exit(1)
      }
      // Hand the TTY to bin/kids-opencode so it can run
      // `opencode auth login --provider <p>` interactively, then re-exec us.
      process.exit(OAUTH_HANDOFF_EXIT_CODE)
    },
    onTourDone: () => {
      const r = getResolveTour()
      if (r) r()
    },
    onOpenWallet: () => {
      const deviceId = getOrCreateDeviceId(env.configDir)
      const url = buildWalletUrl({
        portalBaseUrl: env.portalBaseUrl,
        deviceId,
        locale: env.locale,
      })
      const result = openInBrowser(url)
      const okText = env.locale === "zh-Hans"
        ? `已在浏览器打开：${url}`
        : `Opened in your browser: ${url}`
      const failText = env.locale === "zh-Hans"
        ? `没办法自动开浏览器。请手动打开：${url}`
        : `Couldn't auto-open the browser. Open manually: ${url}`
      flashToast(store, {
        kind: result.ok ? "success" : "warn",
        text: result.ok ? okText : failText,
      })
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
    serverUsername: env.opencodeServerUsername,
    opencodeBin: env.opencodeBin,
    opencodeConfigContent: buildServeConfig(env.configDir),
    onAuditLine: (event) => {
      audit.push(event)
      store.pushAudit(event)
      handlePluginAudit(event, store)
    },
  })

  const readiness = await serve.ensureReady()
  if (readiness.kind === "port_taken_auth_mismatch") {
    store.update({
      screen: {
        kind: "error",
        variant: "port_taken",
        detail: `port ${readiness.port} held by another opencode serve`,
      },
    })
    return null
  }
  if (readiness.kind === "spawn_failed") {
    store.update({
      screen: {
        kind: "error",
        variant: "serve_unreachable",
        detail: `opencode serve exited (${readiness.exitCode}): ${readiness.stderrTail || "no stderr"}`,
      },
    })
    return null
  }
  if (readiness.kind === "timeout") {
    store.update({ screen: { kind: "error", variant: "serve_unreachable", detail: readiness.lastError } })
    return null
  }

  const client = createKidsClient({
    baseUrl: env.opencodeBaseUrl,
    serverPassword: env.opencodeServerPassword,
    serverUsername: env.opencodeServerUsername,
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
      const variant = classifyLlmError(e.message)
      store.update({ thinking: false, screen: { kind: "error", variant, detail: e.message } })
    },
    onCompactionEnded: () => {
      flashToast(store, {
        kind: "info",
        text: env.locale === "zh-Hans" ? "上下文压缩完成 ✓" : "Context compacted ✓",
      })
    },
    onDisconnected: (reason) => {
      // This fires after the engine was already reachable, so the failure is a
      // dropped event stream, not a failed startup. Make the detail say so —
      // the variant's title still reads "AI teacher didn't start", but the
      // detail keeps it from being misleading.
      store.update({
        screen: {
          kind: "error",
          variant: "serve_unreachable",
          detail: `lost connection to the AI engine after it started — ${reason}`,
        },
      })
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

  const handlers = makeFullHandlers(store, env, session, client, serve, quit)

  return { audit, serve, client, session, subscriber, quit, handlers }
}

function makeFullHandlers(
  store: Store,
  env: KidsClientEnv,
  session: SessionManager,
  client: OpencodeClient,
  serve: ServeManager,
  quit: () => Promise<void>,
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

  const zh = env.locale === "zh-Hans"
  const sysMessage = (text: string): void => {
    store.appendMessage({ id: `sys-${Date.now()}`, actor: "system", text, streaming: false, ts: Date.now() })
  }

  // Handle a kid-safe `/command`. Returns nothing — it mutates the store /
  // opens a picker. Unknown commands get a friendly nudge toward /help. Note
  // `/check` + `/done` are handled earlier in onPrompt (completion triggers)
  // when inside a mission, so they only reach here outside one.
  const dispatchSlash = async (text: string): Promise<void> => {
    const parsed = parseSlash(text)
    const cmd = parsed ? matchCommand(parsed.name) : null
    if (!cmd) {
      sysMessage(zh
        ? `没有「${parsed?.name ?? text}」这个命令。输入 /help 看看能用哪些。`
        : `No command "${parsed?.name ?? text}". Type /help to see what's available.`)
      return
    }
    switch (cmd.id) {
      case "help":
        store.update({ screen: { kind: "help" } })
        return
      case "menu":
        store.update({ screen: { kind: "startup" } })
        return
      case "clear":
        store.update({ messages: [] })
        return
      case "compact":
        if (!session.getId()) {
          sysMessage(zh ? "还没有对话可以压缩。" : "No chat to shrink yet.")
          return
        }
        try {
          await session.compact()
          flashToast(store, { kind: "success", text: zh ? "对话已压缩 ✓" : "Chat shrunk ✓" })
        } catch {
          flashToast(store, { kind: "warn", text: zh ? "压缩没成功,稍后再试" : "Couldn't shrink — try again later" })
        }
        return
      case "new":
        session.reset()
        store.update({ messages: [] })
        flashToast(store, { kind: "success", text: zh ? "开始一段新对话 ✓" : "New chat ✓" })
        return
      case "quit":
        await quit()
        return
      case "check":
        sysMessage(zh ? "先开始一个项目，再用 /check 验收哦。" : "Start a project first, then use /check.")
        return
      case "model": {
        const models = await listModels(client)
        store.update({ screen: { kind: "model_picker", models, returnTo: store.getSnapshot().screen } })
        return
      }
      case "sessions": {
        const sessions = await session.list()
        store.update({ screen: { kind: "session_list", sessions, returnTo: store.getSnapshot().screen } })
        return
      }
    }
  }

  return {
    onStart: (mode) => {
      if (mode === "help") {
        store.update({ screen: { kind: "help" } })
        return
      }
      if (mode === "settings") {
        // Re-open the setup wizard to change provider / API key / model.
        store.update({ screen: { kind: "setup" } })
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

      if (text.trim().startsWith("/")) {
        await dispatchSlash(text)
        return
      }

      const hit = env.locale === "zh-Hans" ? detectDangerousTopicZh(text) : detectDangerousTopicEn(text)
      if (hit) {
        store.update({ dangerousTopic: { category: hit, snippet: text } })
        return
      }

      store.update({ thinking: true })
      updateLastSession()
      // Resolve a usable model up front. With no explicit pick, the server
      // falls back to whatever model it last used — which may be one the
      // current auth can't use (a ChatGPT-account login can't use gpt-5.5-pro).
      // Pinning a known-good default makes the kid's first message just work.
      let model = snap.selectedModel
      if (!model) {
        const def = pickDefaultModel(await listModels(client))
        if (def) {
          model = def.id
          store.update({ selectedModel: def.id, selectedModelLabel: def.label })
        }
      }
      try {
        await session.prompt(text, { model: model ?? undefined })
      } catch (err) {
        const detail = errMessage(err)
        if (isModelUnavailable(detail)) {
          // The model isn't usable on this account (e.g. a -pro model under a
          // ChatGPT login). Clear it so the next message auto-picks a good
          // default, and guide the kid to /model instead of a scary error.
          store.update({ thinking: false, selectedModel: null, selectedModelLabel: null })
          sysMessage(env.locale === "zh-Hans"
            ? "这个 AI 模型在你的账号下用不了。直接再发一条消息会自动换成可用模型，或打 /model 自己选（推荐 gpt-5.4-mini）。"
            : "That AI model isn't available on your account. Just send again to auto-switch to a usable one, or type /model to choose (try gpt-5.4-mini).")
          return
        }
        store.update({ thinking: false, screen: { kind: "error", variant: classifyLlmError(detail), detail } })
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
      if (again.kind === "port_taken_auth_mismatch") {
        store.update({
          screen: {
            kind: "error",
            variant: "port_taken",
            detail: `port ${again.port} held by another opencode serve`,
          },
        })
      } else if (again.kind === "spawn_failed") {
        store.update({
          screen: {
            kind: "error",
            variant: "serve_unreachable",
            detail: `opencode serve exited (${again.exitCode}): ${again.stderrTail || "no stderr"}`,
          },
        })
      } else if (again.kind === "timeout") {
        store.update({ screen: { kind: "error", variant: "serve_unreachable", detail: again.lastError } })
      } else {
        store.update({ screen: { kind: "startup" } })
      }
    },
    onPickPack: (packId) => {
      if (packId === FREE_PLAY_PACK_ID) {
        // Synthetic "I don't know yet — just chat" entry → free-play.
        store.update({ coursePack: null, mission: null, packTitle: null, missionTitle: null, missionIndex: null, missionTotal: null })
        store.update({ screen: { kind: "mission" } })
        return
      }
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
    onSessionPick: async (sessionId) => {
      const sc = store.getSnapshot().screen
      const back = sc.kind === "session_list" ? sc.returnTo : { kind: "mission" as const }
      // Show the chat immediately (loading), then rehydrate the transcript from
      // the server so the kid sees what was said before.
      store.update({ messages: [], screen: back })
      try {
        const past = await session.loadMessages(sessionId)
        store.setMessages(past)
      } catch {
        session.switchTo(sessionId) // at least continue it even if rehydrate failed
      }
      flashToast(store, {
        kind: "info",
        text: env.locale === "zh-Hans" ? "打开了这段对话" : "Opened that chat",
      })
    },
    onFindFiles: (query) => findFiles(client, query),
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
    // Preemptive switch the moment the balance lands at zero — kid sees the
    // friendly "out of stars" screen before the next tool call fails server-side.
    if (newBalance === 0 && snap.starsBudget > 0 && snap.screen.kind === "mission") {
      store.update({
        screen: { kind: "error", variant: "stars_exhausted" },
        thinking: false,
      })
    }
  }
}

/**
 * Pattern-match the LLM/plugin error message against known billing failures
 * so the kid lands on the friendly "out of stars" screen instead of the
 * generic "network down" one. The plugin / DeepRouter wraps these with
 * codes like WALLET_INSUFFICIENT / FAMILY_PAUSED (platform-backend §7) or
 * plain English ("insufficient credits", "rate limit", "402").
 */
function classifyLlmError(msg: string): "stars_exhausted" | "auth_failed" | "network_down" {
  const m = msg.toLowerCase()
  if (
    m.includes("wallet_insufficient")
    || m.includes("family_paused")
    || m.includes("insufficient")
    || m.includes("out of credit")
    || m.includes("out of stars")
    || m.includes("quota")
    || m.includes("402")
  ) {
    return "stars_exhausted"
  }
  // Auth/sign-in failures (e.g. ChatGPT OAuth token invalidated, 401) are NOT
  // network problems — the fix is to re-authenticate, so route to the
  // reconfigurable error screen instead of the dead-end "can't reach AI".
  if (
    m.includes("token_invalidated")
    || m.includes("authentication token")
    || m.includes("sign in again")
    || m.includes("signing in")
    || m.includes("invalidated")
    || m.includes("unauthorized")
    || m.includes("invalid_api_key")
    || m.includes("401")
  ) {
    return "auth_failed"
  }
  return "network_down"
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

/**
 * Build the inline opencode config passed to the spawned serve. opencode's
 * own global config is effectively empty, so without this it defaults the
 * openai provider to gpt-5.5-pro (rejected by ChatGPT-account auth) with no
 * permission gate. We forward a curated, schema-clean subset of the kids
 * preset: a usable default model + the kid-safety "ask before acting" gate.
 *
 * Deliberately NOT forwarded: the preset's `agent.tools` / `_comment` keys —
 * they fail opencode's config schema (which silently drops the whole config).
 * The tool whitelist is enforced by the kids plugin regardless, so nothing is
 * lost. Returns undefined if the preset is missing/unreadable (serve then
 * falls back to its own config — same as before this change).
 */
function buildServeConfig(configDir: string): string | undefined {
  let model = "openai/gpt-5.4-mini"
  try {
    const preset = JSON.parse(readFileSync(join(configDir, "opencode.json"), "utf8")) as { model?: string }
    if (typeof preset.model === "string" && preset.model.includes("/")) model = preset.model
  } catch {
    return undefined
  }
  return JSON.stringify({
    $schema: "https://opencode.ai/config.json",
    model,
    permission: { edit: "ask", write: "ask", bash: "ask", webfetch: "ask" },
  })
}

void main().catch((err) => {
  console.error("kids-client: fatal startup error:", err)
  process.exit(1)
})
