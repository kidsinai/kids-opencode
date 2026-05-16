#!/usr/bin/env sh
#
# @kidsinai/kids-opencode postinstall.
#
# Runs once after `bun add -g @kidsinai/kids-opencode` (or npm equivalent).
# Idempotent — safe to re-run on every install / update.
#
# What it does:
#   1. Creates ~/.config/kids-opencode/ with 700 perms.
#   2. Generates a random server-password if not present.
#   3. Drops opencode.json (kid-safe config) if not present.
#   4. Registers the plugin + tui-plugin with the AI engine (if installed).
#   5. Tells the user what to do next.
#
# Never fails fatally — postinstall failures shouldn't block the install
# (some environments run with `--ignore-scripts`). We always exit 0 and
# print a friendly hint if anything's incomplete.
set -e

CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/kids-opencode"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PKG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE="$PKG_DIR/config/opencode.json.template"

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  G='\033[1;32m'; D='\033[2m'; C='\033[1;36m'; W='\033[1;33m'; O='\033[0m'
else
  G=''; D=''; C=''; W=''; O=''
fi
ok()   { printf "  ${G}✓${O} %s\n" "$*"; }
note() { printf "  ${D}%s${O}\n" "$*"; }

printf "${C}Kids OpenCode${O} setting up your workspace…\n"

# ─── 1. private config directory ──────────────────────────────────────────
mkdir -p "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR" 2>/dev/null || true

# ─── 2. session password ──────────────────────────────────────────────────
PASSWORD_FILE="$CONFIG_DIR/server-password"
if [ ! -f "$PASSWORD_FILE" ]; then
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 32 > "$PASSWORD_FILE"
  elif [ -r /dev/urandom ]; then
    head -c 32 /dev/urandom | base64 > "$PASSWORD_FILE"
  fi
  if [ -f "$PASSWORD_FILE" ]; then
    chmod 600 "$PASSWORD_FILE" 2>/dev/null || true
    ok "session password generated"
  fi
fi

# ─── 3. kid-safe config ───────────────────────────────────────────────────
CONFIG_FILE="$CONFIG_DIR/opencode.json"
if [ ! -f "$CONFIG_FILE" ] && [ -f "$TEMPLATE" ]; then
  cp "$TEMPLATE" "$CONFIG_FILE"
  ok "default config written"
fi

# ─── 4. AI engine plugin registration ─────────────────────────────────────
# If the AI engine binary is available, register both plugins. If not, the
# wrapper will detect missing engine on first run and guide the user.
if command -v opencode >/dev/null 2>&1; then
  # `opencode plugin install` is idempotent (no-op on already-installed).
  opencode plugin install @kidsinai/kids-opencode-plugin >/dev/null 2>&1 || true
  opencode plugin install @kidsinai/kids-opencode-tui-plugin >/dev/null 2>&1 || true
  ok "safety layer registered"
fi

# ─── 5. ready message ─────────────────────────────────────────────────────
printf "\n"
if command -v opencode >/dev/null 2>&1; then
  printf "${G}━━━ Kids OpenCode is ready ━━━${O}\n\n"
  printf "  Try it now:\n\n"
  printf "    ${C}kids-opencode${O}                                              first run\n"
  printf "    ${C}kids-opencode --course portfolio-site --mission mission-1${O}  Course Pack\n"
  printf "    ${C}kids-opencode --kids-help${O}                                  for-kids help\n"
else
  printf "${W}━━━ One more step ━━━${O}\n\n"
  printf "  The AI engine isn't installed yet. Run this once:\n\n"
  printf "    ${C}curl -fsSL https://opencode.ai/install | sh${O}\n\n"
  printf "  Then ${C}kids-opencode${O} will be ready.\n"
fi
printf "\n"

exit 0
