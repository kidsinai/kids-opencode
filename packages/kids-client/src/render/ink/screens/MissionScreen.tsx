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
import { CommandSuggestions } from "../components/CommandSuggestions.tsx"
import { getTheme } from "../theme.ts"
import { useVoiceInput } from "../useVoiceInput.ts"
import type { KidsClientState } from "../../../core/store.ts"

interface MissionScreenProps {
  state: KidsClientState
  locale: "zh-Hans" | "en"
  onPrompt: (text: string) => void
  onAbort: () => void
  /** Leave the mission and return to the startup menu. */
  onExit: () => void
}

export function MissionScreen({ state, locale, onPrompt, onAbort, onExit }: MissionScreenProps): React.ReactElement {
  const theme = getTheme()
  const [draft, setDraft] = useState("")
  const placeholder = locale === "zh-Hans" ? "想做什么？告诉我吧（中文/英文都行）" : "What would you like to make? (English or Chinese)"

  const voice = useVoiceInput(onPrompt)
  const voiceBusy = voice.voiceState !== "idle"
  // Spacebar talks ONLY when the kid isn't mid-typing — a non-empty draft means
  // they're writing, so spacebar must stay a literal space there.
  const canTalk = !state.thinking && state.pendingPermission === null && draft.trim() === "" && voice.ready

  // ← (left arrow) is the kid-facing "go back" key, matching TourScreen's ←.
  // It only leaves the mission when the input box is empty so it never fights
  // TextInput's cursor movement mid-typing (same empty-draft gate as talk).
  //
  // Esc is overloaded so it never eats the kid's typing: while recording it
  // cancels voice; while the AI is thinking it interrupts; with text typed it
  // clears the draft; when idle + empty it also leaves back to the startup menu
  // (so the kid isn't trapped here — dogfood feedback).
  const canGoBack = !state.thinking && draft.length === 0
  useInput((input, key) => {
    if (voiceBusy) {
      if (key.escape) voice.cancel()
      else if (key.return || input === " ") voice.stopListening()
      return
    }
    if (key.leftArrow && canGoBack) {
      onExit()
    } else if (key.escape) {
      if (state.thinking) onAbort()
      else if (draft.length > 0) setDraft("")
      else onExit()
    } else if (input === " " && canTalk) {
      setDraft("")
      voice.startListening()
    }
  })

  const hint = locale === "zh-Hans"
    ? "提示：打 / 看命令 · 按「空格」说话 · 「我做完了」验收 · 按 ← 返回菜单 · AI 说话时 Esc 打断"
    : "Tip: type / for commands · Space to talk · 'I'm done' to validate · ← to go back · Esc interrupts the AI"

  return (
    <Box flexDirection="column" flexGrow={1}>
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
      {!voiceBusy && draft.trim().startsWith("/") && (
        <Box marginTop={1}>
          <CommandSuggestions query={draft} locale={locale} />
        </Box>
      )}
      <Box marginTop={1}>
        {voiceBusy ? (
          <VoiceBar voiceState={voice.voiceState} meter={voice.meter} mode={voice.mode} locale={locale} theme={theme} />
        ) : (
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
        )}
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

interface VoiceBarProps {
  voiceState: ReturnType<typeof useVoiceInput>["voiceState"]
  meter: string
  mode: "deeprouter" | "mock"
  locale: "zh-Hans" | "en"
  theme: ReturnType<typeof getTheme>
}

/** Replaces the input box while a voice turn is in flight: shows the mic
 *  indicator + live meter while listening, and a status line otherwise. */
function VoiceBar({ voiceState, meter, mode, locale, theme }: VoiceBarProps): React.ReactElement {
  const zh = locale === "zh-Hans"
  const label =
    voiceState === "listening"
      ? zh ? "🎙 听你说…（再按空格 或 回车 结束，Esc 取消）" : "🎙 Listening… (Space/Enter to finish, Esc to cancel)"
      : voiceState === "transcribing"
        ? zh ? "✍️ 正在听懂你说的话…" : "✍️ Figuring out what you said…"
        : voiceState === "error"
          ? zh ? "😅 没听清，按空格再试一次" : "😅 Didn't catch that — press Space to retry"
          : zh ? "小助手在想…" : "Thinking…"

  return (
    <Box borderStyle="single" borderColor={theme.kid} paddingX={1} flexDirection="column">
      <Box>
        <Text color={theme.kid}>{label}</Text>
      </Box>
      {voiceState === "listening" && (
        <Box>
          <Text color={theme.accent}>{meter}</Text>
          {mode === "mock" && (
            <Text color={theme.fgDim} dimColor>{zh ? "  （演示模式）" : "  (demo mode)"}</Text>
          )}
        </Box>
      )}
    </Box>
  )
}
