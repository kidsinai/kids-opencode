/**
 * Hard overlay shown when the kid types or the AI emits content matching
 * one of the patterns in kids-tui-plugin/src/dangerous-topic.ts. Blocks
 * chat until kid presses Enter to acknowledge.
 *
 * The point isn't to be punitive — it's to make sure the Kids Helpline
 * number is on-screen at the moment a kid might need it.
 */

import React from "react"
import { Box, Text, useInput } from "ink"
import { getTheme } from "../theme.ts"
import type { DangerousTopic } from "../../../core/store.ts"

interface DangerousTopicModalProps {
  topic: DangerousTopic
  locale: "zh-Hans" | "en"
  onAcknowledge: () => void
}

export function DangerousTopicModal({ locale, onAcknowledge }: DangerousTopicModalProps): React.ReactElement {
  const theme = getTheme()
  useInput((_, key) => {
    if (key.return) onAcknowledge()
  })
  const t = STRINGS[locale]
  return (
    <Box flexDirection="column" borderStyle="double" borderColor={theme.danger} paddingX={2} paddingY={1}>
      <Text color={theme.danger} bold>
        {t.title}
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text color={theme.fg}>{t.body1}</Text>
        <Text color={theme.fg}>{t.body2}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.warn} bold>
          {t.helpline}
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.fgDim}>{t.dismiss}</Text>
      </Box>
    </Box>
  )
}

const STRINGS = {
  "zh-Hans": {
    title: "想跟你说一件重要的事",
    body1: "AI 不是真人，没办法帮你处理特别难受或者特别紧急的事。",
    body2: "请马上找你信任的大人（家长、老师、亲戚），或者拨打求助热线。",
    helpline: "Kids Helpline 澳大利亚 1800 55 1800（免费 24 小时）",
    dismiss: "[Enter] 我知道了",
  },
  en: {
    title: "Something important to tell you",
    body1: "I'm an AI, not a person. I'm not the right help for something hard or urgent.",
    body2: "Please tell an adult you trust right now (a parent, teacher, or relative), or call the helpline below.",
    helpline: "Kids Helpline AU 1800 55 1800 — free, 24/7",
    dismiss: "[Enter] I understand",
  },
} as const
