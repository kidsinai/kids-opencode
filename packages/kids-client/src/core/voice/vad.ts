/**
 * Voice-activity detection + mic-meter rendering (pure, unit-testable).
 *
 * This is a deliberately tiny energy-based VAD, not a neural one. The job:
 * let a kid press the spacebar ONCE, talk, and have the mic close on its own
 * when they stop — so they never have to remember a second keypress. A real
 * silero/webrtc VAD can drop in behind the same `shouldAutoStop` shape later;
 * the controller only depends on this signature.
 *
 * Energy levels are normalised 0..1 (0 = silence, 1 = loud). The recorder
 * feeds a rolling window of recent levels; we decide stop/continue from it.
 */

export interface VadOptions {
  /** Below this normalised energy a frame counts as silence. */
  silenceThreshold: number
  /** Continuous silence this long (ms) auto-stops the recording. */
  silenceMsToStop: number
  /** Spacing between level samples (ms). */
  sampleIntervalMs: number
  /** Ignore silence until the kid has actually spoken this long (ms), so a
   *  slow starter who pauses before their first word isn't cut off. */
  minSpeechMs: number
  /** Hard cap (ms): stop no matter what, so a stuck-open mic (or a kid who
   *  wandered off) can't record forever. Compliance + cost guard. */
  maxClipMs: number
}

export const DEFAULT_VAD: VadOptions = {
  silenceThreshold: 0.06,
  silenceMsToStop: 1500,
  sampleIntervalMs: 100,
  minSpeechMs: 400,
  maxClipMs: 30_000,
}

export type VadDecision = "continue" | "stop_silence" | "stop_max_length"

/**
 * Decide whether to keep recording given the full sequence of level samples
 * captured so far (oldest→newest). Pure: same input, same output, no clock —
 * the caller owns timing by passing `sampleIntervalMs`-spaced levels.
 *
 * Rules, in order:
 *   1. Hard cap reached → stop_max_length.
 *   2. Kid hasn't spoken `minSpeechMs` of non-silence yet → continue
 *      (don't punish a slow start).
 *   3. Trailing run of silence ≥ silenceMsToStop → stop_silence.
 *   4. Otherwise → continue.
 */
export function shouldAutoStop(levels: number[], opts: VadOptions = DEFAULT_VAD): VadDecision {
  const elapsedMs = levels.length * opts.sampleIntervalMs
  if (elapsedMs >= opts.maxClipMs) return "stop_max_length"

  const spokenMs = levels.filter((l) => l > opts.silenceThreshold).length * opts.sampleIntervalMs
  if (spokenMs < opts.minSpeechMs) return "continue"

  let trailingSilenceFrames = 0
  for (let i = levels.length - 1; i >= 0; i--) {
    if (levels[i]! > opts.silenceThreshold) break
    trailingSilenceFrames++
  }
  const trailingSilenceMs = trailingSilenceFrames * opts.sampleIntervalMs
  if (trailingSilenceMs >= opts.silenceMsToStop) return "stop_silence"

  return "continue"
}

const METER_GLYPHS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"] as const

/**
 * Render a live mic meter from the latest energy level. Terminals can't draw
 * graphics, but a row of block glyphs that jumps with the kid's voice is the
 * single most important "it's really listening to ME" signal — without it a
 * kid stares at a frozen screen and gives up.
 *
 * Returns `width` glyphs; `level` 0..1 picks the height, with a little jitter
 * across columns so it looks alive rather than a flat bar.
 */
export function renderMeter(level: number, width = 12): string {
  const clamped = Math.max(0, Math.min(1, level))
  let out = ""
  for (let i = 0; i < width; i++) {
    // Columns toward the centre read a touch taller — cheap "waveform" feel
    // without needing real per-column energy.
    const centreBias = 1 - Math.abs(i - (width - 1) / 2) / (width / 2)
    const h = clamped * (0.6 + 0.4 * centreBias)
    const idx = Math.min(METER_GLYPHS.length - 1, Math.round(h * (METER_GLYPHS.length - 1)))
    out += METER_GLYPHS[idx]
  }
  return out
}
