// Acceptance check runner.
//
// Walks a Mission's `acceptance.yml` against the kid's current project folder
// (process.cwd()) and reports pass/fail per check. Used by:
//
//   kids-opencode check <mission-id>
//
// Pure functions; the CLI entry point is in ./check-runner.ts.

import { existsSync, readFileSync, statSync } from "node:fs"
import { join, resolve, isAbsolute } from "node:path"
import { parse as parseYaml } from "yaml"
import { bundledCoursePacksDir, findMission, loadCoursePack } from "./course-pack.js"

export interface AcceptanceFile {
  mission_id: string
  title?: string
  checks: AcceptanceCheck[]
  completion_message?: string
  parent_summary_fields?: string[]
  pack_completion_message?: string
}

export type AcceptanceCheck =
  | FileExistsCheck
  | FileContainsRegexCheck
  | FileContainsCountMinCheck
  | FileContainsAnyRegexCheck
  | FileTextLengthMinCheck
  | AllMustExistCheck
  | AuditLogCheck

interface CheckBase {
  id: string
  description: string
}

export interface FileExistsCheck extends CheckBase {
  type: "file_exists"
  path: string
}

export interface FileContainsRegexCheck extends CheckBase {
  type: "file_contains_regex"
  path: string
  pattern: string
}

export interface FileContainsCountMinCheck extends CheckBase {
  type: "file_contains_count_min"
  path: string
  pattern: string
  min_count: number
}

export interface FileContainsAnyRegexCheck extends CheckBase {
  type: "file_contains_any_regex"
  path: string
  patterns: string[]
}

export interface FileTextLengthMinCheck extends CheckBase {
  type: "file_text_length_min"
  path: string
  min_chars: number
}

export interface AllMustExistCheck extends CheckBase {
  type: "all_must_exist"
  paths: string[]
}

export interface AuditLogCheck extends CheckBase {
  type: "audit_log_check"
  audit_rule: string
}

export interface CheckResult {
  id: string
  description: string
  type: string
  status: "pass" | "fail" | "skip"
  detail?: string
}

export interface MissionResult {
  mission_id: string
  title?: string
  passed: number
  failed: number
  skipped: number
  total: number
  ok: boolean
  results: CheckResult[]
  completion_message?: string
}

/**
 * Resolve a path that's guaranteed to be inside `projectDir`. Refuses absolute
 * paths and `..` escapes, matching the plugin's path-guard discipline.
 */
function resolveProjectPath(projectDir: string, rel: string): string | null {
  if (isAbsolute(rel)) return null
  if (rel.includes("..")) return null
  return resolve(projectDir, rel)
}

/**
 * Translate PCRE-style inline modifier prefixes (`(?i)`, `(?s)`, `(?m)`) into
 * JavaScript RegExp flags. Acceptance YAMLs are authored by the curriculum
 * team; supporting the conventional `(?i)` prefix is friendlier than asking
 * authors to know JS regex specifics.
 *
 * Anything we don't recognise is left in place (so JS regex callers still
 * get the syntax error they'd otherwise get).
 */
function compileRegex(pattern: string, extraFlags = ""): RegExp {
  let flags = extraFlags
  let remaining = pattern
  const modifierRe = /^\(\?([imsux]+)\)/
  const match = modifierRe.exec(remaining)
  if (match) {
    const modifiers = match[1] ?? ""
    if (modifiers.includes("i") && !flags.includes("i")) flags += "i"
    if (modifiers.includes("s") && !flags.includes("s")) flags += "s"
    if (modifiers.includes("m") && !flags.includes("m")) flags += "m"
    // u/x silently ignored — x (extended) has no JS equivalent
    remaining = remaining.slice(match[0].length)
  }
  return new RegExp(remaining, flags)
}

/**
 * Read text from a project file; returns null if missing or unreadable.
 */
function readProjectFile(projectDir: string, rel: string): string | null {
  const full = resolveProjectPath(projectDir, rel)
  if (!full) return null
  if (!existsSync(full)) return null
  try {
    const st = statSync(full)
    if (!st.isFile()) return null
    return readFileSync(full, "utf8")
  } catch {
    return null
  }
}

