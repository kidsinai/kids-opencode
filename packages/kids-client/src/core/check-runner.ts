/**
 * In-TUI mission acceptance check. Calls runMissionChecks from
 * @kidsinai/kids-opencode-plugin against the kid's current project
 * directory.
 *
 * Triggered by the kid typing "/check" or a vernacular completion phrase
 * (e.g. "我做完了" / "I'm done") in the chat input. index.tsx intercepts
 * those strings before they reach the LLM.
 */

import { runMissionChecks, type MissionResult } from "@kidsinai/kids-opencode-plugin"

export interface CheckOutcome {
  kind: "pass" | "fail" | "error"
  missionId: string
  /** Friendly summary for the kid. Composed from MissionResult.completion_message + per-check labels. */
  message: string
  /** Detailed per-check labels for the chat trail. */
  details: string[]
  result?: MissionResult
}

export const COMPLETION_PHRASES_ZH = ["/check", "我做完了", "做完了", "完成了", "我完成了", "/done"]
export const COMPLETION_PHRASES_EN = ["/check", "i'm done", "im done", "done!", "i am done", "/done", "all done"]

export function isCompletionTrigger(text: string, locale: "zh-Hans" | "en"): boolean {
  const t = text.trim().toLowerCase()
  if (!t) return false
  const candidates = locale === "zh-Hans" ? COMPLETION_PHRASES_ZH : COMPLETION_PHRASES_EN
  return candidates.some((p) => t === p.toLowerCase() || (t.length < 25 && t.includes(p.toLowerCase())))
}

export interface RunCheckOptions {
  missionId: string
  packId: string
  projectDir?: string
  locale: "zh-Hans" | "en"
}

export function runCheck(opts: RunCheckOptions): CheckOutcome {
  if (!opts.missionId) {
    return {
      kind: "error",
      missionId: opts.missionId ?? "",
      message: opts.locale === "zh-Hans" ? "没设当前 Mission，没法验收。" : "No active Mission to check.",
      details: [],
    }
  }
  const result = runMissionChecks(opts.missionId, {
    packId: opts.packId,
    projectDir: opts.projectDir,
  })
  if ("error" in result) {
    return {
      kind: "error",
      missionId: opts.missionId,
      message: result.error,
      details: [],
    }
  }
  const details = (result.results ?? []).map((r) => {
    const tick = r.status === "pass" ? "✅" : r.status === "skip" ? "⏭" : "❌"
    return `${tick} ${r.description || r.id || "check"}`
  })
  const ok = result.ok
  if (ok) {
    const msg = result.completion_message
      ?? (opts.locale === "zh-Hans"
        ? `Mission ${result.mission_id} 全部通过！${result.passed}/${result.total} 项检查 ✓`
        : `Mission ${result.mission_id} passed all checks. ${result.passed}/${result.total} ✓`)
    return { kind: "pass", missionId: opts.missionId, message: msg, details, result }
  }
  const msg = opts.locale === "zh-Hans"
    ? `还差一点：${result.passed}/${result.total} 通过，${result.failed} 个需要再修一下。`
    : `Almost: ${result.passed}/${result.total} passed, ${result.failed} still need work.`
  return { kind: "fail", missionId: opts.missionId, message: msg, details, result }
}
