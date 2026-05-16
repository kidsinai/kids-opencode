import React from "react"
import { Box, Text } from "ink"
import { getTheme } from "../theme.ts"

interface HeaderProps {
  coursePack: string | null
  mission: string | null
  missionIndex?: number
  missionTotal?: number
  starsBalance: number
  starsBudget: number
}

export function Header({ coursePack, mission, missionIndex, missionTotal, starsBalance, starsBudget }: HeaderProps): React.ReactElement {
  const theme = getTheme()
  const missionStr = mission && missionIndex && missionTotal
    ? `Mission ${missionIndex}/${missionTotal} · ${titleCase(mission)}`
    : coursePack ?? "Free play"
  const stars = starsBudget > 0 ? `⭐ ${starsBalance}/${starsBudget}` : `⭐ ${starsBalance}`
  return (
    <Box borderStyle="round" borderColor={theme.border} paddingX={1} justifyContent="space-between">
      <Text color={theme.accent}>{missionStr}</Text>
      <Text color={theme.stars}>{stars}</Text>
    </Box>
  )
}

function titleCase(s: string): string {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}