function evalCheck(projectDir: string, check: AcceptanceCheck): CheckResult {
  switch (check.type) {
    case "file_exists": {
      const full = resolveProjectPath(projectDir, check.path)
      const ok = !!full && existsSync(full)
      return {
        id: check.id,
        description: check.description,
        type: check.type,
        status: ok ? "pass" : "fail",
        detail: ok ? `${check.path} exists` : `${check.path} missing`,
      }
    }
    case "file_contains_regex": {
      const text = readProjectFile(projectDir, check.path)
      if (text === null) {
        return {
          id: check.id,
          description: check.description,
          type: check.type,
          status: "fail",
          detail: `${check.path} could not be read`,
        }
      }
      let re: RegExp
      try {
        re = compileRegex(check.pattern)
      } catch (err) {
        return {
          id: check.id,
          description: check.description,
          type: check.type,
          status: "fail",
          detail: `invalid regex: ${(err as Error).message}`,
        }
      }
      const ok = re.test(text)
      return {
        id: check.id,
        description: check.description,
        type: check.type,
        status: ok ? "pass" : "fail",
        detail: ok ? `pattern matched` : `pattern not found`,
      }
    }
    case "file_contains_count_min": {
      const text = readProjectFile(projectDir, check.path)
      if (text === null) {
        return {
          id: check.id,
          description: check.description,
          type: check.type,
          status: "fail",
          detail: `${check.path} could not be read`,
        }
      }
      let re: RegExp
      try {
        re = compileRegex(check.pattern, "g")
      } catch (err) {
        return {
          id: check.id,
          description: check.description,
          type: check.type,
          status: "fail",
          detail: `invalid regex: ${(err as Error).message}`,
        }
      }
      const matches = text.match(re) ?? []
      const ok = matches.length >= check.min_count
      return {
        id: check.id,
        description: check.description,
        type: check.type,
        status: ok ? "pass" : "fail",
        detail: `found ${matches.length} (need ≥ ${check.min_count})`,
      }
    }
    case "file_contains_any_regex": {
      const text = readProjectFile(projectDir, check.path)
      if (text === null) {
        return {
          id: check.id,
          description: check.description,
          type: check.type,
          status: "fail",
          detail: `${check.path} could not be read`,
        }
      }
      const ok = check.patterns.some((p) => {
        try {
          return compileRegex(p).test(text)
        } catch {
          return false
        }
      })
      return {
        id: check.id,
        description: check.description,
        type: check.type,
        status: ok ? "pass" : "fail",
        detail: ok ? `one of the patterns matched` : `none of the patterns matched`,
      }
    }
    case "file_text_length_min": {
      const text = readProjectFile(projectDir, check.path)
      if (text === null) {
        return {
          id: check.id,
          description: check.description,
          type: check.type,
          status: "fail",
          detail: `${check.path} could not be read`,
        }
      }
      // Tag-stripped length for the "actual content" heuristic.
      const stripped = text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()
      const ok = stripped.length >= check.min_chars
      return {
        id: check.id,
        description: check.description,
        type: check.type,
        status: ok ? "pass" : "fail",
        detail: `text length ${stripped.length} (need ≥ ${check.min_chars})`,
      }
    }
    case "all_must_exist": {
      const missing = check.paths.filter((p) => {
        const full = resolveProjectPath(projectDir, p)
        return !full || !existsSync(full)
      })
      const ok = missing.length === 0
      return {
        id: check.id,
        description: check.description,
        type: check.type,
        status: ok ? "pass" : "fail",
        detail: ok ? `all paths present` : `missing: ${missing.join(", ")}`,
      }
    }
    case "audit_log_check": {
      // V0: audit log is stderr-only. We don't have a way to retroactively
      // walk it from the runner. Skip with a note so the kid sees the
      // intent but isn't blocked by a check we can't yet enforce.
      return {
        id: check.id,
        description: check.description,
        type: check.type,
        status: "skip",
        detail: `audit_log_check '${check.audit_rule}' requires platform-backend Phase 5 ingestion; not evaluated offline`,
      }
    }
    default: {
      // Exhaustiveness check.
      const _: never = check
      return {
        id: (check as CheckBase).id,
        description: (check as CheckBase).description,
        type: (check as { type: string }).type,
        status: "fail",
        detail: `unsupported check type`,
      }
    }
  }
}

/**
 * Load `acceptance.yml` for a Mission by (packId, missionId).
 * Returns null if the file is missing or unparseable.
 */
export function loadAcceptanceForMission(
  packId: string,
  missionId: string,
): AcceptanceFile | null {
  if (!packId || !missionId) return null
  if (packId.includes("/") || packId.includes("..")) return null
  if (missionId.includes("/") || missionId.includes("..")) return null

  const acceptancePath = join(bundledCoursePacksDir(), packId, missionId, "acceptance.yml")
  if (!existsSync(acceptancePath)) return null

  try {
    const raw = readFileSync(acceptancePath, "utf8")
    return parseYaml(raw) as AcceptanceFile
  } catch {
    return null
  }
}

/**
 * Run all checks for a Mission against `projectDir` (defaults to process.cwd()).
 * Resolves the pack from KIDS_COURSE_PACK or an explicit argument.
 */
export function runMissionChecks(
  missionId: string,
  options: { packId?: string; projectDir?: string } = {},
): MissionResult | { error: string } {
  const packId = options.packId ?? process.env.KIDS_COURSE_PACK ?? ""
  const projectDir = options.projectDir ?? process.cwd()

  if (!packId) {
    return {
      error:
        "no Course Pack specified (set KIDS_COURSE_PACK or pass --course on the kids-opencode wrapper)",
    }
  }

  const pack = loadCoursePack(packId)
  if (!pack) {
    return { error: `Course Pack not found: ${packId}` }
  }
  const mission = findMission(pack, missionId)
  if (!mission) {
    return { error: `Mission '${missionId}' not in pack '${packId}'` }
  }

  const acceptance = loadAcceptanceForMission(packId, missionId)
  if (!acceptance) {
    return { error: `acceptance.yml missing or unreadable for ${packId}/${missionId}` }
  }

  const results = (acceptance.checks ?? []).map((c) => evalCheck(projectDir, c))
  const passed = results.filter((r) => r.status === "pass").length
  const failed = results.filter((r) => r.status === "fail").length
  const skipped = results.filter((r) => r.status === "skip").length

  return {
    mission_id: missionId,
    title: acceptance.title ?? mission.title,
    passed,
    failed,
    skipped,
    total: results.length,
    ok: failed === 0,
    results,
    completion_message: acceptance.completion_message,
  }
}
