/**
 * "Kids OpenCode" ASCII art logo, color-matched to the brand mark.
 *
 * Brand colors (per the official logo):
 *   K — cyan/blue
 *   I — orange/yellow
 *   D — green
 *   S — magenta/purple
 *
 * Each letter is 6 rows × ~7-8 cols of block characters. We render row-by-row
 * with separate <Text> colors per letter to get the multi-color effect Ink
 * can't otherwise produce inside a single string.
 */

import React from "react"
import { Box, Text } from "ink"
import { getTheme } from "../theme.ts"

// Block-letter rows. Each letter is a fixed-width column for clean alignment.
const ROWS: Array<{ K: string; I: string; D: string; S: string }> = [
  { K: "██╗  ██╗", I: "██╗", D: "██████╗ ", S: "███████╗" },
  { K: "██║ ██╔╝", I: "██║", D: "██╔══██╗", S: "██╔════╝" },
  { K: "█████╔╝ ", I: "██║", D: "██║  ██║", S: "███████╗" },
  { K: "██╔═██╗ ", I: "██║", D: "██║  ██║", S: "╚════██║" },
  { K: "██║  ██╗", I: "██║", D: "██████╔╝", S: "███████║" },
  { K: "╚═╝  ╚═╝", I: "╚═╝", D: "╚═════╝ ", S: "╚══════╝" },
]

const SPARKLE_ROW_TOP    = "      ✦       ⭐         ✦         ⭐      "
const SPARKLE_ROW_BOTTOM = "    ⭐      ✦        ⭐       ✦       "

export function KidsLogo(): React.ReactElement {
  const theme = getTheme()
  // Theme-driven — DARK uses cyanBright/yellow/greenBright/magentaBright,
  // LIGHT swaps to non-Bright variants (blue/yellow/green/magenta) that
  // hold contrast on white macOS Terminal default.
  const cK = theme.logoK
  const cI = theme.logoI
  const cD = theme.logoD
  const cS = theme.logoS
  const gap = "  " // 2-col gap between letters
  return (
    <Box flexDirection="column" alignItems="center">
      <Text color={theme.accent}>{SPARKLE_ROW_TOP}</Text>
      {ROWS.map((row, i) => (
        <Box key={i} flexDirection="row">
          <Text color={cK}>{row.K}</Text>
          <Text>{gap}</Text>
          <Text color={cI}>{row.I}</Text>
          <Text>{gap}</Text>
          <Text color={cD}>{row.D}</Text>
          <Text>{gap}</Text>
          <Text color={cS}>{row.S}</Text>
        </Box>
      ))}
      <Box marginTop={1}>
        <Text color={cK} bold>{"<"}</Text>
        <Text color={cK} bold>{" O"}</Text>
        <Text color={cD} bold>{"p"}</Text>
        <Text color={cD} bold>{"e"}</Text>
        <Text color={cD} bold>{"n"}</Text>
        <Text color={cD} bold>{"C"}</Text>
        <Text color={cK} bold>{"o"}</Text>
        <Text color={cS} bold>{"d"}</Text>
        <Text color={cS} bold>{"e "}</Text>
        <Text color={cS} bold>{">"}</Text>
      </Box>
      <Text color={cS}>{"     ━━━━━━━━━━━━━     "}</Text>
      <Text color={theme.accent}>{SPARKLE_ROW_BOTTOM}</Text>
    </Box>
  )
}
