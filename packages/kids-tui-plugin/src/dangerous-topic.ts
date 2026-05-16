// Dangerous-topic detector + Kids Helpline overlay text.
//
// The server-side plugin's system prompt rule #10 already instructs the AI
// to STOP coding and refer the kid to Kids Helpline 1800 55 1800. But the
// kid sees a wall of text, not a visual signal. This module powers the
// TUI plugin's overlay modal: when the AI's response mentions Kids
// Helpline (or matches a self-harm signal pattern), the modal pops up
// over the chat with the helpline number in big text.
//
// Conservative on false positives: triggering an overlay over normal
// coding chat would be annoying. Triggers only on the explicit Helpline
// reference our system prompt drops in, plus a small set of unambiguous
// in-the-clear self-harm signals.
//
// Locale-aware so AU + zh-Hans both work.

import { type Locale } from "./status-text.js"

/** The exact phrase the server-side system prompt emits as the helpline reference. */
const HELPLINE_PHRASE = "Kids Helpline on 1800 55 1800"

/**
 * Plain-text patterns we treat as self-harm signals in either the AI's
 * response or the kid's input. Intentionally narrow: each phrase below is
 * one a coder would not say accidentally about their code.
 *
 * If the upstream model is good, our system prompt already triggers a
 * Helpline mention. This list exists for the edge case where the model
 * fails to escalate.
 */
const SELF_HARM_HINTS: string[] = [
  "i want to die",
  "want to kill myself",
  "going to kill myself",
  "end my life",
  "suicide",
  "i hate being alive",
  "want to hurt myself",
  "self-harm",
  "self harm",
]

export interface DangerousTopicMatch {
  triggered: boolean
  reason: "helpline_mention" | "self_harm_hint" | null
  matchedText: string | null
}

/**
 * Detect whether a chunk of text (typically the AI's latest reply OR the
 * kid's typed message) is a dangerous-topic trigger that should pop the
 * Helpline overlay.
 *
 * Pure + cheap: called on every streamed text part. O(text length × n
 * hints), n is small constant. False negatives are acceptable; false
 * positives are annoying for kids so we keep the hint list narrow.
 */
export function detectDangerousTopic(text: string): DangerousTopicMatch {
  if (!text) return { triggered: false, reason: null, matchedText: null }

  // Strongest signal: our system prompt told the AI to write this.
  if (text.includes(HELPLINE_PHRASE)) {
    return {
      triggered: true,
      reason: "helpline_mention",
      matchedText: HELPLINE_PHRASE,
    }
  }

  // Defensive: kid (or AI under jailbreak) types something explicit.
  const lower = text.toLowerCase()
  for (const hint of SELF_HARM_HINTS) {
    if (lower.includes(hint)) {
      return {
        triggered: true,
        reason: "self_harm_hint",
        matchedText: hint,
      }
    }
  }

  return { triggered: false, reason: null, matchedText: null }
}

export interface HelplineOverlay {
  title: string
  body: string
  helplineLine: string
  callToAction: string
}

/**
 * The actual overlay content shown by the TUI dialog. Plain strings so the
 * TUI render layer just lays them out; no markdown parsing required.
 */
export function buildHelplineOverlay(locale: Locale = "en"): HelplineOverlay {
  if (locale === "zh-Hans") {
    return {
      title: "我们暂停一下",
      body: "听上去有重要的事情。请马上找一个你信任的大人聊聊 —— 家长、老师、亲戚都可以。",
      helplineLine: "澳大利亚：Kids Helpline 拨打 1800 55 1800（免费 · 24 小时）",
      callToAction: "按任意键继续，然后想想要不要找人聊。",
    }
  }
  // Default English
  return {
    title: "Let's take a moment",
    body: "It sounds like something serious is going on. The best thing right now is to talk to a parent, teacher, or someone you trust.",
    helplineLine: "In Australia: Kids Helpline — call 1800 55 1800 (free, 24/7)",
    callToAction: "Press any key to continue, then think about who you'll talk to.",
  }
}
