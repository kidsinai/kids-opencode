/**
 * Inline `@file` suggestions, shown above the input when the kid's current
 * token starts with "@". Like CommandSuggestions, it's non-interactive: the kid
 * keeps typing the path and presses Enter. The matches are fetched by
 * MissionScreen (it owns the client) and passed in.
 */

import React from "react"
import { Box, Text } from "ink"
import { getTheme } from "../theme.ts"
import type { Locale } from "../../../core/commands.ts"

export function FileSuggestions({ matches, locale }: { matches: string[]; locale: Locale }): React.ReactElement {
  const theme = getTheme()
  if (matches.length === 0) {
    return (
      <Box marginBottom={1}>
        <Text color={theme.fgDim}>
          {locale === "zh-Hans" ? "没找到这个文件 — 继续打它的名字" : "No file yet — keep typing its name"}
        </Text>
      </Box>
    )
  }
  return (
    <Box marginBottom={1} flexDirection="column">
      {matches.map((path) => (
        <Box key={path}>
          <Text color={theme.accent}>@</Text>
          <Text color={theme.fg}>{path}</Text>
        </Box>
      ))}
      <Text color={theme.fgDim}>
        {locale === "zh-Hans" ? "打上文件名,AI 就能读它" : "Name a file and the AI can read it"}
      </Text>
    </Box>
  )
}
