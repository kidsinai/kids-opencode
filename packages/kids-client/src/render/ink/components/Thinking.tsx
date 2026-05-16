import React from "react"
import { Box, Text } from "ink"
import Spinner from "ink-spinner"
import { getTheme } from "../theme.ts"

interface ThinkingProps {
  locale: "zh-Hans" | "en"
}

export function Thinking({ locale }: ThinkingProps): React.ReactElement {
  const theme = getTheme()
  const label = locale === "zh-Hans" ? "AI 老师在想…" : "Your AI teacher is thinking…"
  return (
    <Box>
      <Text color={theme.agent}>
        <Spinner type="dots" />
      </Text>
      <Text color={theme.agent}> {label}</Text>
    </Box>
  )
}
