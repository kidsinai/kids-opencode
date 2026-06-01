/**
 * Tiny file-based debug logger.
 *
 * Always-on writes to ~/.config/kids-opencode/debug.log so we can see what
 * actually happened in a TUI session after the fact (Ink owns the terminal,
 * so console.log/error doesn't show on screen and would also break the
 * alt-screen-buffer canvas).
 *
 * Set KIDS_DEBUG=0 to silence it. Otherwise it's on by default while we're
 * still chasing the "thinking…" hang in dogfood.
 */

import { appendFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { homedir } from "node:os"

const PATH = process.env.KIDS_DEBUG_LOG
  ?? join(process.env.KIDS_OPENCODE_CONFIG_DIR ?? join(homedir(), ".config", "kids-opencode"), "debug.log")

const ENABLED = process.env.KIDS_DEBUG !== "0"

let initialised = false

function init(): void {
  if (initialised) return
  try {
    mkdirSync(dirname(PATH), { recursive: true })
    appendFileSync(PATH, `\n===== kids-client debug log opened at ${new Date().toISOString()} (pid ${process.pid}) =====\n`, "utf8")
  } catch {
    // can't init — disable to avoid further failures
    initialised = true
    return
  }
  initialised = true
}

export function debug(message: string, fields?: Record<string, unknown>): void {
  if (!ENABLED) return
  init()
  try {
    const stamp = new Date().toISOString()
    const tail = fields ? " " + JSON.stringify(fields) : ""
    appendFileSync(PATH, `${stamp} ${message}${tail}\n`, "utf8")
  } catch {
    // best-effort, never throw from the logger
  }
}

export function debugLogPath(): string {
  return PATH
}
