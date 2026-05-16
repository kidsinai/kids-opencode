/**
 * First-run setup wizard. Triggered when kids-client detects no LLM
 * provider key is configured.
 *
 * Audience: a parent (the kid sees the intro and is told to grab a
 * grown-up). The wizard walks through:
 *   0. engine_install (auto, only if upstream opencode CLI missing)
 *   1. Welcome / "this part needs a grown-up"
 *   2. Pick provider (Anthropic / OpenAI / DeepRouter)
 *   3. Paste API key (with link to where to get one)
 *   4. Save → continue inline (no re-exec) → MissionScreen
 */

import React, { useEffect, useState } from "react"
import { Box, Text, useInput } from "ink"
import TextInput from "ink-text-input"
import Spinner from "ink-spinner"
import { getTheme } from "../theme.ts"
import { KidsLogo } from "../components/KidsLogo.tsx"
import {
  findProvider,
  looksLikeApiKey,
  PROVIDERS,
  type ProviderId,
} from "../../../core/setup.ts"
import { hasOpencodeBinary, installOpencode } from "../../../core/opencode-installer.ts"

type Step =
  | "engine_install"
  | "engine_done"
  | "intro"
  | "provider"
  | "apikey"
  | "saving"
  | "done"
  | "error"

interface SetupScreenProps {
  locale: "zh-Hans" | "en"
  onSave: (provider: ProviderId, apiKey: string) => Promise<{ ok: true } | { ok: false; reason: string }>
  /** After save, kicks off inline boot. Resolves when AI is ready. */
  onContinue: () => Promise<void>
  /** Skip key — useful for advanced users who set env vars themselves. */
  onSkip: () => void
}

export function SetupScreen({ locale, onSave, onContinue, onSkip }: SetupScreenProps): React.ReactElement {
  const theme = getTheme()
  const t = STRINGS[locale]
  const initialStep: Step = hasOpencodeBinary() ? "intro" : "engine_install"
  const [step, setStep] = useState<Step>(initialStep)
  const [providerIdx, setProviderIdx] = useState(0)
  const [apiKey, setApiKey] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [engineLog, setEngineLog] = useState<string[]>([])
  const [engineRunning, setEngineRunning] = useState(false)

  // Auto-trigger engine install once on first render.
  useEffect(() => {
    if (initialStep === "engine_install" && !engineRunning) {
      setEngineRunning(true)
      void installOpencode((line) => {
        setEngineLog((prev) => {
          const next = [...prev, line]
          return next.length > 8 ? next.slice(next.length - 8) : next
        })
      }).then((result) => {
        setEngineRunning(false)
        if (result.ok) {
          setStep("engine_done")
        } else {
          setErrorMsg(result.error ?? "engine install failed")
          setStep("error")
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useInput((input, key) => {
    if (step === "engine_done") {
      if (key.return) setStep("intro")
    } else if (step === "intro") {
      if (key.return) setStep("provider")
      else if (input === "s" || input === "S") onSkip()
    } else if (step === "provider") {
      if (key.upArrow) setProviderIdx((i) => Math.max(0, i - 1))
      else if (key.downArrow) setProviderIdx((i) => Math.min(PROVIDERS.length - 1, i + 1))
      else if (key.return) setStep("apikey")
      else if (key.escape) setStep("intro")
    } else if (step === "done") {
      if (key.return) {
        // Inline boot — no exit.
        void onContinue()
      }
    } else if (step === "error") {
      if (key.return) {
        // From any failure step, retry from apikey unless engine failed
        setStep(engineLog.length > 0 && !hasOpencodeBinary() ? "engine_install" : "apikey")
        if (engineLog.length > 0 && !hasOpencodeBinary()) {
          // Restart engine install
          setEngineLog([])
          setEngineRunning(true)
          void installOpencode((line) => {
            setEngineLog((prev) => {
              const next = [...prev, line]
              return next.length > 8 ? next.slice(next.length - 8) : next
            })
          }).then((result) => {
            setEngineRunning(false)
            if (result.ok) setStep("engine_done")
            else {
              setErrorMsg(result.error ?? "engine install failed")
              setStep("error")
            }
          })
        }
      }
    }
  })

  const provider = PROVIDERS[providerIdx]!
  const providerObj = findProvider(provider.id)

  if (step === "engine_install") {
    return (
      <Box flexDirection="column" alignItems="center" paddingY={1}>
        <KidsLogo />
        <Box marginTop={2} borderStyle="round" borderColor={theme.accent} paddingX={2} paddingY={1} flexDirection="column">
          <Box>
            <Text color={theme.accent}>{engineRunning ? <Spinner type="dots" /> : "  "}</Text>
            <Text color={theme.accent} bold> {t.engineInstalling}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color={theme.fgDim}>{t.engineHint}</Text>
          </Box>
          {engineLog.length > 0 && (
            <Box marginTop={1} flexDirection="column">
              {engineLog.map((line, i) => (
                <Text key={i} color={theme.fgDim} dimColor>  {line}</Text>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    )
  }

  if (step === "engine_done") {
    return (
      <Box flexDirection="column" alignItems="center" paddingY={1}>
        <KidsLogo />
        <Box marginTop={2} borderStyle="round" borderColor={theme.success} paddingX={2} paddingY={1}>
          <Text color={theme.success} bold>{t.engineDone}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.accent}>{t.continueHint}</Text>
        </Box>
      </Box>
    )
  }

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
        <Text color={theme.accent}>
          <Spinner type="dots" />
        </Text>
        <Text color={theme.accent}> {t.saving}</Text>
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
    engineInstalling: "正在安装 AI 引擎…",
    engineHint: "从 opencode.ai 下载（大约 30 秒）。卡住的话按 Enter 重试。",
    engineDone: "✓ AI 引擎安装完成",
    continueHint: "[Enter] 下一步",
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
    doneNext: "马上启动，让孩子继续。",
    doneHint: "[Enter] 启动",
  },
  en: {
    engineInstalling: "Setting up the AI engine…",
    engineHint: "Downloading from opencode.ai (about 30 seconds). Stuck? Press Enter to retry.",
    engineDone: "✓ AI engine ready",
    continueHint: "[Enter] Next",
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
    doneNext: "Starting up now.",
    doneHint: "[Enter] Start",
  },
} as const
