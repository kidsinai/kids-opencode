/**
 * Top-level router. Reads store snapshot → picks which screen to render.
 *
 * The router is intentionally thin. All state mutation happens in the
 * core/ layer; this component only translates state.screen → JSX.
 *
 * Modal overlays (dangerous-topic, pending-permission) preempt the
 * routed screen — they're absolute-priority overlays that the kid must
 * dispatch before the underlying screen can interact again.
 */

import React, { useSyncExternalStore } from "react"
import { Box, useStdout } from "ink"
import type { InstalledPack } from "../../core/course-pack.ts"
import type { ErrorVariant, Store } from "../../core/store.ts"
import { StartupScreen } from "./screens/StartupScreen.tsx"
import { MissionScreen } from "./screens/MissionScreen.tsx"
import { PermissionModal } from "./screens/PermissionModal.tsx"
import { DangerousTopicModal } from "./screens/DangerousTopicModal.tsx"
import { ErrorScreen } from "./screens/ErrorScreen.tsx"
import { HelpScreen } from "./screens/HelpScreen.tsx"
import { CoursePackPicker } from "./screens/CoursePackPicker.tsx"
import { MissionCompleteScreen } from "./screens/MissionCompleteScreen.tsx"
import { LoadingScreen } from "./screens/LoadingScreen.tsx"
import { SetupScreen } from "./screens/SetupScreen.tsx"
import { TourScreen } from "./screens/TourScreen.tsx"
import { PickList } from "./components/PickList.tsx"
import type { ProviderId } from "../../core/setup.ts"

// Variants where the root cause may be a stale / wrong API key or a missing
// provider config — showing a [c] Change settings option that opens the setup
// wizard actually helps. Pure runtime/network problems (network_down,
// stars_exhausted, ai_hung) are excluded; they need a different recovery.
const RECONFIGURABLE_VARIANTS: ReadonlySet<ErrorVariant> = new Set([
  "serve_unreachable",
  "port_taken",
  "auth_failed",
  "config_missing",
])

export interface AppDeps {
  store: Store
  locale: "zh-Hans" | "en"
  installedPacks: InstalledPack[]
  onStart: (mode: "free" | "course" | "resume" | "help") => void
  onPrompt: (text: string) => void
  onPermissionReply: (decision: "allow" | "deny" | "edit") => void
  onDangerousAcknowledge: () => void
  onErrorRetry: () => void
  /**
   * Jump from the error screen into the setup wizard. Only wired for
   * config-related variants — see RECONFIGURABLE_VARIANTS below.
   */
  onReconfigure: () => void
  onQuit: () => void
  onAbort: () => void
  onHelpBack: () => void
  onPickPack: (packId: string) => void
  onPickerBack: () => void
  onMissionNext: () => void
  onMissionBack: () => void
  /** Leave an in-progress mission and return to the startup menu. */
  onMissionExit: () => void
  /** Pick an AI model from the `/model` picker (id = "provider/model"). */
  onModelPick: (modelId: string) => void
  /** Open a past session from the `/sessions` picker. */
  onSessionPick: (sessionId: string) => void
  /** Cancel a model/session picker and go back to where it was opened from. */
  onPickerClose: () => void
  /** Autocomplete project files for an `@mention`. */
  onFindFiles: (query: string) => Promise<string[]>
  onSetupSave: (provider: ProviderId, apiKey: string) => Promise<{ ok: true } | { ok: false; reason: string }>
  onSetupContinue: () => Promise<void>
  onSetupSkip: () => void
  onSetupOAuthHandoff: (provider: ProviderId) => Promise<void>
  onTourDone: () => void
  /**
   * Open the Airbotix Portal wallet/login page in the parent's default
   * browser. Wired into [w] on StartupScreen and into the
   * `stars_exhausted` ErrorScreen so parents can top up without
   * remembering the URL.
   */
  onOpenWallet: () => void
}

export function App(deps: AppDeps): React.ReactElement {
  const state = useSyncExternalStore(
    (cb) => deps.store.subscribe(cb),
    () => deps.store.getSnapshot(),
    () => deps.store.getSnapshot(),
  )
  // Pin the App's footprint to the terminal's full dimensions. Without
  // this, MissionScreen's `flexGrow={1}` middle box (chat + spinner) made
  // the App's TOTAL rendered height shift by ±1 line on every keystroke /
  // spinner tick / streaming chunk. Ink's diff move-cursor-up-by-N then
  // used a stale N from the previous frame, so each new frame got drawn
  // one row LOWER than the last — leaving the previous frame's top
  // border behind. Result: a cascade of ┌──┐ stripes piling up above the
  // Header. With width+height fixed to the terminal, the App's footprint
  // never changes between renders and Ink's diff stays correct.
  const { stdout } = useStdout()
  const width = stdout?.columns && stdout.columns > 4 ? stdout.columns : 80
  // -1 to leave a row for the terminal cursor / status; without it some
  // terminals scroll the App by one line on the first render.
  const height = stdout?.rows && stdout.rows > 4 ? stdout.rows - 1 : 23

  const screen = renderScreen(state, deps)
  return (
    <Box width={width} height={height} flexDirection="column">
      {screen}
    </Box>
  )
}

