import React from "react"
import { Box, Text } from "ink"
import { getTheme } from "../theme.ts"

interface HeaderProps {
  packTitle: string | null
  missionTitle: string | null
  missionIndex: number | null
  missionTotal: number | null
  starsBalance: number
  starsBudget: number
}

export function Header({ packTitle, missionTitle, missionIndex, missionTotal, starsBalance, starsBudget }: HeaderProps): React.ReactElement {
  const theme = getTheme()
  // Per PRD §3.2 mockup: "Mission 1/3 · 项目设置 + 第一个 HTML 页面 · ⭐ 余 36/40"
  let left: string
  if (missionIndex && missionTotal && missionTitle) {
    left = `Mission ${missionIndex}/${missionTotal} · ${missionTitle}`
  } else if (packTitle) {
    left = packTitle
  } else {
    left = "Free play"
  }
  const stars =
    starsBudget > 0
      ? `⭐ ${starsBalance}/${starsBudget}`
      : `⭐ ${starsBalance}`
  // borderStyle="round" + justifyContent="space-between" without an explicit
  // width caused a cascade of stacked top-borders under Ink 5 + Bun — the
  // Header re-rendered on every keystroke / spinner tick with a slightly
  // different computed width, and Ink's diff failed to clear the old top
  // border. Forcing width to the current terminal column count locks the
  // measurement, and "single" border chars sidestep the rounded-corner
  // width-counting glitch we hit in workshop dogfood (round corners stay
  // available on Setup / Tour / Help screens which don't re-render rapidly).
  const width = process.stdout.columns && process.stdout.columns > 4 ? process.stdout.columns : 80
  return (
    <Box borderStyle="single" borderColor={theme.border} paddingX={1} justifyContent="space-between" width={width}>
      <Text color={theme.accent}>{left}</Text>
      <Text color={theme.stars}>{stars}</Text>
    </Box>
  )
}
