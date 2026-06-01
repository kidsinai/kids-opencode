import { describe, expect, test } from "bun:test"
import { flattenModels } from "../../src/core/models.ts"

describe("flattenModels", () => {
  test("flattens the { providers: [{ models: {map} }] } shape", () => {
    const raw = {
      providers: [
        {
          id: "anthropic",
          name: "Anthropic",
          models: {
            "claude-3-5-sonnet": { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet" },
          },
        },
      ],
    }
    expect(flattenModels(raw)).toEqual([
      { id: "anthropic/claude-3-5-sonnet", label: "Claude 3.5 Sonnet · Anthropic" },
    ])
  })

  test("handles models as an array and a bare top-level array", () => {
    const raw = [{ id: "openai", name: "OpenAI", models: [{ id: "gpt-4o", name: "GPT-4o" }] }]
    expect(flattenModels(raw)).toEqual([{ id: "openai/gpt-4o", label: "GPT-4o · OpenAI" }])
  })

  test("dedupes and survives garbage without throwing", () => {
    expect(flattenModels(null)).toEqual([])
    expect(flattenModels({ nope: true })).toEqual([])
    const dup = { providers: [{ id: "p", name: "P", models: [{ id: "m" }, { id: "m" }] }] }
    expect(flattenModels(dup)).toEqual([{ id: "p/m", label: "m · P" }])
  })
})
