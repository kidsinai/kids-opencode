import { describe, expect, test } from "bun:test"
import { buildRecordCommand, computeRms } from "../../../src/core/voice/recorder.ts"

describe("buildRecordCommand", () => {
  test("sox: mono 16kHz wav via rec", () => {
    const c = buildRecordCommand("sox", "/tmp/clip.wav")
    expect(c.cmd[0]).toBe("rec")
    expect(c.cmd).toContain("16000")
    expect(c.cmd).toContain("/tmp/clip.wav")
    expect(c.mimeType).toBe("audio/wav")
  })

  test("ffmpeg: mono 16kHz wav from avfoundation mic", () => {
    const c = buildRecordCommand("ffmpeg", "/tmp/clip.wav")
    expect(c.cmd[0]).toBe("ffmpeg")
    expect(c.cmd).toContain("avfoundation")
    expect(c.cmd).toContain("16000")
    expect(c.outPath).toBe("/tmp/clip.wav")
  })
})

describe("computeRms", () => {
  test("silence is 0", () => {
    expect(computeRms(new Int16Array(100))).toBe(0)
  })

  test("empty buffer is 0 (no NaN)", () => {
    expect(computeRms(new Int16Array(0))).toBe(0)
  })

  test("full-scale tone is ~1", () => {
    const pcm = new Int16Array(100).fill(32767)
    expect(computeRms(pcm)).toBeCloseTo(1, 2)
  })

  test("louder signal yields higher RMS", () => {
    const quiet = new Int16Array(100).fill(1000)
    const loud = new Int16Array(100).fill(20000)
    expect(computeRms(loud)).toBeGreaterThan(computeRms(quiet))
  })
})
