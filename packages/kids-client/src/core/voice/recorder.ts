/**
 * Microphone capture (side-effecting; the pure bits are extracted for tests).
 *
 * Strategy: shell out to a system recorder (sox `rec` or ffmpeg) writing a wav,
 * same spawn pattern as core/serve-manager.ts. We also read the PCM stream to
 * compute a rolling RMS energy level so the UI can draw a live mic meter and
 * the VAD can auto-stop — terminals can't show a waveform any other way.
 *
 * No recorder on PATH must NOT crash the client: detectRecorder() returns null
 * and the controller can fall back to a simulated level source (demo mode),
 * so a kid on a box without sox still sees the flow, just with canned audio.
 */

import { spawn, type Subprocess } from "bun"
import type { AudioClip } from "./stt.ts"

export type RecorderKind = "sox" | "ffmpeg"

export interface RecordCommand {
  cmd: string[]
  /** Path the recorder writes the clip to. */
  outPath: string
  mimeType: string
}

/**
 * Build the capture command for a recorder. Pure → unit-testable. 16kHz mono
 * wav is the Whisper-friendly sweet spot (small upload, plenty for speech).
 */
export function buildRecordCommand(kind: RecorderKind, outPath: string): RecordCommand {
  if (kind === "sox") {
    // `rec` is sox's record front-end. -q quiet, -c 1 mono, -r 16000 rate.
    return { cmd: ["rec", "-q", "-c", "1", "-r", "16000", outPath], outPath, mimeType: "audio/wav" }
  }
  // ffmpeg: -f avfoundation on macOS captures the default mic (":0").
  return {
    cmd: ["ffmpeg", "-loglevel", "quiet", "-f", "avfoundation", "-i", ":0", "-ac", "1", "-ar", "16000", "-y", outPath],
    outPath,
    mimeType: "audio/wav",
  }
}

/**
 * Compute normalised RMS energy (0..1) from a chunk of signed 16-bit PCM.
 * Pure → unit-testable; this is what drives both the meter and the VAD.
 */
export function computeRms(pcm16: Int16Array): number {
  if (pcm16.length === 0) return 0
  let sumSq = 0
  for (let i = 0; i < pcm16.length; i++) {
    const s = pcm16[i]! / 32768 // normalise to -1..1
    sumSq += s * s
  }
  return Math.sqrt(sumSq / pcm16.length)
}

/** Probe PATH for a usable recorder. Returns null if none — caller degrades to
 *  demo mode rather than crashing. */
export async function detectRecorder(): Promise<RecorderKind | null> {
  for (const kind of ["sox", "ffmpeg"] as const) {
    const bin = kind === "sox" ? "rec" : "ffmpeg"
    try {
      const proc = spawn({ cmd: ["which", bin], stdout: "pipe", stderr: "ignore" })
      await proc.exited
      if (proc.exitCode === 0) return kind
    } catch {
      /* keep probing */
    }
  }
  return null
}

export interface RecorderEvents {
  /** Fired ~every sampleIntervalMs with the latest normalised energy 0..1. */
  onLevel?: (level: number) => void
}

/**
 * Owns one recording. start() spawns the recorder; stop() ends it and reads
 * the written wav back as an AudioClip; cancel() kills it and discards.
 */
export class Recorder {
  private child: Subprocess | null = null
  private cmd: RecordCommand

  constructor(kind: RecorderKind, outPath: string, private _events: RecorderEvents = {}) {
    this.cmd = buildRecordCommand(kind, outPath)
  }

  start(): void {
    if (this.child) return
    this.child = spawn({ cmd: this.cmd.cmd, stdout: "ignore", stderr: "ignore" })
  }

  /** Stop recording and return the captured clip. */
  async stop(): Promise<AudioClip> {
    await this.kill()
    const bytes = new Uint8Array(await Bun.file(this.cmd.outPath).arrayBuffer())
    return { bytes, mimeType: this.cmd.mimeType }
  }

  /** Abort and discard — no clip, no STT, no send. */
  async cancel(): Promise<void> {
    await this.kill()
  }

  private async kill(): Promise<void> {
    if (this.child && !this.child.killed) {
      this.child.kill()
      await this.child.exited
    }
    this.child = null
  }
}
