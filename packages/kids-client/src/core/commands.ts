/**
 * Kid-safe slash-command registry.
 *
 * kids-client is a custom minimal TUI (not opencode's native one), so it grows
 * its OWN command set rather than exposing opencode's full palette. This module
 * is pure metadata + parsing — the actual effects live in index.tsx's prompt
 * dispatcher (it needs the store / session / client). Keeping it pure makes the
 * list unit-testable and lets MissionScreen render live suggestions.
 *
 * Deliberately EXCLUDED for kid-safety: /share (public links), /editor &
 * drop-to-shell, external @-mentions, arbitrary config edits. The server-side
 * tool whitelist (kids-plugin system prompt) blocks the dangerous primitives
 * anyway; we just don't surface the affordances.
 */

export type Locale = "zh-Hans" | "en"

export interface KidCommand {
  id: string
  /** Primary slash form, e.g. "/model". */
  slash: string
  /** Extra accepted spellings, e.g. ["/models"]. */
  aliases?: string[]
  label: { en: string; zh: string }
  hint: { en: string; zh: string }
}

/** Order here is the order shown in the suggestion list / /help. */
export const COMMANDS: KidCommand[] = [
  { id: "help", slash: "/help", aliases: ["/?", "/commands"],
    label: { en: "Help", zh: "帮助" },
    hint: { en: "Show what you can type", zh: "看看能输入哪些命令" } },
  { id: "model", slash: "/model", aliases: ["/models"],
    label: { en: "Pick AI model", zh: "选 AI 模型" },
    hint: { en: "Choose which AI helps you", zh: "换一个帮你的 AI 模型" } },
  { id: "sessions", slash: "/sessions", aliases: ["/history", "/chats"],
    label: { en: "Past chats", zh: "历史对话" },
    hint: { en: "Open an earlier conversation", zh: "打开之前的对话" } },
  { id: "new", slash: "/new",
    label: { en: "New chat", zh: "开新对话" },
    hint: { en: "Start a fresh conversation", zh: "清空，开始一段新的对话" } },
  { id: "check", slash: "/check", aliases: ["/done"],
    label: { en: "Check my work", zh: "验收作品" },
    hint: { en: "See if you finished the mission", zh: "看看这一关完成没有" } },
  { id: "clear", slash: "/clear",
    label: { en: "Clear screen", zh: "清屏" },
    hint: { en: "Clear the chat (your files stay)", zh: "清空聊天记录（文件不动）" } },
  { id: "compact", slash: "/compact",
    label: { en: "Shrink this chat", zh: "压缩对话" },
    hint: { en: "Summarise a long chat to save space", zh: "把很长的对话压缩一下,省空间" } },
  { id: "menu", slash: "/menu", aliases: ["/home"],
    label: { en: "Main menu", zh: "主菜单" },
    hint: { en: "Back to the start screen", zh: "回到开始界面" } },
  { id: "quit", slash: "/quit", aliases: ["/exit"],
    label: { en: "Quit", zh: "退出" },
    hint: { en: "Close Kids OpenCode", zh: "关闭 Kids OpenCode" } },
]

export interface ParsedCommand {
  /** The slash token as typed, lowercased, incl. leading "/", e.g. "/model". */
  name: string
  /** Everything after the command word, trimmed (may be ""). */
  args: string
}

/** Parse a slash command line. Returns null if `text` isn't a `/command`. */
export function parseSlash(text: string): ParsedCommand | null {
  const t = text.trim()
  if (!t.startsWith("/")) return null
  const space = t.indexOf(" ")
  if (space === -1) return { name: t.toLowerCase(), args: "" }
  return { name: t.slice(0, space).toLowerCase(), args: t.slice(space + 1).trim() }
}

/** Resolve a parsed command name (e.g. "/models") to its KidCommand. */
export function matchCommand(name: string): KidCommand | null {
  const n = name.toLowerCase()
  for (const c of COMMANDS) {
    if (c.slash === n) return c
    if (c.aliases?.includes(n)) return c
  }
  return null
}

/**
 * Commands matching a draft query (the text the kid has typed so far,
 * including the leading "/"). "/" alone returns everything. Matches against
 * slash, aliases, id, and both labels so "/mod" or "/模型"-style typing finds
 * the model command.
 */
export function filterCommands(query: string): KidCommand[] {
  const q = query.trim().toLowerCase()
  if (q === "" || q === "/") return COMMANDS
  return COMMANDS.filter((c) => {
    const hay = [c.slash, ...(c.aliases ?? []), c.id, c.label.en, c.label.zh]
      .join(" ")
      .toLowerCase()
    return hay.includes(q.replace(/^\//, ""))
  })
}

export function commandLabel(c: KidCommand, locale: Locale): string {
  return locale === "zh-Hans" ? c.label.zh : c.label.en
}

export function commandHint(c: KidCommand, locale: Locale): string {
  return locale === "zh-Hans" ? c.hint.zh : c.hint.en
}
