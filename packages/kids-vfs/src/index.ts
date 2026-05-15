// @kidsinai/kids-vfs
//
// Phase 4 deliverable (sandbox hardening). For Phase 1-3 this is a stub.
//
// Design (per kids-opencode-spec.md §4.2):
//   - Per-(family_id, project_id) namespace; paths canonicalised; reject "..".
//   - Backing store: AWS S3 (Sydney) for blobs, Neon Postgres for metadata.
//     (Per airbotix/CLAUDE.md: no Supabase, no Fly.io; AU data stays in
//     ap-southeast-2.)
//   - Tool entry points wrap @opencode-ai/sdk Read/Write/Edit/Glob/Grep.

export const VFS_VERSION = "0.0.0";
