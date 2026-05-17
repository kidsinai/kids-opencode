/**
 * First-run welcome tour — 3 steps between SetupScreen and StartupScreen.
 *
 * Triggered exactly once per install (gated by ~/.config/kids-opencode/tour-seen).
 * A returning kid who already has env vars set skips this entirely; only
 * fires when the wizard just ran. Skip ([s]) marks-seen the same as Done.
 *
 * Step content maps to the three things a 12-yo first-timer needs to know
 * before they look at the StartupScreen and freeze:
 *   1. What is a Course Pack?
 *   2. How do I talk to the AI?
 *   3. What do y / n / e mean when the AI asks permission?
 */

import React, { useState } from "react"
import { Box, Text, useInput } from "ink"
import { getTheme } from "../theme.ts"
import { KidsLogo } from "../components/KidsLogo.tsx"

interface TourScreenProps {
  locale: "zh-Hans" | "en"
  onDone: () => void
}

export function TourScreen({ locale, onDone }: TourScreenProps): React.ReactElement {
  const theme = getTheme()
  const t = STRINGS[locale]
  const [step, setStep] = useState(0)
  const last = t.steps.length - 1

  useInput((input, key) => {
    if (input === "s" || input === "S") {
      onDone()
      return
    }
    if (key.return || key.rightArrow) {
      if (step >= last) onDone()
      else setStep((s) => Math.min(last, s + 1))
      return
    }
    if (key.leftArrow) {
      setStep((s) => Math.max(0, s - 1))
    }
  })

  const current = t.steps[step]!
  const isLast = step === last

  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      <KidsLogo />
      <Box marginTop={1}>
        <Text color={theme.fgDim}>{t.progress(step + 1, t.steps.length)}</Text>
      </Box>
      <Box marginTop={1} borderStyle="round" borderColor={theme.accent} paddingX={3} paddingY={1} flexDirection="column" width={68}>
        <Text color={theme.accent} bold>{current.title}</Text>
        <Box marginTop={1} flexDirection="column">
          {current.body.map((line, i) => (
            <Text key={i} color={theme.fg}>{line}</Text>
          ))}
        </Box>
      </Box>
      <Box marginTop={2}>
        <Text color={theme.accent}>{isLast ? t.startNow : t.next}</Text>
        <Text color={theme.fg}>  ·  </Text>
        <Text color={theme.fgDim}>{t.skip}</Text>
      </Box>
    </Box>
  )
}

const STRINGS = {
  "zh-Hans": {
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    next: "[Enter] 下一步  [←] 上一步",
    startNow: "[Enter] 开始玩  [←] 上一步",
    skip: "[s] 跳过引导",
    steps: [
      {
        title: "📦  什么是 Course Pack？",
        body: [
          "Course Pack 是老师为你设计好的一组小项目。",
          "比如：「做一个网站介绍你的小狗」、「画一只 AI 恐龙」。",
          "",
          "每个 Pack 里有几个 Mission，一步一步带你完成。",
          "做完一个 Mission，✨ 就解锁下一个。",
        ],
      },
      {
        title: "💬  怎么跟我说话？",
        body: [
          "直接打中文或英文，按 Enter 发给我。比如：",
          "  「帮我做一个红色按钮」",
          "  「换一个更可爱的字体」",
          "",
          "想验收一关：打 「我做完了」 或 /check",
          "想叫我停下来：按 Esc",
        ],
      },
      {
        title: "🔐  y / n / e — 你说了算",
        body: [
          "我要动你的文件之前，会先问你。三个按键：",
          "",
          "  [y]  可以做  — 我一次操作",
          "  [n]  不要    — 我会停下来，换个办法",
          "  [e]  我来改  — 你自己写这一步，告诉我你想怎么做",
          "",
          "我永远不会绕过这一步偷偷改文件。",
        ],
      },
    ],
  },
  en: {
    progress: (cur: number, total: number) => `${cur} / ${total}`,
    next: "[Enter] next  [←] back",
    startNow: "[Enter] start playing  [←] back",
    skip: "[s] skip tour",
    steps: [
      {
        title: "📦  What's a Course Pack?",
        body: [
          "A Course Pack is a set of small projects a teacher made for you.",
          "Like: \"Build a website about your dog\" or \"Draw an AI dinosaur\".",
          "",
          "Each Pack has a few Missions, walking you through step by step.",
          "Finish one Mission, ✨ unlock the next.",
        ],
      },
      {
        title: "💬  How do I talk to you?",
        body: [
          "Just type in English or Chinese and press Enter. For example:",
          "  \"Make me a red button\"",
          "  \"Use a cuter font\"",
          "",
          "To check off a mission: type \"I'm done\" or /check",
          "To stop me mid-reply: press Esc",
        ],
      },
      {
        title: "🔐  y / n / e — you're in charge",
        body: [
          "Before I touch your files I'll ask you. Three keys:",
          "",
          "  [y]  go ahead   — I'll do it once",
          "  [n]  stop        — I'll back off and try another way",
          "  [e]  I'll do it  — you write this step and tell me what you want",
          "",
          "I'll never sneak past this to change files on my own.",
        ],
      },
    ],
  },
} as const
