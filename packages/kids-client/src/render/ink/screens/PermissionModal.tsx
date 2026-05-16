/**
 * §3.4 Permission confirmation. Modal — blocks input until kid chooses
 * y (allow once) / n (deny) / e (edit / I'll do it myself).
 *
 * y → client.permission.reply(id, { reply: "once" })
 * n → client.permission.reply(id, { reply: "reject" })
 * e → close modal, send a fresh kid prompt of the form "no, do it differently"
 *
 * The PRD uses "y/n/e" to avoid the engineering-vibes of allow/deny.
 */

import React from "react"
import { Box, Text, useInput } from "ink"
import { getTheme } from "../theme.ts"
import type { PendingPermission } from "../../../core/store.ts"

interface PermissionModalProps {
  permission: PendingPermission
  locale: "zh-Hans" | "en"
  onAllow: () => void
  onDeny: () => void
  onEdit: () => void
}

export function PermissionModal({ permission, locale, onAllow, onDeny, onEdit }: PermissionModalProps): React.ReactElement {
  const theme = getTheme()
  useInput((input) => {
    const ch = input.toLowerCase()
    if (ch === "y") onAllow()
    else if (ch === "n") onDeny()
    else if (ch === "e") onEdit()
  })
  const t = STRINGS[locale]
  return (
    <Box flexDirection="column" borderStyle="double" borderColor={theme.warn} paddingX={2} paddingY={1}>
      <Text color={theme.warn} bold>{t.title}</Text>
      <Box marginTop={1}>
        <Text color={theme.fg}>{permission.summary}</Text>
      </Box>
      {permission.tool && (
        <Box marginTop={1}>
          <Text color={theme.fgDim}>tool: {permission.tool}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color={theme.accent}>[y]</Text>
        <Text color={theme.fg}> {t.yes}    </Text>
        <Text color={theme.accent}>[n]</Text>
        <Text color={theme.fg}> {t.no}    </Text>
        <Text color={theme.accent}>[e]</Text>
        <Text color={theme.fg}> {t.edit}</Text>
      </Box>
    </Box>
  )
}

const STRINGS = {
  "zh-Hans": {
    title: "AI 想做这件事",
    yes: "可以做",
    no: "不要",
    edit: "我来改",
  },
  en: {
    title: "The AI wants to do this",
    yes: "Go ahead",
    no: "Stop",
    edit: "I'll do it",
  },
} as const
