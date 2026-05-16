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
}

export function createKidsClient(opts: ConnectionOptions): OpencodeClient {
  const authHeader = "Basic " + btoa(`:${opts.serverPassword}`)
  return createOpencodeClient({
    baseUrl: opts.baseUrl,
    headers: {
      authorization: authHeader,
    },
  } as Parameters<typeof createOpencodeClient>[0])
}
