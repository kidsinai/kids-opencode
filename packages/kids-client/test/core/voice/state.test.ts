import { describe, expect, test } from "bun:test"
import {
  transition,
  isMicOpen,
  isCancellable,
  type VoiceState,
} from "../../../src/core/voice/state.ts"

describe("voice state machine", () => {
  test("happy path: idle → listening → transcribing → thinking → speaking → idle", () => {
    let s: VoiceState = "idle"
    s = transition(s, { type: "START" })
    expect(s).toBe("listening")
    s = transition(s, { type: "STOP" })
    expect(s).toBe("transcribing")
    s = transition(s, { type: "TRANSCRIBED" })
    expect(s).toBe("thinking")
    s = transition(s, { type: "REPLIED" })
    expect(s).toBe("speaking")
    s = transition(s, { type: "SPOKEN" })
    expect(s).toBe("idle")
  })

  test("spacebar spam during transcribing is a no-op, never a second recording", () => {
    expect(transition("transcribing", { type: "START" })).toBe("transcribing")
    expect(transition("transcribing", { type: "STOP" })).toBe("transcribing")
  })

  test("STOP only does something while listening", () => {
    expect(transition("idle", { type: "STOP" })).toBe("idle")
    expect(transition("listening", { type: "STOP" })).toBe("transcribing")
  })

  test("Esc cancels back to idle from any pre-reply state", () => {
    expect(transition("listening", { type: "CANCEL" })).toBe("idle")
    expect(transition("transcribing", { type: "CANCEL" })).toBe("idle")
    expect(transition("speaking", { type: "CANCEL" })).toBe("idle")
  })

  test("errors route to error, and only RESET leaves it", () => {
    expect(transition("listening", { type: "ERROR" })).toBe("error")
    expect(transition("error", { type: "START" })).toBe("error")
    expect(transition("error", { type: "RESET" })).toBe("idle")
  })

  test("mic is open ONLY while listening (compliance invariant)", () => {
    const states: VoiceState[] = ["idle", "listening", "transcribing", "thinking", "speaking", "error"]
    for (const s of states) {
      expect(isMicOpen(s)).toBe(s === "listening")
    }
  })

  test("cancellable while listening/transcribing/speaking, not while idle/thinking/error", () => {
    expect(isCancellable("listening")).toBe(true)
    expect(isCancellable("transcribing")).toBe(true)
    expect(isCancellable("speaking")).toBe(true)
    expect(isCancellable("idle")).toBe(false)
    expect(isCancellable("thinking")).toBe(false)
    expect(isCancellable("error")).toBe(false)
  })
})
