import { describe, expect, test } from "bun:test"
import { mapServerMessage } from "../../src/core/session.ts"

describe("mapServerMessage", () => {
  test("user → kid", () => {
    const m = mapServerMessage({ id: "u1", type: "user", text: "make a game", time: { created: 5 } })
    expect(m).toEqual({ id: "u1", actor: "kid", text: "make a game", streaming: false, ts: 5 })
  })

  test("assistant → agent, joining text content parts only", () => {
    const m = mapServerMessage({
      id: "a1",
      type: "assistant",
      content: [
        { type: "reasoning", text: "thinking..." },
        { type: "text", text: "Sure! " },
        { type: "tool", id: "t" },
        { type: "text", text: "Let's start." },
      ],
      time: { created: 9 },
    })
    expect(m).toEqual({ id: "a1", actor: "agent", text: "Sure! Let's start.", streaming: false, ts: 9 })
  })

  test("tool / control / empty messages are skipped", () => {
    expect(mapServerMessage({ id: "s", type: "model-switched" })).toBeNull()
    expect(mapServerMessage({ id: "a", type: "assistant", content: [{ type: "tool" }] })).toBeNull()
    expect(mapServerMessage(null)).toBeNull()
  })
})
