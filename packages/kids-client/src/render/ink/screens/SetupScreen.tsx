/**
 * First-run setup wizard. Triggered when kids-client detects no LLM
 * provider key is configured.
 *
 * Audience: a parent (the kid sees the intro and is told to grab a
 * grown-up). The wizard walks through:
 *   1. Welcome / "this part needs a grown-up"
 *   2. Pick provider (Anthropic / OpenAI / DeepRouter)
 *   3. Paste API key (with link to where to get one)
 *   4. Save → re-validate → route to startup
 *
 * The choice is persisted via core/setup.ts (writes ~/.config/kids-opencode/env
 * + updates opencode.json provider section).
 */

import React, { useState } from "react"
import { Box, Text, useInput } from "ink"
import TextInput from "ink-text-input"
import { getTheme } from "../theme.ts"
import { KidsLogo } from "../components/KidsLogo.tsx"
import {
  findProvider,
  looksLikeApiKey,
  PROVIDERS,
  type ProviderId,
} from "../../../core/setup.ts"

type Step = "intro" | "provider" | "apikey" | "saving" | "done" | "error"

interface SetupScreenProps {
  locale: "zh-Hans" | "en"
  onSave: (provider: ProviderId, apiKey: string) => Promise<{ ok: true } | { ok: false; reason: string }>
  onSkip: () => void
}

export function SetupScreen({ locale, onSave, onSkip }: SetupScreenProps): React.ReactElement {
  const theme = getTheme()
  const t = STRINGS[locale]
  const [step, setStep] = useState<Step>("intro")
  const [providerIdx, setProviderIdx] = useState(0)
  const [apiKey, setApiKey] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  useInput((input, key) => {
    if (step === "intro") {
      if (key.return) setStep("provider")
      else if (input === "s" || input === "S") onSkip()
    } else if (step === "provider") {
      if (key.upArrow) setProviderIdx((i) => Math.max(0, i - 1))
      else if (key.downArrow) setProviderIdx((i) => Math.min(PROVIDERS.length - 1, i + 1))
      else if (key.return) setStep("apikey")
      else if (key.escape) setStep("intro")
    } else if (step === "done") {
      if (key.return) onSkip() // continue to startup
    } else if (step === "error") {
      if (key.return) setStep("apikey")
    }
  })

  const provider = PROVIDERS[providerIdx]!
  const providerObj = findProvider(provider.id)

  if (step === "intro") {
    return (
      <Box flexDirection="column" alignItems="center" paddingY={1}>
        <KidsLogo />
        <Box marginTop={2} borderStyle="round" borderColor={theme.warn} paddingX={2} paddingY={1} flexDirection="column">
          <Text color={theme.warn} bold>{t.introTitle}</Text>
          <Box marginTop={1} flexDirection="column">
            <Text color={theme.fg}>{t.introLine1}</Text>
            <Text color={theme.fg}>{t.introLine2}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.fgDim}>{t.introCost}</Text>
          </Box>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.accent}>{t.introContinue}</Text>
        </Box>
      </Box>
    )
  }

  if (step === "provider") {
    return (
      <Box flexDirection="column" borderStyle="double" borderColor={theme.accent} paddingX={2} paddingY={1}>
        <Text color={theme.accent} bold>{t.providerTitle}</Text>
        <Box marginTop={1} flexDirection="column">
          {PROVIDERS.map((p, i) => {
            const active = i === providerIdx
            return (
              <Box key={p.id}>
                <Text color={active ? theme.kid : theme.fg}>{active ? "▶ " : "  "}</Text>
                <Box flexDirection="column" flexGrow={1}>
                  <Text color={active ? theme.accent : theme.fg} bold={active}>{p.label}</Text>
                  <Text color={theme.fgDim} dimColor={!active}>  {p.hint}</Text>
                  {active && <Text color={theme.fgDim}>  {t.getKey}: {p.apiKeyUrl}</Text>}
                </Box>
              </Box>
            )
          })}
        </Box>
        <Box marginTop={1}>
          <Text color={theme.accent}>{t.providerKeys}</Text>
        </Box>
      </Box>
    )
  }

  if (step === "apikey") {
    return (
      <Box flexDirection="column" borderStyle="double" borderColor={theme.accent} paddingX={2} paddingY={1}>
        <Text color={theme.accent} bold>{t.apiKeyTitle(providerObj.label)}</Text>
        <Box marginTop={1} flexDirection="column">
          <Text color={theme.fgDim}>{t.apiKeyHint(providerObj.apiKeyUrl)}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.kid}>🔑  </Text>
          <TextInput
            value={apiKey}
            onChange={setApiKey}
            onSubmit={(v) => {
              const k = v.trim()
              if (!looksLikeApiKey(provider.id, k)) {
                setErrorMsg(t.apiKeyInvalid(providerObj.envVar))
                setStep("error")
                return
              }
              setStep("saving")
              void onSave(provider.id, k).then((res) => {
                if (res.ok) {
                  setStep("done")
                } else {
                  setErrorMsg(res.reason)
                  setStep("error")
                }
              })
            }}
            placeholder={t.apiKeyPlaceholder(providerObj.envVar)}
            mask="*"
          />
        </Box>
        <Box marginTop={1}>
          <Text color={theme.fgDim}>{t.apiKeyEnter}</Text>
        </Box>
      </Box>
    )
  }

  if (step === "saving") {
    return (
      <Box paddingY={1} paddingX={2}>
        <Text color={theme.accent}>{t.saving}</Text>
      </Box>
    )
  }

  if (step === "error") {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor={theme.danger} paddingX={2} paddingY={1}>
        <Text color={theme.danger} bold>{t.errTitle}</Text>
        <Box marginTop={1}>
          <Text color={theme.fg}>{errorMsg}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.accent}>{t.errRetry}</Text>
        </Box>
      </Box>
    )
  }

  // step === "done"
  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      <KidsLogo />
      <Box marginTop={2} flexDirection="column" alignItems="center">
        <Text color={theme.success} bold>{t.doneTitle}</Text>
        <Box marginTop={1}>
          <Text color={theme.fg}>{t.doneNext}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.accent}>{t.doneHint}</Text>
        </Box>
      </Box>
    </Box>
  )
}

