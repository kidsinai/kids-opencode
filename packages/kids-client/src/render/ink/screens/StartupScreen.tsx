/**
 * §3.1 Startup screen — first impression. Must paint within 5s.
 *
 * Quick keys:
 *   Enter → start a free-play session OR continue if a course pack is set
 *   c     → choose a Course Pack
 *   r     → resume the last session
 *   h     → show kid-friendly help
 */

import React from "react"
import { Box, Text, useInput } from "ink"
import { getTheme } from "../theme.ts"
import { KidsLogo } from "../components/KidsLogo.tsx"
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
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      <KidsLogo />
      <Box marginTop={1} flexDirection="column" alignItems="center">
        <Text color={theme.kid} bold>{t.tagline}</Text>
      </Box>
      <Box marginTop={1} flexDirection="column" alignItems="center">
        <Text color={theme.fg}>{t.line1}</Text>
        <Text color={theme.fg}>{t.line2}</Text>
        <Text color={theme.fg}>{t.line3}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.fgDim}>{t.disclaim}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.warn} bold>{t.helpline}</Text>
      </Box>
      <Box marginTop={2}>
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
    tagline: "🤖  你的 AI 编程伙伴  🤖",
    line1: "✨  跟 AI 一起做真实的项目",
    line2: "💡  没有工程师术语，听得懂",
    line3: "🎯  做完一关 → 庆祝下一关",
    disclaim: "我不是真人，有时候会答错。问家长或老师。",
    helpline: "🇦🇺  紧急求助：Kids Helpline 1800 55 1800",
    startFree: "开始新项目",
    startCourse: "继续 Course Pack",
    pickCourse: "选 Course Pack",
    resume: "继续上次",
    help: "帮助",
  },
  en: {
    tagline: "🤖  Your AI coding buddy  🤖",
    line1: "✨  Build real projects with AI help",
    line2: "💡  No engineering jargon — easy to follow",
    line3: "🎯  Finish a mission → celebrate the next one",
    disclaim: "I'm not a real person and I can be wrong. Ask a parent or teacher.",
    helpline: "🇦🇺  Emergency: Kids Helpline 1800 55 1800",
    startFree: "Start a new project",
    startCourse: "Continue Course Pack",
    pickCourse: "Pick a Course Pack",
    resume: "Resume last session",
    help: "Help",
  },
} as const
