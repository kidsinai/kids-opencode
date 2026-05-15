# Local development quickstart

> For engineers (and curious contributors) who want to run, test, and modify Kids OpenCode locally before / instead of installing via the `airbotix.ai/install/kids` curl pipe.

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| **Bun** | ≥ 1.1 | Runtime + test runner + package manager |
| **Node.js** | ≥ 20 | Some tooling (TypeScript, npm publish flow) |
| **Git** | recent | Cloning + checking out branches |
| **shasum** or **sha256sum** | system | Installer SHA-256 verification |
| **shellcheck** | optional | Local pre-flight for `install.sh` and `bin/kids-opencode` |
| **An LLM provider key** | recommended | Anthropic or OpenAI; required for end-to-end agent runs |

Install Bun if not already:
```bash
curl -fsSL https://bun.sh/install | bash
```

## Clone + install

```bash
git clone https://github.com/kidsinai/kids-opencode.git
cd kids-opencode
bun install
```

You should see ~60 packages installed in seconds. If you also want the upstream opencode kernel for side-by-side debugging:

```bash
cd ..
git clone https://github.com/kidsinai/opencode-kernel.git
cd opencode-kernel
bun install   # ~4700 packages, ~90 seconds
```

## The 30-second smoke test

After `bun install`, verify everything is wired:

```bash
bun run smoke       # sh -n on shell scripts + typecheck across workspace
bun run test        # 36 tests in packages/kids-plugin
```

Both should exit 0. If anything fails, file an issue or check your Bun version.

## Run the plugin's unit tests

```bash
cd packages/kids-plugin
bun test
```

Test files:

- `test/system-prompt.test.ts` — kid-safe system prompt invariants
- `test/plugin.test.ts` — tool whitelist, webfetch allowlist, Stars cost
- `test/course-pack.test.ts` — pack.yml loader + overlay builder
- `test/acceptance.test.ts` — end-to-end Mission completion verification

## Run the acceptance runner against a sample project

```bash
mkdir -p /tmp/portfolio-demo
cat > /tmp/portfolio-demo/index.html <<'HTML'
<!DOCTYPE html>
<html>
<head><title>Demo</title></head>
<body>
  <h1>Hi I am Sample</h1>
  <p>I am building my first website to learn coding. I am twelve and I really enjoy chess.</p>
</body>
</html>
HTML

cd /tmp/portfolio-demo
bun ~/Documents/sites/kidsinai/kids-opencode/packages/kids-plugin/src/check-runner.ts \
  mission-1 --course portfolio-site
```

Expected output: 5/6 pass, 1 skip (audit_log_check needs platform-backend Phase 5).

## Run the wrapper script directly

The wrapper assumes a config at `~/.config/kids-opencode/opencode.json`. For local dev:

```bash
mkdir -p ~/.config/kids-opencode
cp config/opencode.json.template ~/.config/kids-opencode/opencode.json
```

Edit the config to use your dev provider (Anthropic / OpenAI / DeepRouter staging):

```jsonc
{
  "provider": {
    "anthropic": {
      "type": "anthropic",
      "apiKey": "{env:ANTHROPIC_API_KEY}"
    }
  },
  "model": "anthropic/claude-3-5-sonnet-latest",
  "agent": { "tools": ["read", "write", "edit", "glob", "grep", "webfetch"] },
  "permission": { "default": "ask" }
}
```

Then:

```bash
export ANTHROPIC_API_KEY="sk-ant-…"
mkdir -p /tmp/portfolio-demo && cd /tmp/portfolio-demo
~/Documents/sites/kidsinai/kids-opencode/bin/kids-opencode --course portfolio-site --mission mission-1
```

You'll see the AI-disclosure banner, then drop into an opencode session that prepends the kid-safe system prompt + portfolio-site overlay.

## Run with the local opencode-kernel (full source-level debugging)

If you have `opencode-kernel` cloned, you can point the wrapper at the kernel's dev build:

```bash
# Terminal A: build + serve opencode from local kernel
cd ~/Documents/sites/kidsinai/opencode-kernel
bun run dev serve --port=4096

# Terminal B: use kids-opencode against the local server
cd /tmp/portfolio-demo
OPENCODE_BASE_URL=http://localhost:4096 \
  ~/Documents/sites/kidsinai/kids-opencode/bin/kids-opencode
```

## Modify the plugin

The plugin lives at `packages/kids-plugin/`. Source:

- `src/index.ts` — entry; registers hooks
- `src/system-prompt.ts` — kid-safe prompt template
- `src/course-pack.ts` — pack.yml loader + overlay builder
- `src/acceptance.ts` — pure check evaluators
- `src/check-runner.ts` — CLI entry for `kids-opencode check`