const STRINGS = {
  "zh-Hans": {
    introTitle: "👋  这一步需要家长帮忙",
    introLine1: "AI 老师要用一个 \"API key\" 才能工作 —— 就像给它一把钥匙。",
    introLine2: "家长打开账号给 AI 服务（Anthropic / OpenAI 等），拿到 key 粘进来就行。",
    introCost: "通常 ~$5/月，普通孩子用够了。",
    introContinue: "[Enter] 让家长来  ·  [s] 暂时跳过",
    providerTitle: "选一个 AI 服务",
    providerKeys: "[↑↓] 选 · [Enter] 下一步 · [Esc] 返回",
    getKey: "去拿 key",
    apiKeyTitle: (label: string) => `输入 ${label} 的 API key`,
    apiKeyHint: (url: string) => `没 key？打开浏览器：${url}`,
    apiKeyPlaceholder: (env: string) => `${env}（粘进来后按 Enter）`,
    apiKeyEnter: "[Enter] 保存 · 你的 key 只存在本地",
    apiKeyInvalid: (env: string) => `这看起来不是有效的 ${env}。再试一次。`,
    saving: "保存中…",
    errTitle: "出了点问题",
    errRetry: "[Enter] 再试",
    doneTitle: "🎉  搞定！家长任务完成。",
    doneNext: "你可以让孩子继续了。下一屏是启动屏。",
    doneHint: "[Enter] 开始",
  },
  en: {
    introTitle: "👋  Grown-up help needed for this part",
    introLine1: "The AI teacher needs an \"API key\" to work — think of it as a password.",
    introLine2: "A parent opens an account with an AI service (Anthropic / OpenAI), copies the key, pastes it here.",
    introCost: "Usually ~$5/month for typical kid use.",
    introContinue: "[Enter] Hand to a grown-up  ·  [s] Skip for now",
    providerTitle: "Pick an AI service",
    providerKeys: "[↑↓] choose · [Enter] next · [Esc] back",
    getKey: "Get key at",
    apiKeyTitle: (label: string) => `Enter your ${label} API key`,
    apiKeyHint: (url: string) => `Don't have a key yet? Open: ${url}`,
    apiKeyPlaceholder: (env: string) => `${env} (paste then Enter)`,
    apiKeyEnter: "[Enter] save · Your key stays on this machine.",
    apiKeyInvalid: (env: string) => `That doesn't look like a valid ${env}. Try again.`,
    saving: "Saving…",
    errTitle: "Something went wrong",
    errRetry: "[Enter] Try again",
    doneTitle: "🎉  All set! Grown-up step done.",
    doneNext: "You can hand it back to the kid now. Next screen is the welcome.",
    doneHint: "[Enter] Start",
  },
} as const
