/**
 * Standalone voice-input demo — `bun run voice-demo`.
 *
 * Renders the real MissionScreen with a fake in-memory store and a no-op LLM,
 * so a human can try the voice flow end-to-end (press Space → talk → it echoes
 * the transcript as a kid message) WITHOUT needing opencode serve, a provider
 * key, or the wallet/audit backend. This is the "you test it" harness.
 *
 * Behaviour by environment:
 *   - sox or ffmpeg on PATH  → real mic capture to a wav.
 *   - KIDS_STT_* env set      → real DeepRouter transcription of that wav.
 *   - neither                 → demo mode: canned transcript, flow still works.
 */

import React, { useState } from "react"
import { render, Box, Text } from "ink"
import { MissionScreen } from "./render/ink/screens/MissionScreen.tsx"
import type { ChatMessage, KidsClientState } from "./core/store.ts"

const LOCALE: "zh-Hans" | "en" = process.env.KIDS_LOCALE === "en" ? "en" : "zh-Hans"

function baseState(messages: ChatMessage[]): KidsClientState {
  return {
    screen: { kind: "mission" },
    sessionId: "demo",
    messages,
    starsBalance: 100,
    starsBudget: 200,
    pendingPermission: null,
    dangerousTopic: null,
    thinking: false,
    coursePack: "voice-demo",
    mission: "demo",
    packTitle: LOCALE === "en" ? "Voice Demo" : "语音演示",
    missionTitle: LOCALE === "en" ? "Press Space and talk" : "按空格说话试试",
    missionIndex: 1,
    missionTotal: 1,
    toast: null,
    auditBuffer: [],
    selectedModel: null,
    selectedModelLabel: null,
  }
}

let counter = 0

function DemoApp(): React.ReactElement {
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const onPrompt = (text: string) => {
    // Echo the (typed or transcribed) text as the kid's message, then a canned
    // "AI" acknowledgement so the loop is visibly closed.
    const ts = 1_700_000_000_000 + counter
    setMessages((prev) => [
      ...prev,
      { id: `k${counter++}`, actor: "kid", text, streaming: false, ts },
      {
        id: `a${counter++}`,
        actor: "agent",
        text: LOCALE === "en" ? `Got it — you said: "${text}"` : `收到啦——你说的是：「${text}」`,
        streaming: false,
        ts: ts + 1,
      },
    ])
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="magenta">
          {LOCALE === "en" ? "🎙 Voice demo — press Space to talk, Esc to quit" : "🎙 语音演示 — 按空格说话，Esc 退出"}
        </Text>
      </Box>
      <MissionScreen state={baseState(messages)} locale={LOCALE} onPrompt={onPrompt} onAbort={() => {}} onExit={() => process.exit(0)} />
    </Box>
  )
}

const { waitUntilExit } = render(<DemoApp />)
void waitUntilExit()
