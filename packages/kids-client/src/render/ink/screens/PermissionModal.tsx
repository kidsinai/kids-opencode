/**
 * §3.4 Permission confirmation. Modal — blocks input until kid chooses
 * y (allow once) / n (deny) / e (edit / I'll do it myself).
 *
 * y → client.permission.reply(id, { reply: "once" })
 * n → client.permission.reply(id, { reply: "reject" })
 * e → close modal, send a fresh kid prompt of the form "no, do it differently"
 *
 * The PRD uses "y/n/e" to avoid the engineering-vibes of allow/deny.
 *
 * For write/edit tools we now render a short preview of the exact file
 * change the kid is about to approve. Black-box `y` was a trust-without-
 * verify hole — this closes it AND doubles as a learning surface (the kid
 * sees what code the AI is producing).
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

const DIFF_MAX_LINES = 14

export function PermissionModal({ permission, locale, onAllow, onDeny, onEdit }: PermissionModalProps): React.ReactElement {
  const theme = getTheme()
  useInput((input) => {
    const ch = input.toLowerCase()
    if (ch === "y") onAllow()
    else if (ch === "n") onDeny()
    else if (ch === "e") onEdit()
  })
  const t = STRINGS[locale]
  const preview = extractFilePreview(permission)
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
      {preview && (
        <Box marginTop={1} flexDirection="column" borderStyle="single" borderColor={theme.fgDim} paddingX={1}>
          <Box>
            <Text color={theme.accent} bold>{preview.kind === "edit" ? t.editingFile : t.writingFile}: </Text>
            <Text color={theme.fg}>{preview.path}</Text>
          </Box>
          <Box marginTop={1} flexDirection="column">
            {renderDiffLines(preview, theme)}
          </Box>
          {preview.truncated > 0 && (
            <Box marginTop={1}>
              <Text color={theme.fgDim} dimColor>{t.truncated(preview.truncated)}</Text>
            </Box>
          )}
        </Box>
      )}
      {permission.starsEstimated && permission.starsEstimated > 0 && (
        <Box marginTop={1}>
          <Text color={theme.stars}>{t.starsCost(permission.starsEstimated)}</Text>
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

type FilePreview =
  | {
      kind: "write"
      path: string
      lines: string[]
      truncated: number
    }
  | {
      kind: "edit"
      path: string
      removed: string[]
      added: string[]
      truncated: number
    }

/**
 * opencode write tool metadata: { filePath/path, content }
 * opencode edit tool metadata: { filePath/path, oldString/old_text, newString/new_text }
 * Defensive shape extraction — the SDK exposes these as Record<string, unknown>.
 */
function extractFilePreview(permission: PendingPermission): FilePreview | null {
  if (!permission.tool) return null
  const tool = permission.tool.toLowerCase()
  const m = permission.metadata ?? {}
  const path = pickString(m, ["filePath", "path", "file_path", "filename"])
  if (!path) return null

  if (tool === "write") {
    const content = pickString(m, ["content", "text", "newContent", "new_content"])
    if (content === null) return null
    const all = content.split("\n")
    const shown = all.slice(0, DIFF_MAX_LINES)
    return { kind: "write", path, lines: shown, truncated: Math.max(0, all.length - shown.length) }
  }

  if (tool === "edit") {
    const oldStr = pickString(m, ["oldString", "old_string", "oldText", "old_text"]) ?? ""
    const newStr = pickString(m, ["newString", "new_string", "newText", "new_text"]) ?? ""
    const removed = oldStr.split("\n").filter((l, i, arr) => !(i === arr.length - 1 && l === ""))
    const added = newStr.split("\n").filter((l, i, arr) => !(i === arr.length - 1 && l === ""))
    const totalLines = removed.length + added.length
    if (totalLines === 0) return null
    const half = Math.max(1, Math.floor(DIFF_MAX_LINES / 2))
    const removedShown = removed.slice(0, half)
    const addedShown = added.slice(0, DIFF_MAX_LINES - removedShown.length)
    const truncated = (removed.length - removedShown.length) + (added.length - addedShown.length)
    return { kind: "edit", path, removed: removedShown, added: addedShown, truncated }
  }

  return null
}

function renderDiffLines(preview: FilePreview, theme: ReturnType<typeof getTheme>): React.ReactElement[] {
  if (preview.kind === "write") {
    return preview.lines.map((line, i) => (
      <Text key={`w-${i}`} color={theme.success}>{`+ ${line}`}</Text>
    ))
  }
  const out: React.ReactElement[] = []
  preview.removed.forEach((line, i) => out.push(
    <Text key={`r-${i}`} color={theme.danger}>{`- ${line}`}</Text>
  ))
  preview.added.forEach((line, i) => out.push(
    <Text key={`a-${i}`} color={theme.success}>{`+ ${line}`}</Text>
  ))
  return out
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k]
    if (typeof v === "string") return v
  }
  return null
}

const STRINGS = {
  "zh-Hans": {
    title: "AI 想做这件事",
    yes: "可以做",
    no: "不要",
    edit: "我来改",
    starsCost: (n: number) => `预估消耗 ${n}⭐`,
    writingFile: "新建文件",
    editingFile: "改这个文件",
    truncated: (n: number) => `… 还有 ${n} 行没显示。完整改动会在文件里。`,
  },
  en: {
    title: "The AI wants to do this",
    yes: "Go ahead",
    no: "Stop",
    edit: "I'll do it",
    starsCost: (n: number) => `Estimated cost: ${n}⭐`,
    writingFile: "Creating file",
    editingFile: "Editing file",
    truncated: (n: number) => `… ${n} more lines not shown. Full change lands in the file.`,
  },
} as const
