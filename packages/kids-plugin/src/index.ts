// @kidsinai/kids-plugin
//
// Registers Airbotix-specific behaviour on top of opencode via the official
// @opencode-ai/plugin interface. Phase 1 (W1-2) will populate the actual hooks
// once we've completed the upstream code archaeology.
//
// Planned hooks (per kids-opencode-spec.md §4):
//   - tool whitelist:  remove Bash; constrain Read/Write/Edit to virtual FS
//   - system prompt:   prepend kid-safe layer (course-pack aware)
//   - audit:           emit AuditLogEntry on every tool call
//   - cost meter:      surface estimated Stars before each round-trip

export const PLUGIN_VERSION = "0.0.0";
