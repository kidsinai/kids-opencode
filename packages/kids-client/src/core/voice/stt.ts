/**
 * Speech-to-text adapter (pluggable).
 *
 * HARD RULE (moat + minors compliance): STT MUST go through DeepRouter, never
 * a third-party STT API directly. DeepRouter is the single gateway where we
 * meter cost (Stars), enforce AU data residency, and capture the interaction
 * data flywheel. Bypassing it leaks the moat — see airbotix
 * docs/product/moat-strategy.md.
 *
 * The controller depends only on `SttAdapter`, so tests use the mock and a
 * no-key dogfood run degrades to mock instead of crashing.
 */

export interface AudioClip {
  /** Raw encoded audio (e.g. wav/webm bytes from the recorder). */
  bytes: Uint8Array
  /** MIME type, e.g. "audio/wav". Drives the multipart filename/type. */
  mimeType: string
}

export interface SttResult {
  text: string
  /** 0..1 if the backend reports it; undefined otherwise. */
  confidence?: number
}

export interface SttAdapter {
  transcribe(clip: AudioClip): Promise<SttResult>
}

export interface DeepRouterSttConfig {
  /** DeepRouter OpenAI-compatible base, e.g. https://api.deeprouter.../v1 */
  baseUrl: string
  apiKey: string
  /** Whisper-style model id exposed by DeepRouter. */
  model: string
  /** Optional BCP-47 hint ("en", "zh") to bias recognition. */
  language?: string
}

const MIME_EXT: Record<string, string> = {
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
}

/** Build the multipart body for DeepRouter's /audio/transcriptions endpoint.
 *  Pulled out as a pure helper so the field shape is unit-testable without a
 *  live network call. Mirrors the OpenAI Whisper request contract that
 *  DeepRouter is expected to proxy (⚙️ confirm DeepRouter exposes this path). */
export function buildTranscriptionForm(clip: AudioClip, cfg: DeepRouterSttConfig): FormData {
  const ext = MIME_EXT[clip.mimeType] ?? "wav"
  const form = new FormData()
  form.append("file", new Blob([clip.bytes as BlobPart], { type: clip.mimeType }), `clip.${ext}`)
  form.append("model", cfg.model)
  if (cfg.language) form.append("language", cfg.language)
  return form
}

/** Pull the transcript text out of an OpenAI-compatible JSON response,
 *  tolerating the common shapes ({text} or {data:{text}}). */
export function extractTranscript(payload: unknown): SttResult | null {
  if (!payload || typeof payload !== "object") return null
  const p = payload as { text?: string; confidence?: number; data?: { text?: string } }
  const text = p.text ?? p.data?.text
  if (typeof text !== "string") return null
  return { text, confidence: p.confidence }
}

export class DeepRouterStt implements SttAdapter {
  constructor(private cfg: DeepRouterSttConfig) {}

  async transcribe(clip: AudioClip): Promise<SttResult> {
    const res = await fetch(`${this.cfg.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.cfg.apiKey}` },
      body: buildTranscriptionForm(clip, this.cfg),
    })
    if (!res.ok) {
      throw new Error(`DeepRouter STT ${res.status}: ${await safeText(res)}`)
    }
    const result = extractTranscript(await res.json())
    if (!result) throw new Error("DeepRouter STT: unrecognised response shape")
    return result
  }
}

/** Deterministic adapter for tests and no-key dogfood runs. */
export class MockStt implements SttAdapter {
  constructor(private canned = "（示例）帮我做一个会动的小猫") {}
  async transcribe(_clip: AudioClip): Promise<SttResult> {
    return { text: this.canned, confidence: 1 }
  }
}

/**
 * Pick an adapter from config. Falls back to MockStt (and tells the caller it
 * did, so the UI can show a "voice is in demo mode" hint) when DeepRouter
 * creds are absent — a missing key must never hard-crash the client.
 */
export function resolveSttAdapter(
  cfg: Partial<DeepRouterSttConfig> | undefined,
): { adapter: SttAdapter; mode: "deeprouter" | "mock" } {
  if (cfg?.baseUrl && cfg.apiKey && cfg.model) {
    return { adapter: new DeepRouterStt(cfg as DeepRouterSttConfig), mode: "deeprouter" }
  }
  return { adapter: new MockStt(), mode: "mock" }
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 200)
  } catch {
    return "<no body>"
  }
}
