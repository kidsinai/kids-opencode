import { describe, expect, test } from "bun:test"
import {
  buildTranscriptionForm,
  extractTranscript,
  resolveSttAdapter,
  MockStt,
  type AudioClip,
  type DeepRouterSttConfig,
} from "../../../src/core/voice/stt.ts"

const clip: AudioClip = { bytes: new Uint8Array([1, 2, 3]), mimeType: "audio/wav" }
const cfg: DeepRouterSttConfig = {
  baseUrl: "https://api.deeprouter.test/v1",
  apiKey: "sk-test",
  model: "whisper-1",
  language: "zh",
}

describe("buildTranscriptionForm", () => {
  test("includes file, model and language fields", () => {
    const form = buildTranscriptionForm(clip, cfg)
    expect(form.get("model")).toBe("whisper-1")
    expect(form.get("language")).toBe("zh")
    const file = form.get("file")
    expect(file).toBeInstanceOf(Blob)
  })

  test("omits language when not configured", () => {
    const { language, ...noLang } = cfg
    void language
    const form = buildTranscriptionForm(clip, noLang)
    expect(form.get("language")).toBeNull()
  })
})

describe("extractTranscript", () => {
  test("reads flat {text}", () => {
    expect(extractTranscript({ text: "hello" })).toEqual({ text: "hello", confidence: undefined })
  })
  test("reads nested {data:{text}}", () => {
    expect(extractTranscript({ data: { text: "hi" } })).toEqual({ text: "hi", confidence: undefined })
  })
  test("carries confidence when present", () => {
    expect(extractTranscript({ text: "hi", confidence: 0.9 })).toEqual({ text: "hi", confidence: 0.9 })
  })
  test("returns null for shapes without text", () => {
    expect(extractTranscript({})).toBeNull()
    expect(extractTranscript(null)).toBeNull()
    expect(extractTranscript("nope")).toBeNull()
  })
})

describe("resolveSttAdapter", () => {
  test("picks DeepRouter when fully configured", () => {
    expect(resolveSttAdapter(cfg).mode).toBe("deeprouter")
  })
  test("falls back to mock when creds missing (never crashes)", () => {
    expect(resolveSttAdapter(undefined).mode).toBe("mock")
    expect(resolveSttAdapter({ baseUrl: "x" }).mode).toBe("mock")
  })
  test("mock returns deterministic text", async () => {
    const r = await new MockStt("造个游戏").transcribe(clip)
    expect(r.text).toBe("造个游戏")
  })
})
