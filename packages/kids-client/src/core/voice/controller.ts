/**
 * Voice controller — wires the parts into one "voice engine" the UI drives:
 *
 *   spacebar ─▶ start() ─▶ recorder captures, feedLevel() streams energy
 *                            │
 *                   VAD says stop (silence/maxlen) ──▶ stop()
 *                            │
 *                   recorder → AudioClip → STT → text ──▶ onTranscript(text)
 *                                                          (UI calls session.prompt)
 *
 * Deliberately owns NO timers and does NO spawning itself — the recorder
 * produces level events, the UI/recorder calls feedLevel(), and this class
 * only advances the state machine and decides start/stop/cancel. That keeps
 * it pure enough to unit-test the whole orchestration with a mock recorder +
 * MockStt, no microphone or clock required.
 */

import { transition, type VoiceState } from "./state.ts"
import { shouldAutoStop, DEFAULT_VAD, type VadOptions } from "./vad.ts"
import type { AudioClip, SttAdapter } from "./stt.ts"

/** Minimal recorder surface the controller needs (Recorder implements it; tests mock it). */
export interface RecorderLike {
  start(): void
  stop(): Promise<AudioClip>
  cancel(): Promise<void>
}

export interface VoiceControllerEvents {
  /** Every state change — UI re-renders mic indicator / meter / spinner. */
  onState?: (state: VoiceState) => void
  /** Latest mic energy 0..1 — UI draws the meter. */
  onLevel?: (level: number) => void
  /** STT produced text — UI sends it via session.prompt and echoes it. */
  onTranscript?: (text: string) => void
  /** Recording/STT failed — UI shows a gentle retry hint. */
  onError?: (err: Error) => void
}

export class VoiceController {
  private state: VoiceState = "idle"
  private levels: number[] = []

  constructor(
    private recorder: RecorderLike,
    private stt: SttAdapter,
    private events: VoiceControllerEvents = {},
    private vad: VadOptions = DEFAULT_VAD,
  ) {}

  getState(): VoiceState {
    return this.state
  }

  private set(next: VoiceState): void {
    if (next === this.state) return
    this.state = next
    this.events.onState?.(next)
  }

  /** Spacebar while idle. Opens the mic. No-op if not idle. */
  start(): void {
    if (this.state !== "idle") return
    this.levels = []
    this.set(transition(this.state, { type: "START" }))
    this.recorder.start()
  }

  /**
   * Feed one energy sample (the recorder calls this ~every sampleIntervalMs).
   * Updates the meter and, once VAD says so, auto-stops — so the kid only ever
   * pressed the spacebar once. No-op unless we're listening.
   */
  feedLevel(level: number): void {
    if (this.state !== "listening") return
    this.levels.push(level)
    this.events.onLevel?.(level)
    if (shouldAutoStop(this.levels, this.vad) !== "continue") {
      void this.stop()
    }
  }

  /** Spacebar/Enter again, or VAD auto-stop. Ends capture, runs STT, emits text. */
  async stop(): Promise<void> {
    if (this.state !== "listening") return
    this.set(transition(this.state, { type: "STOP" })) // → transcribing
    try {
      const clip = await this.recorder.stop()
      const { text } = await this.stt.transcribe(clip)
      this.set(transition(this.state, { type: "TRANSCRIBED" })) // → thinking
      this.events.onTranscript?.(text)
    } catch (err) {
      this.set(transition(this.state, { type: "ERROR" }))
      this.events.onError?.(err instanceof Error ? err : new Error(String(err)))
    }
  }

  /** Esc. Throws the clip away with no send. Safe from any cancellable state. */
  async cancel(): Promise<void> {
    if (this.state === "listening") {
      await this.recorder.cancel()
    }
    this.set(transition(this.state, { type: "CANCEL" }))
  }

  /** UI signals the LLM reply landed (and TTS, if any, finished). */
  replied(): void {
    this.set(transition(this.state, { type: "REPLIED" }))
  }
  spoken(): void {
    this.set(transition(this.state, { type: "SPOKEN" }))
  }
  reset(): void {
    this.set(transition(this.state, { type: "RESET" }))
  }
}
