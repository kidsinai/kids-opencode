/**
 * §3.2 Mission-in-progress screen.
 *
 * Layout: Header (mission progress + Stars) on top, chat stream in the
 * middle, input box at the bottom. Streaming AI replies render in-place
 * via ChatStream's <Static>/live split.
 */

import React, { useState } from "react"
import { Box } from "ink"
import { Header } from "../components/Header.tsx"
import { ChatStream } from "../components/ChatStream.tsx"
import { Input } from "../components/Input.tsx"
import { Thinking } from "../components/Thinking.tsx"
import type { KidsClientState } from "../../../core/store.ts"

interface MissionScreenProps {
  state: KidsClientState
  locale: "zh-Hans" | "en"
  onPrompt: (text: string) => void
}

export function MissionScreen({ state, locale, onPrompt }: MissionScreenProps): React.ReactElement {
  const [draft, setDraft] = useState("")
  const placeholder = locale === "zh-Hans" ? "想做什么？告诉我吧（中文/英文都行）" : "What would you like to make? (English or Chinese)"
  return (
    <Box flexDirection="column">
      <Header
        coursePack={state.coursePack}
        mission={state.mission}
        starsBalance={state.starsBalance}
        starsBudget={state.starsBudget}
      />
      <Box marginTop={1} flexDirection="column" flexGrow={1}>
        <ChatStream messages={state.messages} />
        {state.thinking && (
          <Box marginTop={1}>
            <Thinking locale={locale} />
          </Box>
        )}
      </Box>
      <Box marginTop={1}>
        <Input
          value={draft}
          onChange={setDraft}
          onSubmit={(v) => {
            const text = v.trim()
            if (!text) return
            setDraft("")
            onPrompt(text)
          }}
          placeholder={placeholder}
          disabled={state.thinking || state.pendingPermission !== null}
        />
      </Box>
    </Box>
  )
}