function renderScreen(state: ReturnType<Store["getSnapshot"]>, deps: AppDeps): React.ReactElement | null {
  // Dangerous-topic overlay takes absolute priority — it has to be the
  // first thing on screen the moment a pattern hits, even mid-stream.
  if (state.dangerousTopic) {
    return <DangerousTopicModal topic={state.dangerousTopic} locale={deps.locale} onAcknowledge={deps.onDangerousAcknowledge} />
  }
  if (state.pendingPermission) {
    return (
      <PermissionModal
        permission={state.pendingPermission}
        locale={deps.locale}
        onAllow={() => deps.onPermissionReply("allow")}
        onDeny={() => deps.onPermissionReply("deny")}
        onEdit={() => deps.onPermissionReply("edit")}
      />
    )
  }
  switch (state.screen.kind) {
    case "loading":
      return <LoadingScreen locale={deps.locale} message={state.screen.message} />
    case "setup":
      return <SetupScreen locale={deps.locale} onSave={deps.onSetupSave} onContinue={deps.onSetupContinue} onSkip={deps.onSetupSkip} onOAuthHandoff={deps.onSetupOAuthHandoff} />
    case "tour":
      return <TourScreen locale={deps.locale} onDone={deps.onTourDone} />
    case "startup":
      return <StartupScreen locale={deps.locale} coursePack={state.coursePack} toast={state.toast} onStart={deps.onStart} onOpenWallet={deps.onOpenWallet} onQuit={deps.onQuit} />
    case "mission":
      return <MissionScreen state={state} locale={deps.locale} onPrompt={deps.onPrompt} onAbort={deps.onAbort} onExit={deps.onMissionExit} onFindFiles={deps.onFindFiles} />
    case "help":
      return <HelpScreen locale={deps.locale} onBack={deps.onHelpBack} />
    case "course_picker":
      return (
        <CoursePackPicker
          locale={deps.locale}
          packs={deps.installedPacks}
          onPick={deps.onPickPack}
          onBack={deps.onPickerBack}
        />
      )
    case "mission_complete":
      return (
        <MissionCompleteScreen
          locale={deps.locale}
          missionId={state.screen.missionId}
          missionTitle={state.screen.missionTitle}
          passed={state.screen.passed}
          total={state.screen.total}
          completionMessage={state.screen.completionMessage}
          hasNextMission={state.screen.hasNextMission}
          onNext={deps.onMissionNext}
          onBack={deps.onMissionBack}
        />
      )
    case "model_picker": {
      const zh = deps.locale === "zh-Hans"
      return (
        <PickList
          title={zh ? "选一个 AI 模型" : "Pick an AI model"}
          items={state.screen.models.map((m) => ({ id: m.id, label: m.label, sublabel: m.id }))}
          hints={zh ? "[↑↓] 选 · [Enter] 确认 · [Esc] 返回" : "[↑↓] move · [Enter] choose · [Esc] back"}
          emptyText={zh ? "暂时拿不到模型列表，先用默认的吧。" : "No models available right now — using the default."}
          onPick={deps.onModelPick}
          onBack={deps.onPickerClose}
        />
      )
    }
    case "session_list": {
      const zh = deps.locale === "zh-Hans"
      return (
        <PickList
          title={zh ? "之前的对话" : "Your past chats"}
          items={state.screen.sessions.map((s) => ({ id: s.id, label: s.title, sublabel: s.id }))}
          hints={zh ? "[↑↓] 选 · [Enter] 打开 · [Esc] 返回" : "[↑↓] move · [Enter] open · [Esc] back"}
          emptyText={zh ? "还没有以前的对话。" : "No earlier chats yet."}
          onPick={deps.onSessionPick}
          onBack={deps.onPickerClose}
        />
      )
    }
    case "error":
      return (
        <ErrorScreen
          variant={state.screen.variant}
          detail={state.screen.detail}
          locale={deps.locale}
          toast={state.toast}
          onRetry={deps.onErrorRetry}
          onReconfigure={RECONFIGURABLE_VARIANTS.has(state.screen.variant) ? deps.onReconfigure : undefined}
          onOpenWallet={state.screen.variant === "stars_exhausted" ? deps.onOpenWallet : undefined}
          onQuit={deps.onQuit}
        />
      )
  }
  return null
}
