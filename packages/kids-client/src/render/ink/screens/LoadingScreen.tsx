/**
 * Visible during ServeManager.ensureReady() (~1-5s window depending on
 * whether opencode serve is already running). Without this, the kid sees
 * a black terminal while the wrapper polls /app.
 */

import React from "react"
import { Box, Text } from "ink"
import Spinner from "ink-spinner"
import { getTheme } from "../theme.ts"

interface LoadingScreenProps {
  locale: "zh-Hans" | "en"
  message?: string
}

export function LoadingScreen({ locale, message }: LoadingScreenProps): React.ReactElement {
  const theme = getTheme()
  const label = message ?? (locale === "zh-Hans" ? "AI 老师正在准备…" : "Your AI teacher is getting ready…")
  return (
    <Box flexDirection="column" paddingY={1} paddingX={2}>
      <Box>
        <Text color={theme.accent}>
          <Spinner type="dots" />
        </Text>
        <Text color={theme.accent}> {label}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={theme.fgDim}>{locale === "zh-Hans" ? "几秒后就好" : "Just a few seconds"}</Text>
      </Box>
    </Box>
  )
}
