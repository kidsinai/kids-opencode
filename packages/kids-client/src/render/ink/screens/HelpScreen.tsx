/**
 * Kid-friendly help. Reached via [h] on the Startup screen, or [?] from
 * inside MissionScreen later.
 *
 * Year-6 reading level; key bindings spelled in plain language; emergency
 * helpline pinned.
 */

import React from "react"
import { Box, Text, useInput } from "ink"
import { getTheme } from "../theme.ts"

interface HelpScreenProps {
  locale: "zh-Hans" | "en"
  onBack: () => void
}

export function HelpScreen({ locale, onBack }: HelpScreenProps): React.ReactElement {
  const theme = getTheme()
  useInput((input, key) => {
    if (key.escape || key.return || input === "b" || input === "q") onBack()
  })
  const t = STRINGS[locale]
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.accent} paddingX={2} paddingY={1}>
      <Text color={theme.accent} bold>{t.title}</Text>
      <Box marginTop={1} flexDirection="column">
        <Text color={theme.fg}>{t.intro1}</Text>
        <Text color={theme.fg}>{t.intro2}</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={theme.warn} bold>{t.howAsk}</Text>
        <Text color={theme.fg}>{t.how1}</Text>
        <Text color={theme.fg}>{t.how2}</Text>
        <Text color={theme.fg}>{t.how3}</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={theme.warn} bold>{t.keys}</Text>
        {t.keymap.map((line, i) => (
          <Text key={i} color={theme.fg}>{line}</Text>
        ))}
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={theme.warn} bold>{t.safetyTitle}</Text>
        <Text color={theme.fg}>{t.safety1}</Text>
        <Text color={theme.danger}>{t.helpline}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.accent}>{t.backHint}</Text>
      </Box>
    </Box>
  )
}

const STRINGS = {
  "zh-Hans": {
    title: "怎么用 Kids OpenCode",
    intro1: "我是你的 AI 老师，可以帮你一起做编程项目。",
    intro2: "你告诉我你想做什么，我会一步一步引导你做出来。",
    howAsk: "怎么跟我说话",
    how1: "· 直接打字。中文英文都行。",
    how2: "· 想做完一关时打 /check 或者「我做完了」，我就帮你验收。",
    how3: "· 我每次要动你电脑上的东西前都会问你，按 y 同意。",
    keys: "按键提示",
    keymap: [
      "· Enter   送出消息",
      "· y / n / e   答 AI 的请求（同意 / 不要 / 我自己来）",
      "· Esc   AI 在说话时按一下可以打断它",
      "· Ctrl+C   完全退出（serve 也会停）",
    ],
    safetyTitle: "安全",
    safety1: "我不是真人，有时候会答错。遇到不懂的，问家长或老师。",
    helpline: "澳大利亚紧急求助：Kids Helpline 1800 55 1800",
    backHint: "[Enter / Esc / b] 回上一页",
  },
  en: {
    title: "How to use Kids OpenCode",
    intro1: "I'm your AI teacher. I can help you build coding projects.",
    intro2: "You tell me what you want to make, and I'll walk you through it step by step.",
    howAsk: "How to talk to me",
    how1: "· Just type. English or Chinese both work.",
    how2: "· When you think you're done, type /check or 'I'm done' and I'll check your work.",
    how3: "· Before I touch anything on your computer I'll ask. Press y to allow.",
    keys: "Keys",
    keymap: [
      "· Enter    Send a message",
      "· y / n / e   Reply to my requests (allow / stop / I'll do it)",
      "· Esc      Stop me while I'm talking",
      "· Ctrl+C   Quit (serve stops too)",
    ],
    safetyTitle: "Safety",
    safety1: "I'm not a real person and I can be wrong. Ask a parent or teacher if you're unsure.",
    helpline: "Australia emergency help: Kids Helpline 1800 55 1800",
    backHint: "[Enter / Esc / b] Back",
  },
} as const
