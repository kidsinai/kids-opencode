/**
 * §3.1 [c] option — list installed Course Packs and let the kid pick one.
 * On selection, the parent transitions to MissionScreen with that pack
 * loaded.
 *
 * Up / Down to move, Enter to select, Esc to go back.
 */

import React, { useState } from "react"
import { Box, Text, useInput } from "ink"
import { getTheme } from "../theme.ts"
import type { InstalledPack } from "../../../core/course-pack.ts"

interface CoursePackPickerProps {
  locale: "zh-Hans" | "en"
  packs: InstalledPack[]
  onPick: (packId: string) => void
  onBack: () => void
}

export function CoursePackPicker({ locale, packs, onPick, onBack }: CoursePackPickerProps): React.ReactElement {
  const theme = getTheme()
  const [idx, setIdx] = useState(0)
  useInput((_, key) => {
    if (key.escape) onBack()
    else if (key.upArrow) setIdx((i) => Math.max(0, i - 1))
    else if (key.downArrow) setIdx((i) => Math.min(packs.length - 1, i + 1))
    else if (key.return && packs[idx]) onPick(packs[idx]!.id)
  })
  const t = STRINGS[locale]
  if (packs.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor={theme.warn} paddingX={2} paddingY={1}>
        <Text color={theme.warn} bold>{t.empty}</Text>
        <Box marginTop={1}>
          <Text color={theme.fgDim}>{t.emptyHint}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.accent}>{t.backHint}</Text>
        </Box>
      </Box>
    )
  }
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.accent} paddingX={2} paddingY={1}>
      <Text color={theme.accent} bold>{t.title}</Text>
      <Box marginTop={1} flexDirection="column">
        {packs.map((p, i) => {
          const active = i === idx
          return (
            <Box key={p.id} marginBottom={i === packs.length - 1 ? 0 : 0}>
              <Text color={active ? theme.kid : theme.fg}>{active ? "▶ " : "  "}</Text>
              <Box flexDirection="column" flexGrow={1}>
                <Text color={active ? theme.accent : theme.fg} bold={active}>{p.title}</Text>
                {p.shortDescription && (
                  <Text color={theme.fgDim} dimColor={!active}>  {p.shortDescription}</Text>
                )}
                <Text color={theme.fgDim} dimColor>  {t.meta(p.missionCount, p.starsBudget)}</Text>
              </Box>
            </Box>
          )
        })}
      </Box>
      <Box marginTop={1}>
        <Text color={theme.accent}>{t.hints}</Text>
      </Box>
    </Box>
  )
}

const STRINGS = {
  "zh-Hans": {
    title: "选一个 Course Pack",
    empty: "还没装任何 Course Pack",
    emptyHint: "Course Pack 是 Airbotix 老师做的引导式项目。请家长重新装 kids-opencode 把它带回来。",
    backHint: "[Esc / Enter] 返回",
    hints: "[↑↓] 选 · [Enter] 确认 · [Esc] 返回",
    meta: (missions: number, stars: number) =>
      stars > 0 ? `${missions} 个 Mission · 预算 ${stars}⭐` : `${missions} 个 Mission`,
  },
  en: {
    title: "Pick a Course Pack",
    empty: "No Course Packs installed yet",
    emptyHint: "Course Packs are guided projects from Airbotix. Ask a grown-up to reinstall kids-opencode.",
    backHint: "[Esc / Enter] Back",
    hints: "[↑↓] move · [Enter] choose · [Esc] back",
    meta: (missions: number, stars: number) =>
      stars > 0 ? `${missions} missions · budget ${stars}⭐` : `${missions} missions`,
  },
} as const
