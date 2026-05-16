/**
 * §3.2 Mission-in-progress screen.
 *
 * Layout: Header (mission progress + Stars) on top, chat stream in the
 * middle, input box at the bottom, optional Toast under that. Streaming
 * AI replies render in-place via ChatStream's <Static>/live split.
 *
 * Esc key while thinking → calls onAbort (wired by App-level to
 * client.session.abort()).
 */

import React, { useState } from "react"
import { Box, Text, useInput } from "ink"
import { Header } from "../components/Header.tsx"
import { ChatStream } from "../components/ChatStream.tsx"
import { Input } from "../components/Input.tsx"
import { Thinking } from "../components/Thinking.tsx"
import { Toast } from "../components/Toast.tsx"
import { getTheme } from "../theme.ts"
import type { KidsClientState } from "../../../core/store.ts"

interface MissionScreenProps {
  state: KidsClientState
  locale: "zh-Hans" | "en"
  onPrompt: (text: string) => void
  onAbort: () => void
}

export function MissionScreen({ state, locale, onPrompt, onAbort }: MissionScreenProps): React.ReactElement {
  const theme = getTheme()
  const [draft, setDraft] = useState("")
  const placeholder = locale === "zh-Hans" ? "想做什么？告诉我吧（中文/英文都行）" : "What would you like to make? (English or Chinese)"

  useInput((_, key) => {
    if (key.escape && state.thinking) onAbort()
  })

  const hint = locale === "zh-Hans"
    ? "提示：做完一关时打 /check 或「我做完了」就能验收 · 按 Esc 打断 AI"
    : "Tip: type /check or 'I'm done' to validate · Esc interrupts the AI"

  return (
    <Box flexDirection="column">
      <Header
        packTitle={state.packTitle}
        missionTitle={state.missionTitle}
        missionIndex={state.missionIndex}
        missionTotal={state.missionTotal}
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
      {state.toast ? (
        <Box marginTop={1}>
          <Toast toast={state.toast} />
        </Box>
      ) : (
        <Box marginTop={1}>
          <Text color={theme.fgDim} dimColor>{hint}</Text>
        </Box>
      )}
    </Box>
  )
}
