/**
 * Transient toast renderer for non-blocking feedback. Used for "已停止"
 * after Esc abort, "上下文压缩中" during compaction, etc.
 *
 * The store holds the toast; App.tsx overlays it as the last row of the
 * mission screen.
 */

import React from "react"
import { Box, Text } from "ink"
import { getTheme } from "../theme.ts"

export interface ToastState {
  kind: "info" | "warn" | "success"
  text: string
}

export function Toast({ toast }: { toast: ToastState }): React.ReactElement {
  const theme = getTheme()
  const color = toast.kind === "warn" ? theme.warn : toast.kind === "success" ? theme.success : theme.accent
  const icon = toast.kind === "warn" ? "⚠️" : toast.kind === "success" ? "✓" : "ℹ"
  return (
    <Box paddingX={1}>
      <Text color={color}>
        {icon} {toast.text}
      </Text>
    </Box>
  )
}
