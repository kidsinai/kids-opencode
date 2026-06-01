import { describe, expect, test } from "bun:test"
import { shouldAutoStop, renderMeter, DEFAULT_VAD } from "../../../src/core/voice/vad.ts"

// Helpers to build level sequences at DEFAULT_VAD's 100ms spacing.
const FRAME = DEFAULT_VAD.sampleIntervalMs
const frames = (ms: number) => Math.round(ms / FRAME)
const loud = (ms: number) => Array(frames(ms)).fill(0.5)
const quiet = (ms: number) => Array(frames(ms)).fill(0.0)

describe("shouldAutoStop", () => {
  test("keeps going before the kid has spoken minSpeechMs (slow starter not cut off)", () => {
    // 1s of pure silence at the start — under minSpeechMs of speech.
    expect(shouldAutoStop(quiet(1000))).toBe("continue")
  })

  test("stops after silenceMsToStop of trailing silence once speech happened", () => {
    const seq = [...loud(800), ...quiet(DEFAULT_VAD.silenceMsToStop)]
    expect(shouldAutoStop(seq)).toBe("stop_silence")
  })

  test("does NOT stop on a short pause between words", () => {
    const seq = [...loud(800), ...quiet(500), ...loud(400)]
    expect(shouldAutoStop(seq)).toBe("continue")
  })

  test("hard cap stops a stuck-open mic regardless of speech", () => {
    const seq = loud(DEFAULT_VAD.maxClipMs + 200)
    expect(shouldAutoStop(seq)).toBe("stop_max_length")
  })

  test("trailing silence must be contiguous — speech resets the counter", () => {
    const seq = [...loud(800), ...quiet(1000), ...loud(200), ...quiet(800)]
    // only 800ms trailing silence < 1500ms
    expect(shouldAutoStop(seq)).toBe("continue")
  })
})

describe("renderMeter", () => {
  test("returns exactly `width` glyphs", () => {
    expect([...renderMeter(0.5, 12)].length).toBe(12)
    expect([...renderMeter(0.5, 6)].length).toBe(6)
  })

  test("silence renders the lowest glyph across the bar", () => {
    expect(renderMeter(0, 8)).toBe("▁".repeat(8))
  })

  test("louder input raises the bar (more tall glyphs than quiet)", () => {
    const tall = "█▇▆▅▄▃▂▁"
    const quietBar = renderMeter(0.1, 10)
    const loudBar = renderMeter(0.95, 10)
    const height = (bar: string) =>
      [...bar].reduce((sum, g) => sum + Math.max(0, tall.indexOf(g)), 0)
    // higher glyph index in `tall` = shorter; so compare via the real glyph set
    const ladder = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"]
    const h = (bar: string) => [...bar].reduce((s, g) => s + ladder.indexOf(g), 0)
    expect(h(loudBar)).toBeGreaterThan(h(quietBar))
    void height
  })

  test("clamps out-of-range levels (99 behaves like 1, -5 like 0)", () => {
    expect([...renderMeter(-5, 4)].length).toBe(4)
    expect([...renderMeter(99, 4)].length).toBe(4)
    expect(renderMeter(99, 4)).toBe(renderMeter(1, 4))
    expect(renderMeter(-5, 4)).toBe(renderMeter(0, 4))
  })
})
