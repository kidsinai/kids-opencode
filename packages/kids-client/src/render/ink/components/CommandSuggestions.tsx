/**
 * Inline slash-command suggestions, shown above the input the moment the kid's
 * draft starts with "/". Non-interactive on purpose: the kid keeps typing and
 * presses Enter, which submits the draft to onPrompt where it's dispatched.
 * This gives opencode's "type / → see commands" feel without intercepting
 * keystrokes out of the text input. The closest match is highlighted.
 */

import React from "react"
import { Box, Text } from "ink"
import { getTheme } from "../theme.ts"
import { filterCommands, commandLabel, commandHint, type Locale } from "../../../core/commands.ts"

const MAX_SHOWN = 6

export function CommandSuggestions({ query, locale }: { query: string; locale: Locale }): React.ReactElement | null {
  const theme = getTheme()
  const matches = filterCommands(query).slice(0, MAX_SHOWN)
  if (matches.length === 0) {
    return (
      <Box marginBottom={1} flexDirection="column">
        <Text color={theme.fgDim}>
          {locale === "zh-Hans" ? "没有这个命令 — 试试 /help" : "No such command — try /help"}
        </Text>
      </Box>
    )
  }
  // Highlight an exact-ish lead match (full slash typed) so Enter feels obvious.
  const q = query.trim().toLowerCase()
  return (
    <Box marginBottom={1} flexDirection="column">
      {matches.map((c) => {
        const lead = c.slash === q || c.aliases?.includes(q)
        return (
          <Box key={c.id}>
            <Text color={lead ? theme.kid : theme.accent} bold={lead}>{c.slash}</Text>
            <Text color={theme.fg}>{"  "}{commandLabel(c, locale)}</Text>
            <Text color={theme.fgDim} dimColor>{"  — "}{commandHint(c, locale)}</Text>
          </Box>
        )
      })}
      <Text color={theme.fgDim}>
        {locale === "zh-Hans" ? "输入命令后按 Enter 执行" : "Finish the command and press Enter"}
      </Text>
    </Box>
  )
}
