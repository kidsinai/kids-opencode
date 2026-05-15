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
#   4. Symlink `kids-opencode` into /usr/local/bin (or $PREFIX/bin) pointing at
#      the bin/kids-opencode shim that ships with this package.
#
# Designed for macOS + Linux. Windows installer is separate (TODO V1).
set -e

KIDS_VERSION="0.0.1"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/kids-opencode"
PREFIX="${PREFIX:-/usr/local}"
PLUGIN_PACKAGE="@kidsinai/kids-opencode-plugin"
RAW_BASE="https://raw.githubusercontent.com/kidsinai/kids-opencode/main"

say()  { printf "kids-opencode: %s\n" "$*"; }
fail() { printf "kids-opencode: %s\n" "$*" >&2; exit 1; }

say "installing v$KIDS_VERSION"

# -------- 1. opencode upstream --------
if ! command -v opencode >/dev/null 2>&1; then
  say "opencode CLI not found; installing via upstream installer…"
  if ! command -v curl >/dev/null 2>&1; then
    fail "curl is required. Please install curl and re-run."
  fi
  curl -fsSL https://opencode.ai/install | sh
  if ! command -v opencode >/dev/null 2>&1; then
    fail "opencode install completed but the binary is still not on PATH. Open a new shell and re-run."
  fi
fi
say "opencode found at $(command -v opencode)"

# -------- 2. kids-safe plugin --------
say "installing $PLUGIN_PACKAGE via opencode plugin manager…"
opencode plugin install "$PLUGIN_PACKAGE" || fail "could not install plugin $PLUGIN_PACKAGE. See https://airbotix.ai/help/install for help."

# -------- 3. config --------
mkdir -p "$CONFIG_DIR"
if [ -f "$CONFIG_DIR/opencode.json" ]; then
  say "config already exists at $CONFIG_DIR/opencode.json — not overwriting"
else
  curl -fsSL "$RAW_BASE/config/opencode.json.template" -o "$CONFIG_DIR/opencode.json"
  say "wrote default config to $CONFIG_DIR/opencode.json"
fi

# -------- 4. wrapper script --------
if [ ! -w "$PREFIX/bin" ]; then
  fail "$PREFIX/bin is not writable. Re-run with sudo, or set PREFIX=\$HOME/.local and add it to PATH."
fi
curl -fsSL "$RAW_BASE/bin/kids-opencode" -o "$PREFIX/bin/kids-opencode"
chmod +x "$PREFIX/bin/kids-opencode"
say "installed wrapper at $PREFIX/bin/kids-opencode"

# -------- 5. first-run guidance --------
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
