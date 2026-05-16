# @kidsinai/kids-opencode

> A kid-safe AI coding mentor for ages 12+. One-command install.

```bash
# the only line a parent needs
bun add -g @kidsinai/kids-opencode

# then their kid runs
kids-opencode --course portfolio-site --mission mission-1
```

## What's in the box

Installing this package pulls down three siblings as dependencies:

- **[@kidsinai/kids-client](https://npmjs.com/package/@kidsinai/kids-client)** — the Ink-based TUI the kid actually sees
- **[@kidsinai/kids-opencode-plugin](https://npmjs.com/package/@kidsinai/kids-opencode-plugin)** — the server-side safety layer (system prompt, tool whitelist, audit emit)
- **[@kidsinai/kids-opencode-tui-plugin](https://npmjs.com/package/@kidsinai/kids-opencode-tui-plugin)** — kid-warm theme + simplified keymap + Kids Helpline overlay

Plus a `kids-opencode` shell wrapper that ties them together, and a postinstall script that drops a kid-safe default config + generates a session password.

## Requires

- **macOS or Linux** (Windows native is V1)
- **The AI engine** (a small Go binary — install once via `curl -fsSL https://opencode.ai/install | sh`). If missing on first run, `kids-opencode` prints a friendly hint.
- **`bun`** (any recent version). If you installed via `curl -fsSL https://airbotix.ai/install/kids | sh` it was set up for you.

## What kids see

A welcome screen, a Mission progress bar, an AI mentor that asks "may I do this?" before touching any file, an Esc key that always interrupts, a Kids Helpline overlay for crisis terms, and a celebration when they finish a Mission.

What they **don't** see: the underlying agent runtime, the plugin registration, the SSE event stream, or any "opencode" branding. They feel like they're using one tool — Kids OpenCode.

## Subcommands

```
kids-opencode                                     start a coding session
kids-opencode --course <pack>                     start a guided Course Pack
kids-opencode --course <pack> --mission <id>      jump to specific Mission
kids-opencode check <mission>                     validate a Mission's acceptance
kids-opencode register                            parent registration
kids-opencode --update                            update to the latest version
kids-opencode --shutdown                          stop the background AI server
kids-opencode --version                           show version
kids-opencode --kids-help                         kid-friendly help
```

## Architecture (engineering reference)

```
kids-opencode (wrapper, this package)
  └─ exec ─→ kids-client (Ink TUI)
              └─ spawns ─→ opencode serve (AI engine)
                            ├─ loads kids-opencode-plugin (safety layer)
                            └─ loads kids-opencode-tui-plugin (theme)
```

The wrapper's job:
1. PATH bootstrap so the same shell that ran install works immediately
2. Resolve symlinks to find sibling deps (kids-client) in npm install
3. AI-disclosure banner (compliance)
4. Subcommand dispatch
5. Hand off to `kids-client`

## Compliance

- **AU Children's Online Privacy Code** — submission filed (see kids-opencode `docs/compliance/`)
- **OAIC** — consultation submission drafted
- **Safety prompts** — all user-visible AI replies pass through the system prompt + danger-topic filter
- **Audit** — every tool call emits a structured JSON line to stderr (eventual sink: platform-backend `/api/audit`)

## Repository

Source lives at [`kidsinai/kids-opencode`](https://github.com/kidsinai/kids-opencode). PRs and issues there.

## License

MIT.
