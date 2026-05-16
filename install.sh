#!/usr/bin/env sh
#
# Kids OpenCode installer.
#
# End-users run exactly this:
#   curl -fsSL https://airbotix.ai/install/kids | sh
#
# Design goals (V0):
#   1. ONE invocation, no follow-up commands. No `exec zsh`, no
#      `source ~/.zshrc`. The kid (or their parent) pastes the curl line
#      and is told what to type next.
#   2. ZERO upstream branding visible. The user installs "Kids OpenCode",
#      not "opencode + bun + a plugin". Upstream installer output goes to
#      a log file; we print our own progress.
#   3. IDEMPOTENT. Safe to re-run for self-update without trashing config /
#      server-password / api-key.
#
# Set KIDS_VERBOSE=1 to see upstream output during install (useful for
# debugging install failures, not for end-users).
set -e

KIDS_VERSION="0.0.1"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/kids-opencode"
PREFIX="${PREFIX:-/usr/local}"
PLUGIN_PACKAGE="@kidsinai/kids-opencode-plugin"
CLIENT_PACKAGE="@kidsinai/kids-client"
RAW_BASE="https://raw.githubusercontent.com/kidsinai/kids-opencode/main"
INSTALL_LOG="$(mktemp -t kids-opencode-install.XXXXXX 2>/dev/null || mktemp)"

# SHA-256 pin for the wrapper binary, replaced by the release tag pipeline.
EXPECTED_WRAPPER_SHA="REPLACED_AT_RELEASE_TAG"
if [ -n "${KIDS_OPENCODE_EXPECTED_SHA:-}" ]; then
  EXPECTED_WRAPPER_SHA="$KIDS_OPENCODE_EXPECTED_SHA"
fi

# ─── pretty output ────────────────────────────────────────────────────────
# Colours: cyan headers, green ticks, red errors. Disabled if NO_COLOR set
# or stdout isn't a tty (pipe to `tee` etc.).
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  C_CYAN='\033[1;36m'; C_GREEN='\033[1;32m'; C_RED='\033[1;31m'; C_DIM='\033[2m'; C_OFF='\033[0m'
else
  C_CYAN=''; C_GREEN=''; C_RED=''; C_DIM=''; C_OFF=''
fi
hdr()  { printf "${C_CYAN}Kids OpenCode${C_OFF} %s\n" "$*"; }
ok()   { printf "  ${C_GREEN}✓${C_OFF} %s\n" "$*"; }
note() { printf "  ${C_DIM}%s${C_OFF}\n" "$*"; }
fail() {
  printf "${C_RED}Kids OpenCode${C_OFF} install failed: %s\n" "$*" >&2
  printf "  ${C_DIM}details: %s${C_OFF}\n" "$INSTALL_LOG" >&2
  exit 1
}

# Run something quietly. KIDS_VERBOSE=1 reveals upstream output.
silent() {
  if [ "${KIDS_VERBOSE:-0}" = "1" ]; then
    "$@"
  else
    "$@" >> "$INSTALL_LOG" 2>&1
  fi
}

# ─── PATH helpers ─────────────────────────────────────────────────────────
# Upstream installers (opencode, bun) drop binaries into ~/.opencode/bin
# and ~/.bun/bin and modify the user's shell rc — but only NEW shells
# pick that up. We mirror those PATH entries into the current install run
# so steps 3-4 below can find what we just installed.
add_to_path() {
  case ":$PATH:" in
    *":$1:"*) : ;;
    *) PATH="$1:$PATH"; export PATH ;;
  esac
}
add_to_path "$HOME/.opencode/bin"
add_to_path "$HOME/.bun/bin"
add_to_path "$HOME/.local/bin"
add_to_path "$PREFIX/bin"

# ─── small utilities ──────────────────────────────────────────────────────
require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "$1 is required but not available."
}
compute_sha256() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    fail "no integrity checker (shasum/sha256sum) on this system."
  fi
}
verify_sha() {
  actual=$(compute_sha256 "$1")
  if [ "$actual" != "$2" ]; then
    fail "integrity check failed (expected $2, got $actual)."
  fi
}

require_cmd curl

hdr "installer v$KIDS_VERSION"

# ─── 1. AI engine ─────────────────────────────────────────────────────────
# This is upstream opencode under the hood; the kid never sees that name.
if command -v opencode >/dev/null 2>&1; then
  ok "AI engine already installed"
else
  hdr "setting up AI engine (about 30 seconds)…"
  if silent sh -c 'curl -fsSL https://opencode.ai/install | sh'; then
    add_to_path "$HOME/.opencode/bin"
    if command -v opencode >/dev/null 2>&1; then
      ok "AI engine installed"
    else
      fail "AI engine installed but not findable on PATH. See log."
    fi
  else
    fail "AI engine install failed. See log."
  fi
fi

# ─── 2. JavaScript runtime ────────────────────────────────────────────────
# Required by the kid-friendly TUI (kids-client) and the in-TUI mission
# acceptance runner. Upstream is bun.sh.
if command -v bun >/dev/null 2>&1; then
  ok "JavaScript runtime already installed"
else
  hdr "installing JavaScript runtime…"
  if silent sh -c 'curl -fsSL https://bun.sh/install | bash'; then
    add_to_path "$HOME/.bun/bin"
    if command -v bun >/dev/null 2>&1; then
      ok "JavaScript runtime installed"
    else
      fail "JavaScript runtime installed but not findable on PATH. See log."
    fi
  else
    fail "JavaScript runtime install failed. See log."
  fi
