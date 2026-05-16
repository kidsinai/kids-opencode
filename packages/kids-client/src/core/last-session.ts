/**
 * Persists "last session" metadata so the [r] Resume option on the
 * Startup screen has something to offer.
 *
 * Note: this is NOT LLM-session resumption (PRD §5.3, deferred to V1
 * because client owns serve subprocess). It only remembers which
 * course/mission the kid was working on so they jump back into the
 * MissionScreen without re-entering flags.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"

export interface LastSession {
  coursePack: string | null
  mission: string | null
  /** ISO timestamp of the last user action. */
  lastActiveAt: string
  /** Working directory at the time, so resume picks the right project. */
  projectDir: string
}

export function lastSessionPath(configDir: string): string {
  return join(configDir, "last-session.json")
}

export function readLastSession(configDir: string): LastSession | null {
  const path = lastSessionPath(configDir)
  if (!existsSync(path)) return null
  try {
    const raw = readFileSync(path, "utf8")
    const parsed = JSON.parse(raw) as LastSession
    if (typeof parsed.lastActiveAt !== "string") return null
    return parsed
  } catch {
    return null
  }
}

export function writeLastSession(configDir: string, session: LastSession): void {
  const path = lastSessionPath(configDir)
  try {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(session, null, 2), "utf8")
  } catch {
    // Resume is a nice-to-have; silently skip if we can't persist.
  }
}
