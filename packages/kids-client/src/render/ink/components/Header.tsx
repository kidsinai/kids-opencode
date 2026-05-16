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
  return (
    <Box borderStyle="round" borderColor={theme.border} paddingX={1} justifyContent="space-between">
      <Text color={theme.accent}>{left}</Text>
      <Text color={theme.stars}>{stars}</Text>
    </Box>
  )
}
