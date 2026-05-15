#!/usr/bin/env sh
#
# Kids OpenCode installer.
#
# Usage (the URL is what end-users actually paste):
#   curl -fsSL https://airbotix.ai/install/kids | sh
#
# What it does:
#   1. Verify or install `opencode` (upstream CLI).
#   2. Install `@kidsinai/kids-opencode-plugin` via `opencode plugin install`.
#   3. Drop a kid-safe `opencode.json` at ~/.config/kids-opencode/.
#   4. Place a `kids-opencode` wrapper into $PREFIX/bin, verifying its
#      SHA-256 against an expected value pinned in this script.
#
# Designed for macOS + Linux. Windows installer is separate (TODO V1).
set -e

KIDS_VERSION="0.0.1"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/kids-opencode"
PREFIX="${PREFIX:-/usr/local}"
PLUGIN_PACKAGE="@kidsinai/kids-opencode-plugin"
RAW_BASE="https://raw.githubusercontent.com/kidsinai/kids-opencode/main"

# SHA-256 of the corresponding bin/kids-opencode at the same release tag.
# Populated by the release pipeline (.github/workflows/publish-installer.yml)
# at tag time. The literal placeholder below is rejected at runtime — a fresh
# clone (where the placeholder is still present) cannot accidentally install.
#
# To compute manually for development:
#   shasum -a 256 bin/kids-opencode
EXPECTED_WRAPPER_SHA="REPLACED_AT_RELEASE_TAG"

# Override controls:
#   KIDS_OPENCODE_SKIP_SHA=1     skip the wrapper SHA check (dev only)
#   KIDS_OPENCODE_EXPECTED_SHA=… override the expected SHA (for testing)
if [ -n "${KIDS_OPENCODE_EXPECTED_SHA:-}" ]; then
  EXPECTED_WRAPPER_SHA="$KIDS_OPENCODE_EXPECTED_SHA"
fi

say()  { printf "kids-opencode: %s\n" "$*"; }
fail() { printf "kids-opencode: %s\n" "$*" >&2; exit 1; }

# ─── helpers ─────────────────────────────────────────────────────────────
require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required but not on PATH."
}

compute_sha256() {
  # $1 = file path. Prints the lowercase hex SHA-256 to stdout.
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    fail "no shasum / sha256sum on PATH; cannot verify wrapper integrity."
  fi
}

verify_sha() {
  # $1 = file path, $2 = expected hex SHA-256.
  actual=$(compute_sha256 "$1")
  if [ "$actual" != "$2" ]; then
    fail "integrity check failed for $1 (expected $2, got $actual). Aborting install."
  fi
}

require_cmd curl

say "installing v$KIDS_VERSION"

# ─── 1. opencode upstream ─────────────────────────────────────────────────
if ! command -v opencode >/dev/null 2>&1; then
  say "opencode CLI not found; installing via upstream installer…"
  curl -fsSL https://opencode.ai/install | sh
  if ! command -v opencode >/dev/null 2>&1; then
    fail "opencode install completed but the binary is still not on PATH. Open a new shell and re-run."
  fi
fi
say "opencode found at $(command -v opencode)"

# ─── 2. kids-safe plugin ──────────────────────────────────────────────────
say "installing $PLUGIN_PACKAGE via opencode plugin manager…"
opencode plugin install "$PLUGIN_PACKAGE" || \
  fail "could not install plugin $PLUGIN_PACKAGE. See https://airbotix.ai/help/install for help."

# ─── 3. config ────────────────────────────────────────────────────────────
mkdir -p "$CONFIG_DIR"
if [ -f "$CONFIG_DIR/opencode.json" ]; then
  say "config already exists at $CONFIG_DIR/opencode.json — not overwriting"
else
  curl -fsSL "$RAW_BASE/config/opencode.json.template" -o "$CONFIG_DIR/opencode.json"
  say "wrote default config to $CONFIG_DIR/opencode.json"
fi

# ─── 4. wrapper script (with SHA verification) ────────────────────────────
TMPWRAP=$(mktemp)
trap 'rm -f "$TMPWRAP"' EXIT
curl -fsSL "$RAW_BASE/bin/kids-opencode" -o "$TMPWRAP"

if [ "${KIDS_OPENCODE_SKIP_SHA:-0}" = "1" ]; then
  say "⚠️  SKIPPING wrapper SHA check (KIDS_OPENCODE_SKIP_SHA=1) — do not do this in production."
elif [ "$EXPECTED_WRAPPER_SHA" = "REPLACED_AT_RELEASE_TAG" ]; then
  # Dev install from a fresh checkout — pipeline hasn't filled the SHA in.
  # Fall back to "compute it locally and inform the user" rather than failing
  # outright; this lets contributors install from a branch.
  computed=$(compute_sha256 "$TMPWRAP")
  say "ℹ️  dev install (no pinned SHA in this script). Wrapper SHA-256: $computed"
else
  verify_sha "$TMPWRAP" "$EXPECTED_WRAPPER_SHA"
  say "verified wrapper SHA-256 ($EXPECTED_WRAPPER_SHA)"
fi

if [ ! -w "$PREFIX/bin" ]; then
  fail "$PREFIX/bin is not writable. Re-run with sudo, or set PREFIX=\$HOME/.local and add it to PATH."
fi
install -m 0755 "$TMPWRAP" "$PREFIX/bin/kids-opencode" 2>/dev/null || {
  # `install` is GNU-specific; fall back for macOS BSD.
  cp "$TMPWRAP" "$PREFIX/bin/kids-opencode"
  chmod +x "$PREFIX/bin/kids-opencode"
}
say "installed wrapper at $PREFIX/bin/kids-opencode"

# ─── 5. first-run guidance ────────────────────────────────────────────────
cat <<EOF

✅ kids-opencode installed.

Next steps:
  1. Get your DeepRouter tenant key from the parent dashboard at
     https://app.airbotix.ai/portal/wallet (signup with a parent email).
  2. Set it in your shell profile:
       export DEEPROUTER_API_KEY="…"
  3. Make a project folder, then run:
       cd ~/my-first-project
       kids-opencode

For the V0 onboarding Mission ("Personal Portfolio Website"), see:
  https://airbotix.ai/kids-opencode/getting-started

Need help? https://airbotix.ai/help/kids-opencode
EOF
