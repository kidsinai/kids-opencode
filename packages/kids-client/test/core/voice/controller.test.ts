import { describe, expect, test } from "bun:test"
import { VoiceController, type RecorderLike } from "../../../src/core/voice/controller.ts"
import { MockStt, type AudioClip } from "../../../src/core/voice/stt.ts"
import { DEFAULT_VAD } from "../../../src/core/voice/vad.ts"

const clip: AudioClip = { bytes: new Uint8Array([1]), mimeType: "audio/wav" }

class FakeRecorder implements RecorderLike {
  started = false
  cancelled = false
  start() {
    this.started = true
  }
  async stop() {
    return clip
  }
  async cancel() {
    this.cancelled = true
  }
}

const FRAME = DEFAULT_VAD.sampleIntervalMs
const framesFor = (ms: number) => Math.round(ms / FRAME)

describe("VoiceController orchestration", () => {
  test("start opens mic and moves to listening", () => {
    const rec = new FakeRecorder()
    const c = new VoiceController(rec, new MockStt("hi"))
    c.start()
    expect(c.getState()).toBe("listening")
    expect(rec.started).toBe(true)
  })

  test("VAD auto-stop after speech+silence runs STT and emits transcript", async () => {
    const rec = new FakeRecorder()
    const transcripts: string[] = []
    const c = new VoiceController(rec, new MockStt("做个小游戏"), {
      onTranscript: (t) => transcripts.push(t),
    })
    c.start()
    // 800ms speech…
    for (let i = 0; i < framesFor(800); i++) c.feedLevel(0.5)
    // …then enough trailing silence to trip the VAD.
    for (let i = 0; i < framesFor(DEFAULT_VAD.silenceMsToStop); i++) c.feedLevel(0)
    // stop() is fired async inside feedLevel; let microtasks drain.
    await new Promise((r) => setTimeout(r, 0))
    expect(transcripts).toEqual(["做个小游戏"])
    expect(c.getState()).toBe("thinking")
  })

  test("feedLevel is ignored once not listening (no double recording)", () => {
    const c = new VoiceController(new FakeRecorder(), new MockStt())
    const levels: number[] = []
    // never started → still idle
    c.feedLevel(0.9)
    expect(levels.length).toBe(0)
    expect(c.getState()).toBe("idle")
  })

  test("Esc cancels: recorder discarded, back to idle, no transcript", async () => {
    const rec = new FakeRecorder()
    const transcripts: string[] = []
    const c = new VoiceController(rec, new MockStt(), { onTranscript: (t) => transcripts.push(t) })
    c.start()
    await c.cancel()
    expect(rec.cancelled).toBe(true)
    expect(c.getState()).toBe("idle")
    expect(transcripts).toEqual([])
  })

  test("STT failure routes to error state and onError", async () => {
    const failing = {
      transcribe: async () => {
        throw new Error("stt down")
      },
    }
    const errors: Error[] = []
    const c = new VoiceController(new FakeRecorder(), failing, { onError: (e) => errors.push(e) })
    c.start()
    await c.stop()
    expect(c.getState()).toBe("error")
    expect(errors[0]?.message).toBe("stt down")
  })

  test("tail transitions: stop → thinking → replied → speaking → spoken → idle", async () => {
    const c = new VoiceController(new FakeRecorder(), new MockStt("hi"))
    c.start()
    await c.stop() // listening → transcribing → thinking
    expect(c.getState()).toBe("thinking")
    c.replied()
    expect(c.getState()).toBe("speaking")
    c.spoken()
    expect(c.getState()).toBe("idle")
  })
})
