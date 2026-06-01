/**
 * Thin wrapper over the server's `find.files` for the `@file` mention
 * autocomplete. Duck-typed + defensive (like models.ts): a missing endpoint or
 * an error degrades to an empty list rather than crashing the input.
 *
 * Kid-safe: this only *lists* project file paths so the kid can name one. The
 * AI reads it through the existing `read` tool (already on the kid whitelist) —
 * we add no new capability here.
 */

import type { OpencodeClient } from "./connection.ts"

const MAX_FILES = 8

export async function findFiles(client: OpencodeClient, query: string, limit = MAX_FILES): Promise<string[]> {
  const api = client as unknown as { find?: { files?: (params: unknown, options?: unknown) => Promise<unknown> } }
  if (typeof api.find?.files !== "function") return []
  try {
    const raw = await api.find.files({ query: query || "", type: "file", limit })
    return extractPaths(raw).slice(0, limit)
  } catch {
    return []
  }
}

export function extractPaths(raw: unknown): string[] {
  const arr = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data)
      ? ((raw as { data: unknown[] }).data)
      : []
  const out: string[] = []
  for (const item of arr) {
    if (typeof item === "string") out.push(item)
    else if (item && typeof item === "object") {
      const p = (item as { path?: string; absolute?: string }).path ?? (item as { absolute?: string }).absolute
      if (typeof p === "string") out.push(p)
    }
  }
  return out
}
