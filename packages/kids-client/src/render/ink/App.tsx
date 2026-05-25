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
  onSetupSave: (provider: ProviderId, apiKey: string) => Promise<{ ok: true } | { ok: false; reason: string }>
  onSetupContinue: () => Promise<void>
  onSetupSkip: () => void
  onSetupOAuthHandoff: (provider: ProviderId) => Promise<void>
  onTourDone: () => void
}

export function App(deps: AppDeps): React.ReactElement {
  const state = useSyncExternalStore(
    (cb) => deps.store.subscribe(cb),
    () => deps.store.getSnapshot(),
    () => deps.store.getSnapshot(),
  )

  // Dangerous-topic overlay takes absolute priority — it has to be the
  // first thing on screen the moment a pattern hits, even mid-stream.
  if (state.dangerousTopic) {
    return <DangerousTopicModal topic={state.dangerousTopic} locale={deps.locale} onAcknowledge={deps.onDangerousAcknowledge} />
  }

  // Permission modal is the next-highest priority.
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
      return <StartupScreen locale={deps.locale} coursePack={state.coursePack} onStart={deps.onStart} />
    case "mission":
      return <MissionScreen state={state} locale={deps.locale} onPrompt={deps.onPrompt} onAbort={deps.onAbort} />
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
    case "error":
      return (
        <ErrorScreen
          variant={state.screen.variant}
          detail={state.screen.detail}
          locale={deps.locale}
          onRetry={deps.onErrorRetry}
          onReconfigure={RECONFIGURABLE_VARIANTS.has(state.screen.variant) ? deps.onReconfigure : undefined}
          onQuit={deps.onQuit}
        />
      )
  }
}
