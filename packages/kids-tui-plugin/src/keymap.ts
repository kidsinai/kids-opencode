// Simplified keymap layer for kids.
//
// Upstream's `?` help shows dozens of bindings for power users (command
// palette, agent switcher, model picker, MCP toggles, etc.). For a kid
// the choice paralyses. This layer narrows the visible-and-help-listed
// bindings to the 6-8 a kid actually uses while building a Mission.
//
// Implementation note: the actual `api.keymap.registerLayer(...)` call
// happens from src/index.ts at plugin activation. This module just
// exports the binding spec as data so it is unit-testable.

export type KidBindingId =
  | "submit"
  | "approve"
  | "deny"
  | "cancel"
  | "scroll_up"
  | "scroll_down"
  | "help"
  | "quit"

export interface KidBinding {
  id: KidBindingId
  /** Human-readable label shown in the `?` help overlay. */
  label: string
  /** Key sequence in @opentui/keymap stringify form. */
  keys: string[]
  /** Upstream command id (or pseudo-id) this binding dispatches. */
  command: string
}

/**
 * The 8 bindings a kid building a portfolio site needs. Anything else is
 * hidden from `?` help (still functional if a curious kid finds it,
 * because upstream layer is still loaded — we don't take bindings away,
 * we just don't surface them).
 */
export const KID_BINDINGS: KidBinding[] = [
  {
    id: "submit",
    label: "Send your message",
    keys: ["enter"],
    command: "session.prompt.submit",
  },
  {
    id: "approve",
    label: "Yes, do that (approve a step)",
    keys: ["y"],
    command: "permission.approve",
  },
  {
    id: "deny",
    label: "No, don't do that (deny a step)",
    keys: ["n"],
    command: "permission.deny",
  },
  {
    id: "cancel",
    label: "Stop what's happening right now",
    keys: ["esc"],
    command: "session.abort",
  },
  {
    id: "scroll_up",
    label: "Scroll up to read earlier",
    keys: ["pageup", "k"],
    command: "scroll.up",
  },
  {
    id: "scroll_down",
    label: "Scroll down",
    keys: ["pagedown", "j"],
    command: "scroll.down",
  },
  {
    id: "help",
    label: "Show this help",
    keys: ["?"],
    command: "help.show",
  },
  {
    id: "quit",
    label: "Quit (your project stays saved)",
    keys: ["ctrl+c", "ctrl+d"],
    command: "app.quit",
  },
]

/**
 * Build the layer config that @opentui/keymap consumes. Shape mirrors
 * the upstream `registerLayer({ commands, bindings })` signature.
 */
export function buildKidKeymapLayer() {
  const commands: Record<string, { description: string }> = {}
  const bindings: Record<string, string[]> = {}

  for (const b of KID_BINDINGS) {
    commands[b.command] = { description: b.label }
    bindings[b.command] = b.keys
  }

  return {
    id: "kids",
    /**
     * Higher priority than the default upstream layer so our bindings
     * win when there's a conflict (e.g. our `y` for approve vs an
     * upstream `y` for yank-something).
     */
    priority: 100,
    commands,
    bindings,
  }
}

/**
 * The exact text that fills the `?` help overlay when our layer is the
 * active surface. Pure string, line-oriented.
 */
export function buildKidHelpText(): string {
  const lines: string[] = []
  lines.push("Kids OpenCode — what each key does")
  lines.push("")
  for (const b of KID_BINDINGS) {
    const keysList = b.keys.join(" or ")
    lines.push(`  ${keysList.padEnd(20)} ${b.label}`)
  }
  lines.push("")
  lines.push("That's all you need to know. Have fun building!")
  return lines.join("\n")
}
