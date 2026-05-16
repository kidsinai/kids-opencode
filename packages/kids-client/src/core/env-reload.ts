/**
 * Re-read ~/.config/kids-opencode/env after the setup wizard saves it,
 * and inject the values into process.env. This lets the SAME process
 * continue with the new LLM key — no `kids-opencode` re-run needed.
 */

import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

export function reloadEnvFile(configDir: string): Record<string, string> {
  const path = join(configDir, "env")
  if (!existsSync(path)) return {}
  const out: Record<string, string> = {}
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    out[key] = value
    process.env[key] = value
  }
  return out
}
