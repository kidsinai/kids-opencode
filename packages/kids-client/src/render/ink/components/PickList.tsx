/**
 * Generic full-width selectable list — ↑/↓ to move, Enter to pick, Esc to go
 * back. Reused by the `/model` and `/sessions` pickers so they share the
 * kid-friendly look of CoursePackPicker without duplicating the keyboard idiom.
 */

import React, { useState } from "react"
import { Box, Text, useInput } from "ink"
import { getTheme } from "../theme.ts"

export interface PickItem {
  id: string
  label: string
  /** Optional secondary line (e.g. provider, or session id). */
  sublabel?: string
}

interface PickListProps {
  title: string
  items: PickItem[]
  hints: string
  emptyText: string
  onPick: (id: string) => void
  onBack: () => void
}

export function PickList({ title, items, hints, emptyText, onPick, onBack }: PickListProps): React.ReactElement {
  const theme = getTheme()
  const [idx, setIdx] = useState(0)
  useInput((_, key) => {
    if (key.escape || key.leftArrow) onBack()
    else if (key.upArrow) setIdx((i) => Math.max(0, i - 1))
    else if (key.downArrow) setIdx((i) => Math.min(items.length - 1, i + 1))
    else if (key.return && items[idx]) onPick(items[idx]!.id)
  })
  return (
    <Box flexDirection="column" borderStyle="single" borderColor={theme.accent} paddingX={2} paddingY={1} width="100%">
      <Text color={theme.accent} bold>{title}</Text>
      <Box marginTop={1} flexDirection="column">
        {items.length === 0 ? (
          <Text color={theme.fgDim}>{emptyText}</Text>
        ) : (
          items.map((item, i) => {
            const active = i === idx
            return (
              <Box key={item.id}>
                <Text color={active ? theme.kid : theme.fg}>{active ? "▶ " : "  "}</Text>
                <Box flexDirection="column" flexGrow={1}>
                  <Text color={active ? theme.accent : theme.fg} bold={active}>{item.label}</Text>
                  {item.sublabel && <Text color={theme.fgDim} dimColor={!active}>  {item.sublabel}</Text>}
                </Box>
              </Box>
            )
          })
        )}
      </Box>
      <Box marginTop={1}>
        <Text color={theme.accent}>{hints}</Text>
      </Box>
    </Box>
  )
}
