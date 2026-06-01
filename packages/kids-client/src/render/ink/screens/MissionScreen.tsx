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

import React, { useState, useEffect } from "react"
import { Box, Text, useInput } from "ink"
import { Header } from "../components/Header.tsx"
import { ChatStream } from "../components/ChatStream.tsx"
import { Input } from "../components/Input.tsx"
import { Thinking } from "../components/Thinking.tsx"
import { Toast } from "../components/Toast.tsx"
import { CommandSuggestions } from "../components/CommandSuggestions.tsx"
import { FileSuggestions } from "../components/FileSuggestions.tsx"
import { getTheme } from "../theme.ts"
import { useVoiceInput } from "../useVoiceInput.ts"
import type { KidsClientState } from "../../../core/store.ts"

// Module-level so the kid's prompt history survives MissionScreen remounts
// (e.g. after opening a picker and coming back) within one process.
const promptHistory: string[] = []

interface MissionScreenProps {
  state: KidsClientState
  locale: "zh-Hans" | "en"
  onPrompt: (text: string) => void
  onAbort: () => void
  /** Leave the mission and return to the startup menu. */
  onExit: () => void
  /** Autocomplete project files for an `@mention`. Optional (demo/tests omit). */
  onFindFiles?: (query: string) => Promise<string[]>
}

export function MissionScreen({ state, locale, onPrompt, onAbort, onExit, onFindFiles }: MissionScreenProps): React.ReactElement {
  const theme = getTheme()
  const [draft, setDraft] = useState("")
  // -1 = not browsing history; otherwise an index into promptHistory.
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [fileMatches, setFileMatches] = useState<string[]>([])
  const placeholder = locale === "zh-Hans" ? "想做什么？告诉我吧（中文/英文都行）" : "What would you like to make? (English or Chinese)"

  // `@file` autocomplete: when the current (last) token starts with "@", fetch
  // matching project files. Plain display — the kid finishes the name and the
  // AI reads it via the `read` tool.
  const lastToken = draft.split(/\s/).pop() ?? ""
  const atQuery = !draft.trim().startsWith("/") && lastToken.startsWith("@") ? lastToken.slice(1) : null
  useEffect(() => {
    if (atQuery === null || !onFindFiles) {
      setFileMatches([])
      return
    }
    let cancelled = false
    onFindFiles(atQuery).then((m) => { if (!cancelled) setFileMatches(m) }).catch(() => {})
    return () => { cancelled = true }
  }, [atQuery, onFindFiles])

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
      else if (draft.length > 0) { setDraft(""); setHistoryIdx(-1) }
      else onExit()
    } else if (key.upArrow && (draft.length === 0 || historyIdx >= 0)) {
      // ↑ recalls earlier prompts. Works from an empty box, or keeps walking
      // back once we're already browsing history.
      if (promptHistory.length === 0) return
      const next = historyIdx < 0 ? promptHistory.length - 1 : Math.max(0, historyIdx - 1)
      setHistoryIdx(next)
      setDraft(promptHistory[next] ?? "")
    } else if (key.downArrow && historyIdx >= 0) {
      const next = historyIdx + 1
      if (next >= promptHistory.length) { setHistoryIdx(-1); setDraft("") }
      else { setHistoryIdx(next); setDraft(promptHistory[next] ?? "") }
    } else if (input === " " && canTalk) {
      setDraft("")
      voice.startListening()
    }
  })

  const hint = locale === "zh-Hans"
    ? "提示：打 / 看命令 · @ 选文件 · ↑ 上一句 · 「空格」说话 · 「我做完了」验收 · ← 返回 · Esc 打断"
    : "Tip: / commands · @ files · ↑ last prompt · Space to talk · 'I'm done' to validate · ← back · Esc interrupts"

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
      {!voiceBusy && atQuery !== null && (
        <Box marginTop={1}>
          <FileSuggestions matches={fileMatches} locale={locale} />
        </Box>
      )}
      <Box marginTop={1}>
        {voiceBusy ? (
          <VoiceBar voiceState={voice.voiceState} meter={voice.meter} mode={voice.mode} locale={locale} theme={theme} />
        ) : (
          <Input
            value={draft}
            onChange={(v) => { setDraft(v); setHistoryIdx(-1) }}
            onSubmit={(v) => {
              const text = v.trim()
              if (!text) return
              if (promptHistory[promptHistory.length - 1] !== text) promptHistory.push(text)
              setHistoryIdx(-1)
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
