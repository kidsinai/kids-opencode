import { describe, expect, test } from "bun:test"
import { isModelUnavailable, pickDefaultModel } from "../../src/core/models.ts"

describe("isModelUnavailable", () => {
  test("detects ChatGPT-account 'not supported' model error", () => {
    expect(isModelUnavailable("The 'gpt-5.5-pro' model is not supported when using Codex with a ChatGPT account.")).toBe(true)
  })
  test("detects model_not_found / no access", () => {
    expect(isModelUnavailable("model_not_found")).toBe(true)
    expect(isModelUnavailable("Your org does not have access to this model")).toBe(true)
  })
  test("does NOT flag auth or network errors", () => {
    expect(isModelUnavailable("Your authentication token has been invalidated")).toBe(false)
    expect(isModelUnavailable("fetch failed: ECONNREFUSED")).toBe(false)
  })
})

describe("pickDefaultModel", () => {
  const M = (id: string) => ({ id, label: id })
  test("prefers gpt-5.4-mini and skips -pro tiers", () => {
    const got = pickDefaultModel([M("openai/gpt-5.5-pro"), M("openai/gpt-5.5"), M("openai/gpt-5.4-mini")])
    expect(got?.id).toBe("openai/gpt-5.4-mini")
  })
  test("never returns a -pro model when a usable one exists", () => {
    const got = pickDefaultModel([M("openai/gpt-5.5-pro"), M("openai/gpt-5.4")])
    expect(got?.id).toBe("openai/gpt-5.4")
  })
  test("falls back to first usable when no preferred match", () => {
    expect(pickDefaultModel([M("opencode/minimax-m3-free")])?.id).toBe("opencode/minimax-m3-free")
  })
  test("empty list → null", () => {
    expect(pickDefaultModel([])).toBeNull()
  })
})