After any change:
```bash
cd packages/kids-plugin
bun run typecheck && bun test
```

## Modify the Course Pack content

Course Packs live at `packages/kids-plugin/course-packs/<pack-id>/`. To edit the portfolio site pack:

1. Edit `packages/kids-plugin/course-packs/portfolio-site/pack.yml` for metadata + system prompt overlay
2. Edit `mission-N/brief.md` for what the kid reads
3. Edit `mission-N/acceptance.yml` for completion rules
4. Run `bun test test/acceptance.test.ts` to validate your YAML

Adding a new pack: copy `portfolio-site/` to `<your-pack-id>/`, edit, then add a test row in `test/acceptance.test.ts`.

## Run the installer locally (against a fresh shell)

```bash
# In a clean throwaway VM or container:
sh install.sh
```

In dev mode (no SHA pin), the installer prints the wrapper SHA-256 and proceeds. You can override:

```bash
KIDS_OPENCODE_SKIP_SHA=1 sh install.sh         # loud warning, skip verify
KIDS_OPENCODE_EXPECTED_SHA="abc123…" sh install.sh   # set a specific expected SHA
```

## Common dev tasks

| What | Command |
|---|---|
| Run all tests | `bun --filter '*' test` (from root) |
| Typecheck only | `bun run typecheck` |
| Add a runtime dep to the plugin | `bun add <pkg> --cwd packages/kids-plugin` |
| Bump the plugin version | edit `packages/kids-plugin/package.json` → tag the repo |
| Read recent CI failures | `gh run list --workflow=ci.yml` |
| Test a Course Pack acceptance YAML | `bun packages/kids-plugin/src/check-runner.ts <mission> --course <pack>` |
| Verify the wrapper's SHA hasn't changed | `shasum -a 256 bin/kids-opencode` |

## Releasing (Lightman or maintainer)

Releases are tag-driven. To cut `v0.0.2`:

1. Bump `packages/kids-plugin/package.json` `version` to `0.0.2`
2. Update `CHANGELOG.md` — move `[Unreleased]` items under a `[0.0.2]` heading with today's date
3. Commit: `chore(release): v0.0.2`
4. Tag: `git tag v0.0.2 && git push --tags`
5. The two release workflows fire:
   - `publish-plugin.yml` → npm publish (requires `NPM_TOKEN` secret)
   - `publish-installer.yml` → S3 + CloudFront (requires AWS OIDC setup)

The kernel repo (`kidsinai/opencode-kernel`) has its own release cadence — it tracks upstream, not us.

## Where things live (cross-repo map)

| Concern | Repo | Path |
|---|---|---|
| Kid CLI source | this repo | `bin/`, `install.sh`, `packages/kids-plugin/` |
| Course Pack content | this repo | `packages/kids-plugin/course-packs/` |
| Compliance audit | this repo | `docs/compliance/` |
| Safety assessment | this repo | `docs/safety-assessment.md` |
| Red-team test set | this repo | `docs/red-team.md` |
| NDB runbook | this repo | `docs/runbook/ndb-incident.md` |
| Upstream tracker | `kidsinai/opencode-kernel` | clean fork of anomalyco/opencode |
| LLM gateway | `deeprouter-ai/deeprouter` | independent product |
| Backend API + family flow | `Airbotix-AI/platform-backend` | NestJS + Prisma + Neon |
| Parent portal SPA | `Airbotix-AI/airbotix-app` | Vite + React |
| Marketing site + legal pages | `Airbotix-AI/airbotix` | `/install/kids`, `/privacy`, `/terms`, `/compliance` |

## Troubleshooting

- **`bun: command not found`** — install Bun (`curl -fsSL https://bun.sh/install | bash`); restart your shell.
- **TypeScript errors in `node_modules`** — usually a Bun cache thing; try `rm -rf node_modules bun.lock && bun install`.
- **Plugin tests fail with "Cannot find module"** — make sure you ran `bun install` from the repo root (not from `packages/kids-plugin/`).
- **`kids-opencode` says config not found** — copy `config/opencode.json.template` to `~/.config/kids-opencode/opencode.json` (see "Run the wrapper script directly" above).
- **AI-disclosure banner shows up in CI logs and you don't want it** — set `KIDS_OPENCODE_NO_BANNER=1`.
- **Acceptance runner reports `invalid regex`** — your YAML uses a non-JS regex feature. Use `(?i)` prefix for case-insensitive (handled by our compiler). For other flags, see `compileRegex()` in `packages/kids-plugin/src/acceptance.ts`.

## Questions

- Architecture / direction → open a GitHub Discussion
- Security → security@airbotix.ai (see `SECURITY.md`)
- Compliance → privacy@airbotix.ai
- Course Pack content → curriculum@airbotix.ai
- Anything else → file an issue
