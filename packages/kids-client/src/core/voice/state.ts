/**
 * Voice-input state machine (pure, unit-testable).
 *
 * Why a machine and not booleans: a kid mashing the spacebar mid-transcription
 * must never start a second recording or send a half clip. Modelling the
 * legal transitions explicitly makes "you can only stop while listening,
 * only cancel before we've spoken" enforceable in one place instead of
 * scattered across the Ink components.
 *
 * Terminal constraint that shapes this: a TTY reports key-DOWN but not
 * key-UP, so there is no hold-to-talk. The only press we get is a toggle.
 * Hence START and STOP are both driven by the same spacebar press, and the
 * machine — not the key handler — decides which one a given press means.
 *
 * Lifecycle:
 *   idle ──START──▶ listening ──STOP──▶ transcribing ──TRANSCRIBED──▶ thinking
 *                      │                     │                            │
 *                   CANCEL                 ERROR                        REPLIED
 *                      ▼                     ▼                            ▼
 *                    idle                  error                      speaking ──SPOKEN──▶ idle
 */

export type VoiceState =
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "error"

export type VoiceEvent =
  /** Spacebar while idle: open the mic. */
  | { type: "START" }
  /** Spacebar/Enter again, or VAD auto-stop: close the mic, begin STT. */
  | { type: "STOP" }
  /** Esc at any pre-reply point: throw the clip away, no send. */
  | { type: "CANCEL" }
  /** STT returned text; hand it to the LLM. */
  | { type: "TRANSCRIBED" }
  /** LLM reply arrived (optionally about to be spoken aloud). */
  | { type: "REPLIED" }
  /** TTS finished (or was skipped). */
  | { type: "SPOKEN" }
  /** Recording / STT / TTS blew up. */
  | { type: "ERROR" }
  /** Kid acknowledged the error screen. */
  | { type: "RESET" }

/**
 * Pure transition. Returns the next state, or the SAME state if the event
 * is illegal in the current state (callers can treat "no change" as "ignored
 * keypress" — e.g. spacebar spam during transcribing is a no-op, not a crash).
 */
export function transition(state: VoiceState, event: VoiceEvent): VoiceState {
  switch (state) {
    case "idle":
      return event.type === "START" ? "listening" : state
    case "listening":
      if (event.type === "STOP") return "transcribing"
      if (event.type === "CANCEL") return "idle"
      if (event.type === "ERROR") return "error"
      return state
    case "transcribing":
      if (event.type === "TRANSCRIBED") return "thinking"
      if (event.type === "CANCEL") return "idle"
      if (event.type === "ERROR") return "error"
      return state
    case "thinking":
      if (event.type === "REPLIED") return "speaking"
      if (event.type === "ERROR") return "error"
      return state
    case "speaking":
      // SPOKEN closes the loop; CANCEL lets a kid cut off a long spoken reply.
      if (event.type === "SPOKEN" || event.type === "CANCEL") return "idle"
      if (event.type === "ERROR") return "error"
      return state
    case "error":
      return event.type === "RESET" ? "idle" : state
  }
}

/** The mic is physically capturing audio only in this state. Used by the UI
 *  to show the "🎙 听你说…" indicator and by audit/compliance to assert the
 *  mic is never open outside it. */
export function isMicOpen(state: VoiceState): boolean {
  return state === "listening"
}

/** True while the kid can still abort with Esc (before the reply is final). */
export function isCancellable(state: VoiceState): boolean {
  return state === "listening" || state === "transcribing" || state === "speaking"
}
