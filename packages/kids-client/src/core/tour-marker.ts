/**
 * First-run welcome-tour marker. File existence at
 * `<configDir>/tour-seen` means the kid has been through the intro at
 * least once; the next launch goes straight to StartupScreen.
 *
 * The tour only fires when (a) marker absent AND (b) the SetupScreen
 * just ran. Returning users who inherited env vars skip it.
 */

import { existsSync, writeFileSync, chmodSync } from "node:fs"
import { join } from "node:path"

const FILE_NAME = "tour-seen"

export function hasSeenTour(configDir: string): boolean {
  return existsSync(join(configDir, FILE_NAME))
}

export function markTourSeen(configDir: string): void {
  const path = join(configDir, FILE_NAME)
  try {
    writeFileSync(path, new Date().toISOString() + "\n", "utf8")
    chmodSync(path, 0o600)
  } catch {
    /* non-fatal — re-show is a feature, not a bug */
  }
}
