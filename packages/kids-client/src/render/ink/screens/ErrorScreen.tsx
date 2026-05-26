/**
 * Friendly error screens — 6 variants per PRD §3.4 / plan Day 9.
 *
 * Variants:
 *   serve_unreachable | network_down | stars_exhausted |
 *   auth_failed       | config_missing | ai_hung
 *
 * Each variant has a short title + a one-sentence action + an optional
 * recovery key hint. Detail text (technical) is shown dimmed in case
 * a parent / engineer needs to debug.
 */

import React from "react"
import { Box, Text, useInput } from "ink"
import { getTheme } from "../theme.ts"
import type { ErrorVariant } from "../../../core/store.ts"
import { Toast, type ToastState } from "../components/Toast.tsx"

interface ErrorScreenProps {
  variant: ErrorVariant
  locale: "zh-Hans" | "en"
  detail?: string
  toast?: ToastState | null
  onRetry?: () => void
  onQuit?: () => void
  /**
   * Open the setup wizard so the parent can change provider / paste a new
   * API key. Wired by AppDeps only for config-related variants
   * (serve_unreachable / port_taken / auth_failed / config_missing) — retry
   * alone won't fix a wrong key.
   */
  onReconfigure?: () => void
  /**
   * Open the Airbotix Portal wallet page in the parent's default browser.
   * Wired only for `stars_exhausted` so retry-alone (which won't change the
   * balance) is not the only option.
   */
  onOpenWallet?: () => void
}

export function ErrorScreen({ variant, locale, detail, toast, onRetry, onQuit, onReconfigure, onOpenWallet }: ErrorScreenProps): React.ReactElement {
  const theme = getTheme()
  useInput((input, key) => {
    if (key.return && onRetry) onRetry()
    else if ((input === "c" || input === "C") && onReconfigure) onReconfigure()
    else if ((input === "w" || input === "W") && onOpenWallet) onOpenWallet()
    else if (input === "q" && onQuit) onQuit()
  })
  const t = STRINGS[locale][variant]
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.danger} paddingX={2} paddingY={1}>
      <Text color={theme.danger} bold>
        {t.title}
      </Text>
      <Box marginTop={1}>
        <Text color={theme.fg}>{t.body}</Text>
      </Box>
      {detail && (
        <Box marginTop={1}>
          <Text color={theme.fgDim} dimColor>
            {detail}
          </Text>
        </Box>
      )}
      <Box marginTop={1}>
        {onRetry && (
          <Box marginRight={2}>
            <Text color={theme.accent}>[Enter]</Text>
            <Text color={theme.fg}> {t.retry}</Text>
          </Box>
        )}
        {onReconfigure && (
          <Box marginRight={2}>
            <Text color={theme.accent}>[c]</Text>
            <Text color={theme.fg}> {STRINGS[locale].reconfigure}</Text>
          </Box>
        )}
        {onOpenWallet && (
          <Box marginRight={2}>
            <Text color={theme.accent}>[w]</Text>
            <Text color={theme.fg}> {STRINGS[locale].topUp}</Text>
          </Box>
        )}
        {onQuit && (
          <Box>
            <Text color={theme.accent}>[q]</Text>
            <Text color={theme.fg}> {STRINGS[locale].quit}</Text>
          </Box>
        )}
      </Box>
      {toast && (
        <Box marginTop={1}>
          <Toast toast={toast} />
        </Box>
      )}
    </Box>
  )
}

const STRINGS = {
  "zh-Hans": {
    quit: "退出",
    reconfigure: "改设置（换 key / 换 provider）",
    topUp: "去充值（开浏览器）",
    serve_unreachable: {
      title: "AI 老师还没起来",
      body: "后台 AI 服务好像没启动。要不要再试一次？",
      retry: "重试",
    },
    port_taken: {
      title: "另一个 AI 老师还在占着位子",
      body: "请家长打开终端，跑一下：\n\n  kids-opencode --shutdown\n\n然后按 Enter 再试。",
      retry: "已经关掉了，再试",
    },
    network_down: {
      title: "网络有点问题",
      body: "我没办法连上 AI。等会儿再来，或者问家长检查网络。",
      retry: "重试",
    },
    stars_exhausted: {
      title: "今天的 ⭐ 用完了",
      body: "今天先到这里啦！\n你做得很好，我们明天接着来。\n或者按 [w] 让家长去充值，回来按 Enter 接着做。",
      retry: "找完家长了，再试一次",
    },
    auth_failed: {
      title: "AI 老师认不出你",
      body: "请家长重新跑一下 `kids-opencode register`。",
      retry: "重试",
    },
    config_missing: {
      title: "配置丢了",
      body: "重新装一下 kids-opencode 就好。",
      retry: "重试",
    },
    ai_hung: {
      title: "AI 老师好像睡着了",
      body: "30 秒没回应。按 Enter 重来一遍。",
      retry: "重试",
    },
  },
  en: {
    quit: "Quit",
    reconfigure: "Change settings (switch key / provider)",
    topUp: "Top up (opens browser)",
    serve_unreachable: {
      title: "AI teacher didn't start",
      body: "The background AI service isn't running. Try again?",
      retry: "Retry",
    },
    port_taken: {
      title: "Another AI teacher is still holding the seat",
      body: "Ask a parent to open a terminal and run:\n\n  kids-opencode --shutdown\n\nThen press Enter to try again.",
      retry: "Done — try again",
    },
    network_down: {
      title: "Network trouble",
      body: "I can't reach the AI. Try later, or ask an adult to check the connection.",
      retry: "Retry",
    },
    stars_exhausted: {
      title: "Out of ⭐ for today",
      body: "Great work today!\nWe'll pick this up tomorrow.\nOr press [w] so a parent can top up, then press Enter to keep going.",
      retry: "Asked a parent — try again",
    },
    auth_failed: {
      title: "AI doesn't recognise you",
      body: "Ask a parent to run `kids-opencode register` again.",
      retry: "Retry",
    },
    config_missing: {
      title: "Config is missing",
      body: "Reinstall kids-opencode to fix this.",
      retry: "Retry",
    },
    ai_hung: {
      title: "AI seems to be asleep",
      body: "30 seconds without a reply. Press Enter to try again.",
      retry: "Retry",
    },
  },
} as const
