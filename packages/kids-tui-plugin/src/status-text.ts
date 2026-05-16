// Kid-friendly status text picker.
//
// Replaces the upstream "Thinking…" / "Working…" with warmer phrasing.
// Locale-aware: zh-Hans variant for Chinese-speaking families.
//
// Pure functions so they're testable without a running TUI.

export type Locale = "en" | "zh-Hans"

export type StatusKey =
  | "thinking"
  | "writing_file"
  | "reading_file"
  | "searching"
  | "fetching_doc"
  | "ready"
  | "kid_input_waiting"

const TEXTS: Record<StatusKey, Record<Locale, string>> = {
  thinking: {
    en: "AI mentor is thinking…",
    "zh-Hans": "AI 老师在想…",
  },
  writing_file: {
    en: "Writing your file…",
    "zh-Hans": "正在写你的文件…",
  },
  reading_file: {
    en: "Looking at your file…",
    "zh-Hans": "正在看你的文件…",
  },
  searching: {
    en: "Searching your project…",
    "zh-Hans": "正在你的项目里找东西…",
  },
  fetching_doc: {
    en: "Looking up docs (MDN / web.dev)…",
    "zh-Hans": "正在查 MDN 文档…",
  },
  ready: {
    en: "Your turn — what's next?",
    "zh-Hans": "到你了 — 接下来要做什么？",
  },
  kid_input_waiting: {
    en: "Type what you want to build.",
    "zh-Hans": "在这里告诉我你想做什么。",
  },
}

/**
 * Pick a kid-friendly status string. Falls back to English if the locale
 * doesn't have an entry; falls back to the upstream key as a last resort.
 */
export function statusText(key: StatusKey, locale: Locale = "en"): string {
  const row = TEXTS[key]
  if (!row) return key
  return row[locale] ?? row.en ?? key
}

/**
 * Resolve the active locale from environment + opencode config defaults.
 * Priority: $KIDS_LOCALE → $LANG (zh-* → zh-Hans, default en) → "en".
 */
export function resolveLocale(env: NodeJS.ProcessEnv = process.env): Locale {
  const explicit = env.KIDS_LOCALE
  if (explicit === "en" || explicit === "zh-Hans") return explicit

  const lang = env.LANG ?? env.LC_ALL ?? env.LC_MESSAGES ?? ""
  if (lang.toLowerCase().startsWith("zh")) return "zh-Hans"
  return "en"
}
