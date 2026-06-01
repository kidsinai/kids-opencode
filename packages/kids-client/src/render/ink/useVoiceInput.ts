/**
 * React hook that wraps the core voice engine for the Ink UI.
 *
 * Keeps Ink out of core/: this hook is the ONLY place that turns the pure
 * VoiceController + Recorder + STT adapter into component state (voiceState +
 * meter string) and a few imperative handlers the MissionScreen binds to keys.
 *
 * Degrade-don't-crash, by design:
 *   - No sox/ffmpeg on PATH → demo mode: skips real capture, still walks the
 *     kid through the flow with a canned transcript so the UX is visible.
 *   - No DeepRouter STT creds (env) → MockStt; a missing key never crashes.
 * Both modes are surfaced via `mode` so the UI can show a "demo" hint.
 *
 * Note (v1): the meter is a "recording in progress" pulse, not true mic
 * energy, and stop is manual (space/Enter) — real-energy VAD auto-stop lands
 * once Recorder streams PCM levels. The state machine + STT path are the real,
 * tested ones (see core/voice/controller.ts).
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { VoiceController } from "../../core/voice/controller.ts"
import { Recorder, detectRecorder, type RecorderKind } from "../../core/voice/recorder.ts"
import { resolveSttAdapter, MockStt, type SttAdapter } from "../../core/voice/stt.ts"
import { renderMeter } from "../../core/voice/vad.ts"
import type { VoiceState } from "../../core/voice/state.ts"

export interface UseVoiceInput {
  voiceState: VoiceState
  /** Glyph bar for the mic indicator while listening. */
  meter: string
  /** "deeprouter" = real STT, "mock" = canned (no key / no recorder). */
  mode: "deeprouter" | "mock"
  /** True until detectRecorder() resolves. */
  ready: boolean
  startListening: () => void
  stopListening: () => void
  cancel: () => void
}

/** Read DeepRouter STT config from env (set by the wrapper / parent setup).
 *  Absent → resolveSttAdapter falls back to MockStt. */
function sttConfigFromEnv() {
  const baseUrl = process.env.KIDS_STT_BASE_URL
  const apiKey = process.env.KIDS_STT_API_KEY
  const model = process.env.KIDS_STT_MODEL
  if (!baseUrl || !apiKey || !model) return undefined
  return { baseUrl, apiKey, model, language: process.env.KIDS_STT_LANG }
}

/**
 * @param onTranscript called with recognised text; MissionScreen passes it to
 *        onPrompt() so it reaches the LLM exactly like a typed message.
 */
export function useVoiceInput(onTranscript: (text: string) => void): UseVoiceInput {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle")
  const [meter, setMeter] = useState("")
  const [mode, setMode] = useState<"deeprouter" | "mock">("mock")
  const [ready, setReady] = useState(false)

  const recorderKindRef = useRef<RecorderKind | null>(null)
  const sttRef = useRef<SttAdapter>(new MockStt())
  const controllerRef = useRef<VoiceController | null>(null)
  const pulseRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // One-time capability probe: which recorder (if any) + which STT adapter.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const kind = await detectRecorder()
      const { adapter, mode: sttMode } = resolveSttAdapter(sttConfigFromEnv())
      if (cancelled) return
      recorderKindRef.current = kind
      sttRef.current = adapter
      // No recorder → demo transcript so the flow is still walkable.
      if (!kind) sttRef.current = new MockStt()
      setMode(kind ? sttMode : "mock")
      setReady(true)
    })()
    return () => {
      cancelled = true
      if (pulseRef.current) clearInterval(pulseRef.current)
    }
  }, [])

  const stopPulse = useCallback(() => {
    if (pulseRef.current) {
      clearInterval(pulseRef.current)
      pulseRef.current = null
    }
    setMeter("")
  }, [])

  const startListening = useCallback(() => {
    if (voiceState !== "idle" || !ready) return

    const kind = recorderKindRef.current
    const outPath = join(tmpdir(), "kids-voice-clip.wav")
    // Real recorder when present; a stub one in demo mode (start/stop no-op,
    // stop() returns an empty clip and MockStt supplies canned text).
    const recorder = kind
      ? new Recorder(kind, outPath)
      : {
          start() {},
          async stop() {
            return { bytes: new Uint8Array(0), mimeType: "audio/wav" }
          },
          async cancel() {},
        }

    const controller = new VoiceController(recorder, sttRef.current, {
      onState: setVoiceState,
      onTranscript: (text) => {
        stopPulse()
        onTranscript(text)
      },
      onError: () => {
        stopPulse()
      },
    })
    controllerRef.current = controller
    controller.start()

    // "I'm listening" pulse — a lively bar so the kid knows the mic is hot,
    // even before real PCM energy drives it.
    let t = 0
    pulseRef.current = setInterval(() => {
      t += 1
      const level = 0.35 + 0.4 * Math.abs(Math.sin(t / 2))
      setMeter(renderMeter(level))
    }, 120)
  }, [voiceState, ready, onTranscript, stopPulse])

  const stopListening = useCallback(() => {
    stopPulse()
    void controllerRef.current?.stop()
  }, [stopPulse])

  const cancel = useCallback(() => {
    stopPulse()
    void controllerRef.current?.cancel()
  }, [stopPulse])

  return { voiceState, meter, mode, ready, startListening, stopListening, cancel }
}
