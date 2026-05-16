/**
 * PRD §3.3 "Mission 完成有 ASCII 烟花". Renders when the in-TUI check
 * runner reports `ok: true`. Includes the friendly completion message
 * from the pack's acceptance.yml and a celebration animation.
 *
 * Esc / Enter to return to the Mission screen (for free play after) or
 * pick the next Mission.
 */

import React from "react"
import { Box, Text, useInput } from "ink"
import { getTheme } from "../theme.ts"

interface MissionCompleteScreenProps {
  locale: "zh-Hans" | "en"
  missionId: string
  missionTitle: string | null
  passed: number
  total: number
  completionMessage: string
  hasNextMission: boolean
  onNext: () => void
  onBack: () => void
}

export function MissionCompleteScreen({
  locale,
  missionId,
  missionTitle,
  passed,
  total,
  completionMessage,
  hasNextMission,
  onNext,
  onBack,
}: MissionCompleteScreenProps): React.ReactElement {
  const theme = getTheme()
  useInput((input, key) => {
    if (key.return && hasNextMission) onNext()
    else if (key.escape || input === "b" || input === "q") onBack()
    else if (input === "n" && hasNextMission) onNext()
  })
  const t = STRINGS[locale]
  return (
    <Box flexDirection="column" borderStyle="double" borderColor={theme.success} paddingX={2} paddingY={1}>
      <Box flexDirection="column">
        {FIREWORKS.map((line, i) => (
          <Text key={i} color={pickColor(theme, i)}>{line}</Text>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color={theme.success} bold>
          {t.headline}
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={theme.fg}>{t.detail(missionTitle ?? missionId, passed, total)}</Text>
        <Text color={theme.fgDim}>{completionMessage}</Text>
      </Box>
      <Box marginTop={1}>
        {hasNextMission ? (
          <>
            <Box marginRight={2}>
              <Text color={theme.accent}>[Enter / n]</Text>
              <Text color={theme.fg}> {t.next}</Text>
            </Box>
            <Box>
              <Text color={theme.accent}>[Esc / b]</Text>
              <Text color={theme.fg}> {t.back}</Text>
            </Box>
          </>
        ) : (
          <Box>
            <Text color={theme.accent}>[Enter / Esc]</Text>
            <Text color={theme.fg}> {t.back}</Text>
          </Box>
        )}
      </Box>
    </Box>
  )
}

const FIREWORKS = [
  "        *       .      *",
  "    .      *      .    *",
  "  *    .       *    .   ",
  "      🎆   🎉   🎆      ",
  "  .    *       .    *   ",
  "    *      .      *    .",
]

function pickColor(theme: ReturnType<typeof getTheme>, i: number): string {
  const palette = [theme.accent, theme.success, theme.stars, theme.kid, theme.agent]
  return palette[i % palette.length] ?? theme.fg
}

const STRINGS = {
  "zh-Hans": {
    headline: "Mission 完成！",
    detail: (title: string, p: number, t: number) =>
      `「${title}」 · ${p}/${t} 项检查全部通过 ✓`,
    next: "下一个 Mission",
    back: "回到项目",
  },
  en: {
    headline: "Mission complete!",
    detail: (title: string, p: number, t: number) =>
      `"${title}" · ${p}/${t} checks passed ✓`,
    next: "Next Mission",
    back: "Back to project",
  },
} as const
