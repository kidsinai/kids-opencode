#!/usr/bin/env sh
#
# Kids OpenCode installer.
#
# End-users run exactly this:
#   curl -fsSL https://airbotix.ai/install/kids | sh
#
# V0.0.2 flow — much thinner than V0.0.1:
#   1. Ensure AI engine (upstream opencode CLI) is installed.
#   2. Ensure JavaScript runtime (bun) is installed.
#   3. `bun add -g @kidsinai/kids-opencode` — top-level npm package
#      handles everything else (kids-client + plugin + tui-plugin as
#      dependencies, config + server-password via its postinstall).
#
# That's it. The complexity that used to live here now lives inside the
# npm package's postinstall, which means it also runs when users do
# `bun add -g @kidsinai/kids-opencode` directly (skipping this script).
#
# Set KIDS_VERBOSE=1 to see upstream installer output during debugging.
set -e

KIDS_VERSION="0.0.2"
TOPLEVEL_PACKAGE="@kidsinai/kids-opencode"
INSTALL_LOG="$(mktemp -t kids-opencode-install.XXXXXX 2>/dev/null || mktemp)"

# ─── pretty output ────────────────────────────────────────────────────────
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
silent() {
  if [ "${KIDS_VERBOSE:-0}" = "1" ]; then
    "$@"
  else
    "$@" >> "$INSTALL_LOG" 2>&1
  fi
}

# ─── PATH bootstrap ───────────────────────────────────────────────────────
# Mirror upstream installer bin dirs into this script's PATH so the
# re-check after each install succeeds in the same shell.
add_to_path() {
  case ":$PATH:" in
    *":$1:"*) : ;;
    *) PATH="$1:$PATH"; export PATH ;;
  esac
}
add_to_path "$HOME/.opencode/bin"
add_to_path "$HOME/.bun/bin"
add_to_path "$HOME/.local/bin"

command -v curl >/dev/null 2>&1 || fail "curl is required."

hdr "installer v$KIDS_VERSION"

# ─── 1. AI engine (upstream opencode CLI) ─────────────────────────────────
if command -v opencode >/dev/null 2>&1; then
  ok "AI engine already installed"
else
  hdr "setting up AI engine (about 30 seconds)…"
  silent sh -c 'curl -fsSL https://opencode.ai/install | sh' \
    || fail "AI engine install failed. See log."
  add_to_path "$HOME/.opencode/bin"
  command -v opencode >/dev/null 2>&1 \
    || fail "AI engine installed but not findable on PATH."
  ok "AI engine installed"
fi

# ─── 2. JavaScript runtime (bun) ──────────────────────────────────────────
if command -v bun >/dev/null 2>&1; then
  ok "JavaScript runtime already installed"
else
  hdr "installing JavaScript runtime…"
  silent sh -c 'curl -fsSL https://bun.sh/install | bash' \
    || fail "JavaScript runtime install failed. See log."
  add_to_path "$HOME/.bun/bin"
  command -v bun >/dev/null 2>&1 \
    || fail "JavaScript runtime installed but not findable on PATH."
  ok "JavaScript runtime installed"
fi

# ─── 3. Kids OpenCode itself ──────────────────────────────────────────────
# The npm package bundles wrapper + postinstall (config / server-password /
# plugin registration). Its dependencies pull in kids-client + plugin + tui-plugin.
hdr "installing Kids OpenCode…"
silent bun add -g "$TOPLEVEL_PACKAGE" \
  || fail "Kids OpenCode install failed. See log."
add_to_path "$HOME/.bun/bin"
ok "Kids OpenCode installed"

# ─── 4. shell rc: ensure new shells pick up the bins ──────────────────────
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
      printf 'export PATH="$HOME/.bun/bin:$HOME/.opencode/bin:$PATH"\n'
    } >> "$SHELL_RC"
  fi
fi

# ─── 5. ready ─────────────────────────────────────────────────────────────
# At this point the package's postinstall.sh has already printed the
# ready banner (when it ran inside `bun add -g`). We just confirm.
if command -v kids-opencode >/dev/null 2>&1; then
  rm -f "$INSTALL_LOG" 2>/dev/null || true
  exit 0
fi

# Fallback: kids-opencode binary not findable in this shell — point to fix.
printf "\n"
printf "${C_GREEN}━━━ Kids OpenCode installed ━━━${C_OFF}\n\n"
printf "  One last step — pick whichever is easier:\n\n"
printf "    ${C_CYAN}exec %s${C_OFF}    (reload this shell now)\n" "${SHELL:-zsh}"
printf "    ${C_DIM}or open a new terminal window${C_OFF}\n\n"
printf "  Then type: ${C_CYAN}kids-opencode${C_OFF}\n\n"
rm -f "$INSTALL_LOG" 2>/dev/null || true
