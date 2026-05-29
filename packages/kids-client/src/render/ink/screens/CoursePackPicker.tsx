/**
 * Project-type picker — first impression for a kid with no `--course` flag.
 *
 * Lists installed packs (Game / Website / …) plus a synthetic "I don't know
 * yet — just chat" entry that drops into free-play. Selection routes via the
 * orchestrator's onPick callback; the magic `_free` id triggers free-play.
 *
 * Up / Down to move, Enter to select, Esc to go back to StartupScreen.
 */

import React, { useMemo, useState } from "react"
import { Box, Text, useInput } from "ink"
import { getTheme } from "../theme.ts"
import type { InstalledPack } from "../../../core/course-pack.ts"

/** Synthetic id reserved for the "just chat" entry; orchestrator maps this to free-play. */
export const FREE_PLAY_PACK_ID = "_free"

interface CoursePackPickerProps {
  locale: "zh-Hans" | "en"
  packs: InstalledPack[]
  onPick: (packId: string) => void
  onBack: () => void
}

interface PickerRow {
  id: string
  icon: string
  label: string
  description: string | null
  /** Optional meta line ("3 missions · budget 40⭐") — null hides it. */
  meta: string | null
}

export function CoursePackPicker({ locale, packs, onPick, onBack }: CoursePackPickerProps): React.ReactElement {
  const theme = getTheme()
  const t = STRINGS[locale]
  const rows: PickerRow[] = useMemo(() => buildRows(packs, t), [packs, t])
  const [idx, setIdx] = useState(0)
  useInput((_, key) => {
    if (key.escape) onBack()
    else if (key.upArrow) setIdx((i) => Math.max(0, i - 1))
    else if (key.downArrow) setIdx((i) => Math.min(rows.length - 1, i + 1))
    else if (key.return && rows[idx]) onPick(rows[idx]!.id)
  })
  const noRealPacks = packs.length === 0
  if (noRealPacks) {
    // Course Pack install is broken — surface it loudly, but still let the kid
    // drop into free-play via the synthetic entry.
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
        {rows.map((row, i) => {
          const active = i === idx
          return (
            <Box key={row.id}>
              <Text color={active ? theme.kid : theme.fg}>{active ? "▶ " : "  "}</Text>
              <Text>{row.icon}{row.icon ? "  " : ""}</Text>
              <Box flexDirection="column" flexGrow={1}>
                <Text color={active ? theme.accent : theme.fg} bold={active}>{row.label}</Text>
                {row.description && (
                  <Text color={theme.fgDim} dimColor={!active}>  {row.description}</Text>
                )}
                {row.meta && (
                  <Text color={theme.fgDim} dimColor>  {row.meta}</Text>
                )}
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

interface PickerStrings {
  freePlayLabel: string
  freePlayDescription: string
  meta: (missions: number, stars: number) => string
}

function buildRows(packs: InstalledPack[], t: PickerStrings): PickerRow[] {
  const rows: PickerRow[] = packs.map((p) => ({
    id: p.id,
    icon: p.icon ?? "📦",
    label: p.pickerLabel ?? p.title,
    description: p.shortDescription,
    meta: p.missionCount > 0 ? t.meta(p.missionCount, p.starsBudget) : null,
  }))
  rows.push({
    id: FREE_PLAY_PACK_ID,
    icon: "🤔",
    label: t.freePlayLabel,
    description: t.freePlayDescription,
    meta: null,
  })
  return rows
}

const STRINGS = {
  "zh-Hans": {
    title: "你好呀. 今天想做点啥?",
    empty: "还没装任何 Course Pack",
    emptyHint: "Course Pack 是 Airbotix 老师做的引导式项目。请家长重新装 kids-opencode 把它带回来。",
    backHint: "[Esc / Enter] 返回",
    hints: "[↑↓] 选 · [Enter] 确认 · [Esc] 返回",
    freePlayLabel: "还没想好 — 聊聊看",
    freePlayDescription: "先跟 AI 聊一聊，再决定做啥也行。",
    meta: (missions: number, stars: number) =>
      stars > 0 ? `${missions} 个 Mission · 预算 ${stars}⭐` : `${missions} 个 Mission`,
  },
  en: {
    title: "Welcome, friend. What do you want to make today?",
    empty: "No Course Packs installed yet",
    emptyHint: "Course Packs are guided projects from Airbotix. Ask a grown-up to reinstall kids-opencode.",
    backHint: "[Esc / Enter] Back",
    hints: "[↑↓] move · [Enter] choose · [Esc] back",
    freePlayLabel: "I don't know yet — just chat",
    freePlayDescription: "Talk to the AI first, then decide what to make.",
    meta: (missions: number, stars: number) =>
      stars > 0 ? `${missions} missions · budget ${stars}⭐` : `${missions} missions`,
  },
} as const
