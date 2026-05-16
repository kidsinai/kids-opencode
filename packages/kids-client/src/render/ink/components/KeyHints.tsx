import React from "react"
import { Box, Text } from "ink"
import { getTheme } from "../theme.ts"

interface KeyHintsProps {
  hints: Array<{ key: string; label: string }>
}

export function KeyHints({ hints }: KeyHintsProps): React.ReactElement {
  const theme = getTheme()
  return (
    <Box paddingX={1}>
      {hints.map((h, i) => (
        <Box key={h.key} marginRight={i < hints.length - 1 ? 2 : 0}>
          <Text color={theme.accent}>[{h.key}]</Text>
          <Text color={theme.fg}> {h.label}</Text>
        </Box>
      ))}
    </Box>
  )
}
