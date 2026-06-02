import { describe, expect, test } from "bun:test"
import { mapServerMessage } from "../../src/core/session.ts"

describe("mapServerMessage (SDK v2 { info, parts } shape)", () => {
  test("user → kid", () => {
    const m = mapServerMessage({
      info: { id: "u1", role: "user", time: { created: 5 } },
      parts: [{ type: "text", text: "make a game" }],
    })
    expect(m).toEqual({ id: "u1", actor: "kid", text: "make a game", streaming: false, ts: 5 })
  })

  test("assistant → agent, joining text parts only", () => {
    const m = mapServerMessage({
      info: { id: "a1", role: "assistant", time: { created: 9 } },
      parts: [
        { type: "reasoning", text: "thinking..." },
        { type: "text", text: "Sure! " },
        { type: "tool", id: "t" },
        { type: "text", text: "Let's start." },
      ],
    })
    expect(m).toEqual({ id: "a1", actor: "agent", text: "Sure! Let's start.", streaming: false, ts: 9 })
  })

  test("tool / control / empty / malformed messages are skipped", () => {
    // assistant with no text parts (tool-only turn)
    expect(mapServerMessage({ info: { id: "a", role: "assistant" }, parts: [{ type: "tool" }] })).toBeNull()
    // unknown role
    expect(mapServerMessage({ info: { id: "s", role: "system" }, parts: [{ type: "text", text: "x" }] })).toBeNull()
    // missing info / null
    expect(mapServerMessage({ parts: [{ type: "text", text: "x" }] })).toBeNull()
    expect(mapServerMessage(null)).toBeNull()
  })
})
