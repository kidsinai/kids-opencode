/**
 * SDK v2 client factory + cheap auth probe.
 *
 * The SDK ships at the @opencode-ai/sdk/v2 subpath (see Q1 verification).
 * We instantiate once per client process; reconnection on SSE drop is
 * handled by events.ts (it re-creates the stream, not the client).
 */

import { createOpencodeClient } from "@opencode-ai/sdk/v2"

export type OpencodeClient = ReturnType<typeof createOpencodeClient>

export interface ConnectionOptions {
  baseUrl: string
  serverPassword: string
  /**
   * Must match upstream's `OPENCODE_SERVER_USERNAME` (default "opencode").
   * Sending an empty username here yields a 401 against opencode ≥1.x —
   * see opencode-kernel server/auth.ts `authorized()` which requires
   * `credentials.username === config.username`.
   */
  serverUsername: string
}

export function createKidsClient(opts: ConnectionOptions): OpencodeClient {
  const authHeader = buildAuthHeader(opts.serverUsername, opts.serverPassword)
  return createOpencodeClient({
    baseUrl: opts.baseUrl,
    headers: {
      authorization: authHeader,
    },
  } as Parameters<typeof createOpencodeClient>[0])
}

/**
 * Construct the HTTP Basic-Auth header opencode serve expects.
 * Exposed so serve-manager's probe + tests can share the exact format
 * upstream `authorized()` checks against (username MUST match config,
 * default "opencode" — empty username produces 401 on opencode ≥1.x).
 */
export function buildAuthHeader(username: string, password: string): string {
  return "Basic " + btoa(`${username}:${password}`)
}
