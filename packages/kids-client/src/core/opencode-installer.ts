/**
 * In-TUI installer for the upstream `opencode` CLI binary.
 *
 * The kid (or their parent) should never have to drop back to a shell
 * prompt and paste a `curl ... | sh` line. If the AI engine isn't
 * installed when the wizard starts, we run the installer ourselves and
 * stream its progress to the SetupScreen.
 */

import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

/** True if the upstream opencode binary is on PATH or in its standard install location. */
export function hasOpencodeBinary(): boolean {
  // PATH lookup (POSIX). `which` and `command -v` aren't reliable as
  // child_process commands without a shell, so just check $PATH dirs.
  const pathDirs = (process.env.PATH ?? "").split(":")
  const candidates = [
    ...pathDirs.map((d) => join(d, "opencode")),
    join(homedir(), ".opencode", "bin", "opencode"),
    "/usr/local/bin/opencode",
    "/opt/homebrew/bin/opencode",
  ]
  return candidates.some((p) => existsSync(p))
}

export interface InstallResult {
  ok: boolean
  error?: string
}

/**
 * Run the upstream installer in a subprocess, streaming each output line
 * to `onProgress`. Resolves when the subprocess exits.
 *
 * Uses /bin/sh + curl pipe to match upstream's official install command.
 * The whole thing typically takes 15-45 seconds depending on network.
 */
export function installOpencode(onProgress: (line: string) => void): Promise<InstallResult> {
  return new Promise((resolve) => {
    const child = spawn("sh", ["-c", "curl -fsSL https://opencode.ai/install | sh"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    })

    const handleStream = (stream: NodeJS.ReadableStream): void => {
      let buf = ""
      stream.on("data", (chunk: Buffer | string) => {
        buf += chunk.toString()
        let nl: number
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl)
          buf = buf.slice(nl + 1)
          const trimmed = line.replace(/\r/g, "").trim()
          if (trimmed) onProgress(trimmed)
        }
      })
    }
    if (child.stdout) handleStream(child.stdout)
    if (child.stderr) handleStream(child.stderr)

    child.on("error", (err) => {
      resolve({ ok: false, error: err.message })
    })
    child.on("close", (code) => {
      if (code === 0) {
        // Make sure the new bin dir is on PATH for the remainder of THIS run,
        // so subsequent calls (postinstall plugin registration etc.) can find
        // opencode without waiting for a shell restart.
        const newBin = join(homedir(), ".opencode", "bin")
        if (!process.env.PATH?.includes(newBin)) {
          process.env.PATH = `${newBin}:${process.env.PATH ?? ""}`
        }
        resolve({ ok: true })
      } else {
        resolve({ ok: false, error: `installer exited with code ${code}` })
      }
    })
  })
}
