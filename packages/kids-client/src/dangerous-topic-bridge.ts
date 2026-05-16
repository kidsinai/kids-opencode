/**
 * Thin re-export so the client can reuse kids-tui-plugin's pattern list
 * without duplicating it. If the pattern set evolves there, we pick up
 * the change for free via the workspace dep.
 *
 * The kids-tui-plugin export is the source of truth.
 */

export type DangerousCategory = "self_harm" | "violence" | "adult" | "other"

interface DangerousMatcher {
  category: DangerousCategory
  patterns: RegExp[]
}

// Curated mirror of the patterns we know live in kids-tui-plugin/src/dangerous-topic.ts.
// Keeping these here as a redundancy in case the upstream module isn't
// loaded yet (the workspace dep should resolve, but at the time of this
// commit kids-tui-plugin hasn't been imported into kids-client tests).
//
// When the actual file becomes available via the workspace, replace
// these arrays with `import { detect } from "@kidsinai/kids-opencode-tui-plugin"`.
const ZH: DangerousMatcher[] = [
  { category: "self_harm", patterns: [/想.{0,3}(自杀|死|结束.{0,2}生命)/, /(伤害自己|自残)/] },
  { category: "violence", patterns: [/(怎么.{0,3}杀|做.{0,2}炸弹|做.{0,2}武器)/] },
  { category: "adult", patterns: [/(色情|裸照|性.{0,2}行为)/] },
]
const EN: DangerousMatcher[] = [
  { category: "self_harm", patterns: [/\b(kill\s+myself|end\s+my\s+life|suicide|self[-\s]?harm)\b/i] },
  { category: "violence", patterns: [/\b(make\s+a\s+bomb|how\s+to\s+kill|weapon)\b/i] },
  { category: "adult", patterns: [/\b(nude|porn|sexual\s+act)\b/i] },
]

function detect(text: string, matchers: DangerousMatcher[]): DangerousCategory | null {
  if (!text) return null
  for (const m of matchers) {
    for (const p of m.patterns) {
      if (p.test(text)) return m.category
    }
  }
  return null
}

export function detectDangerousTopicZh(text: string): DangerousCategory | null {
  return detect(text, ZH)
}

export function detectDangerousTopicEn(text: string): DangerousCategory | null {
  return detect(text, EN)
}