fi

# ─── 3. safety layer ──────────────────────────────────────────────────────
hdr "installing safety layer (system prompt + tool whitelist)…"
silent opencode plugin install "$PLUGIN_PACKAGE" \
  || fail "could not install safety layer."
ok "safety layer installed"

# ─── 4. kid-friendly interface ────────────────────────────────────────────
hdr "installing kid-friendly interface…"
silent bun add -g "$CLIENT_PACKAGE" \
  || fail "could not install kid-friendly interface."
add_to_path "$HOME/.bun/bin"
if ! command -v kids-client >/dev/null 2>&1; then
  fail "kid-friendly interface installed but not findable. See log."
fi
ok "kid-friendly interface installed"

# ─── 5. private config directory ──────────────────────────────────────────
mkdir -p "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR"

PASSWORD_FILE="$CONFIG_DIR/server-password"
if [ ! -f "$PASSWORD_FILE" ]; then
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 32 > "$PASSWORD_FILE"
  elif [ -r /dev/urandom ]; then
    head -c 32 /dev/urandom | base64 > "$PASSWORD_FILE"
  else
    fail "cannot generate session password."
  fi
  chmod 600 "$PASSWORD_FILE"
  ok "session password generated"
fi

if [ ! -f "$CONFIG_DIR/opencode.json" ]; then
  if silent curl -fsSL "$RAW_BASE/config/opencode.json.template" -o "$CONFIG_DIR/opencode.json"; then
    ok "default config written"
  else
    fail "could not download default config."
  fi
fi

# ─── 6. kids-opencode command (the only one the user types) ───────────────
TMPWRAP=$(mktemp)
trap 'rm -f "$TMPWRAP"' EXIT
silent curl -fsSL "$RAW_BASE/bin/kids-opencode" -o "$TMPWRAP" \
  || fail "could not download kids-opencode command."

if [ "${KIDS_OPENCODE_SKIP_SHA:-0}" = "1" ]; then
  note "skipping integrity check (dev override)"
elif [ "$EXPECTED_WRAPPER_SHA" = "REPLACED_AT_RELEASE_TAG" ]; then
  computed=$(compute_sha256 "$TMPWRAP")
  note "dev install — wrapper SHA-256 $computed (no pin yet)"
else
  verify_sha "$TMPWRAP" "$EXPECTED_WRAPPER_SHA"
fi

if [ ! -w "$PREFIX/bin" ]; then
  fail "$PREFIX/bin is not writable. Re-run with sudo, or set PREFIX=\$HOME/.local before piping."
fi
install -m 0755 "$TMPWRAP" "$PREFIX/bin/kids-opencode" 2>/dev/null || {
  cp "$TMPWRAP" "$PREFIX/bin/kids-opencode"
  chmod +x "$PREFIX/bin/kids-opencode"
}
ok "kids-opencode command ready"

# ─── 7. shell rc: ensure new shells pick up the new bins ──────────────────
# Append a single guarded line to the user's shell rc so future shells
# work without us asking them to `exec zsh`. Idempotent: we look for the
# guard tag and skip if present.
SHELL_RC=""
case "${SHELL:-}" in
  */zsh)  SHELL_RC="$HOME/.zshrc" ;;
  */bash) SHELL_RC="$HOME/.bashrc" ;;
esac
if [ -n "$SHELL_RC" ]; then
  GUARD="# kids-opencode-path"
  if [ ! -f "$SHELL_RC" ] || ! grep -qF "$GUARD" "$SHELL_RC" 2>/dev/null; then
    {
      printf "\n%s\n" "$GUARD"
      printf 'export PATH="$HOME/.bun/bin:$HOME/.opencode/bin:%s/bin:$PATH"\n' "$PREFIX"
    } >> "$SHELL_RC"
  fi
fi

# ─── 8. ready ─────────────────────────────────────────────────────────────
NEED_RESHELL=0
if ! command -v kids-opencode >/dev/null 2>&1; then
  NEED_RESHELL=1
fi

printf "\n"
printf "${C_GREEN}━━━ Kids OpenCode is ready ━━━${C_OFF}\n\n"
if [ "$NEED_RESHELL" = "1" ]; then
  printf "  ${C_DIM}One last step — pick whichever is easier:${C_OFF}\n\n"
  printf "    ${C_CYAN}exec %s${C_OFF}    (reload this shell now)\n" "${SHELL:-zsh}"
  printf "    ${C_DIM}or open a new terminal window${C_OFF}\n\n"
  printf "  ${C_DIM}then type:${C_OFF}\n\n"
else
  printf "  Try it now:\n\n"
fi
printf "    ${C_CYAN}kids-opencode${C_OFF}                                        first run\n"
printf "    ${C_CYAN}kids-opencode --course portfolio-site --mission mission-1${C_OFF}  Course Pack\n"
printf "    ${C_CYAN}kids-opencode --kids-help${C_OFF}                              for-kids help\n"
printf "\n"
printf "  Need help? https://airbotix.ai/help/kids-opencode\n\n"

# Clean up install log if we made it this far — the user doesn't need it.
rm -f "$INSTALL_LOG" 2>/dev/null || true
