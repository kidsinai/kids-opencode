#!/usr/bin/env bun
//
// `kids-opencode check <mission-id>` — CLI entry point.
//
// Walks the bundled acceptance.yml for the given Mission against the kid's
// current project folder (cwd) and prints a friendly report.
//
// Resolves the Course Pack from $KIDS_COURSE_PACK or `--course <id>`.
// Exit codes:
//   0  — all checks passed
//   1  — one or more checks failed
//   2  — usage error (missing args, pack not found, etc.)

import { runMissionChecks } from "./acceptance.js"

function usage(): never {
  process.stderr.write(
    [
      "Usage: kids-opencode check <mission-id> [--course <pack-id>]",
      "",
      "Walks the Mission's acceptance criteria against the current folder.",
      "",
      "Examples:",
      "  cd ~/my-portfolio",
      "  kids-opencode check mission-1 --course portfolio-site",
      "",
      "  # Or set the env var once and check multiple times:",
      "  export KIDS_COURSE_PACK=portfolio-site",
      "  kids-opencode check mission-1",
      "  kids-opencode check mission-2",
      "",
    ].join("\n"),
  )
  process.exit(2)
}

interface ParsedArgs {
  missionId: string
  packId?: string
}

function parseArgs(argv: string[]): ParsedArgs | null {
  let missionId = ""
  let packId: string | undefined
  let i = 0
  while (i < argv.length) {
    const a = argv[i]
    if (a === "--course") {
      packId = argv[i + 1]
      i += 2
      continue
    }
    if (a?.startsWith("--course=")) {
      packId = a.slice("--course=".length)
      i += 1
      continue
    }
    if (a === "--help" || a === "-h") {
      return null
    }
    if (a && !a.startsWith("-") && !missionId) {
      missionId = a
      i += 1
      continue
    }
    i += 1
  }
  if (!missionId) return null
  return { missionId, packId }
}

function statusGlyph(status: string): string {
  switch (status) {
    case "pass":
      return "✅"
    case "fail":
      return "❌"
    case "skip":
      return "⏭ "
    default:
      return "  "
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (!args) usage()

  const result = runMissionChecks(args.missionId, { packId: args.packId })

  if ("error" in result) {
    process.stderr.write(`kids-opencode check: ${result.error}\n`)
    process.exit(2)
  }

  // Render report.
  const lines: string[] = []
  lines.push("")
  lines.push(`Mission: ${result.title ?? result.mission_id}`)
  lines.push(`Folder:  ${process.cwd()}`)
  lines.push("")
  lines.push(`Checks (${result.passed}/${result.total} pass, ${result.failed} fail, ${result.skipped} skip):`)
  for (const r of result.results) {
    lines.push(`  ${statusGlyph(r.status)}  ${r.description}`)
    if (r.detail) {
      lines.push(`        → ${r.detail}`)
    }
  }
  lines.push("")
  if (result.ok) {
    lines.push("🎉 All required checks passed.")
    if (result.completion_message) {
      lines.push("")
      lines.push(result.completion_message)
    }
  } else {
    lines.push("Some checks failed. Open the file(s) above and ask the AI for help:")
    lines.push("")
    lines.push("  kids-opencode")
    lines.push("")
    lines.push("Then say what's missing and walk through the fix together.")
  }

  process.stdout.write(lines.join("\n") + "\n")
  process.exit(result.ok ? 0 : 1)
}

main().catch((err) => {
  process.stderr.write(`kids-opencode check: ${(err as Error).message}\n`)
  process.exit(2)
})
