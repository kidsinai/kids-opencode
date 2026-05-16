/**
 * Top-level router. Reads store snapshot → picks which screen to render.
 *
 * The router is intentionally thin. All state mutation happens in the
 * core/ layer; this component only translates state.screen → JSX.
 */

import React, { useSyncExternalStore } from "react"
import { Box } from "ink"
import type { Store } from "../../core/store.ts"
import { StartupScreen } from "./screens/StartupScreen.tsx"
import { MissionScreen } from "./screens/MissionScreen.tsx"
import { PermissionModal } from "./screens/PermissionModal.tsx"
import { DangerousTopicModal } from "./screens/DangerousTopicModal.tsx"
import { ErrorScreen } from "./screens/ErrorScreen.tsx"

export interface AppDeps {
  store: Store
  locale: "zh-Hans" | "en"
  onStart: (mode: "free" | "course" | "resume" | "help") => void
  onPrompt: (text: string) => void
  onPermissionReply: (decision: "allow" | "deny" | "edit") => void
  onDangerousAcknowledge: () => void
  onErrorRetry: () => void
  onQuit: () => void
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
      return <Box />
    case "startup":
      return <StartupScreen locale={deps.locale} coursePack={state.coursePack} onStart={deps.onStart} />
    case "mission":
      return <MissionScreen state={state} locale={deps.locale} onPrompt={deps.onPrompt} />
    case "error":
      return (
        <ErrorScreen
          variant={state.screen.variant}
          detail={state.screen.detail}
          locale={deps.locale}
          onRetry={deps.onErrorRetry}
          onQuit={deps.onQuit}
        />
      )
  }
}
