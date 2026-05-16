/**
 * §3.1 Startup screen — first impression. Must paint within 5s.
 *
 * Quick keys:
 *   Enter → start a free-play session
 *   c     → choose a Course Pack (V0 MVP: hardcoded portfolio-site)
 *   r     → resume the last session (V0 MVP: not implemented yet)
 *   h     → show help (kid-friendly)
 */

import React from "react"
import { Box, Text, useInput } from "ink"
import { getTheme } from "../theme.ts"
import { KeyHints } from "../components/KeyHints.tsx"

interface StartupScreenProps {
  locale: "zh-Hans" | "en"
  coursePack: string | null
  onStart: (mode: "free" | "course" | "resume" | "help") => void
}

export function StartupScreen({ locale, coursePack, onStart }: StartupScreenProps): React.ReactElement {
  const theme = getTheme()
  useInput((input, key) => {
    if (key.return) onStart(coursePack ? "course" : "free")
    else if (input === "c") onStart("course")
    else if (input === "r") onStart("resume")
    else if (input === "h") onStart("help")
  })
  const t = STRINGS[locale]
  return (
    <Box flexDirection="column" paddingY={1}>
      <Box borderStyle="double" borderColor={theme.border} paddingX={2} paddingY={1} flexDirection="column">
        <Text color={theme.accent} bold>
          Airbotix Kids OpenCode
        </Text>
        <Box marginTop={1} flexDirection="column">
          <Text color={theme.fg}>{t.greet1}</Text>
          <Text color={theme.fg}>{t.greet2}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.fgDim}>{t.disclaim}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.warn}>{t.helpline}</Text>
        </Box>
      </Box>
      <Box marginTop={1}>
        <KeyHints hints={[
          { key: "Enter", label: coursePack ? t.startCourse : t.startFree },
          { key: "c", label: t.pickCourse },
          { key: "r", label: t.resume },
          { key: "h", label: t.help },
        ]} />
      </Box>
    </Box>
  )
}

const STRINGS = {
  "zh-Hans": {
    greet1: "你好！我是 Kids OpenCode —— 帮你做编程项目的 AI 老师。",
    greet2: "",
    disclaim: "我不是真人，有时候会答错。遇到不懂的，问家长或老师。",
    helpline: "澳大利亚紧急求助：Kids Helpline 1800 55 1800",
    startFree: "开始新项目",
    startCourse: "继续 Course Pack",
    pickCourse: "选 Course Pack",
    resume: "继续上次",
    help: "帮助",
  },
  en: {
    greet1: "Hi! I'm Kids OpenCode — the AI teacher who helps you build coding projects.",
    greet2: "",
    disclaim: "I'm not a real person and I can be wrong. Ask a parent or teacher if you're unsure.",
    helpline: "In Australia: Kids Helpline 1800 55 1800",
    startFree: "Start a new project",
    startCourse: "Continue Course Pack",
    pickCourse: "Pick a Course Pack",
    resume: "Resume last session",
    help: "Help",
  },
} as const
