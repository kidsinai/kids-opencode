# Contributing to Kids OpenCode

Thanks for your interest. Kids OpenCode is a kid-safe AI coding mentor; the bar for contributions is **kid safety first, then code quality, then features**.

## Before you start

If you are reporting a security issue (any way to produce harmful output, bypass safeguards, escape the project folder, etc.), please follow [`SECURITY.md`](./SECURITY.md) and email security@airbotix.ai **rather than opening a public issue**.

For everything else — bugs, feature requests, Course Pack contributions, documentation fixes — open a GitHub issue first to discuss. We want to make sure your effort lands in the right place before you write code.

## Local development

You will need:

- **Bun** ≥ 1.1 — https://bun.sh
- **Node.js** ≥ 20 (for some tooling)
- Access to a real LLM provider key for end-to-end testing (BYOK works for development)
- The companion repo at `kidsinai/opencode-kernel` if you want to run a local opencode server

```bash
git clone https://github.com/kidsinai/kids-opencode.git
cd kids-opencode
bun install
bun run typecheck
bun run test
bun run smoke   # syntax checks shell scripts
```

The plugin is at `packages/kids-plugin/`. You can write hooks against the `@opencode-ai/plugin` interface.

## Branch and PR conventions

- Branches: `feat/<slug>`, `fix/<slug>`, `docs/<slug>`, `compliance/<slug>`
- Commit messages: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `security:`)
- PRs against `main`
- CI must pass before merge (`.github/workflows/ci.yml`)
- One reviewer approval for non-trivial changes

## Areas of contribution

### Course Pack content (highest value)

A Course Pack is a directory in `course-packs/<pack-id>/` containing:

- `pack.yml` — metadata + system-prompt overlay + mission list
- `mission-N/brief.md` — what the kid reads
- `mission-N/acceptance.yml` — automated completion checks
- `scaffolds/<skill-id>.html.template` *(optional)* — first-5-min file template with `${VAR}` placeholders

> **Note**: production packs (Game, Website) live in the **private** `kidsinai/kids-flows`
> submodule for curriculum-IP reasons. The submodule mounts at `course-packs/private/` and is
> not visible after a fresh clone. New pack contributions are welcome via this public
> `course-packs/<pack-id>/` path — please open an issue first so we can scope it together.

We especially welcome:

- Packs aligned to specific curricula (AU Digital Technologies F-10, UK National Curriculum Computing, etc.)
- Packs in non-English languages (system prompt + briefs translated; canonical English source kept)
- Packs covering specific themes (game, data viz, robotics — though robotics depends on Bridge in V1+)

Each pack must:

- Be age-appropriate for the declared `target_age_band`
- Have a clear estimated Stars budget per mission
- Have automated acceptance criteria
- Pass `kids-opencode check <mission-id>` against a sample completed project

Submit packs by PR to `course-packs/<pack-id>/`. The team will review for educational value and kid-safety.

### Plugin hooks

Plugin changes affect the kid-safety surface. PRs touching `packages/kids-plugin/src/` must:

- Include unit tests for the new behaviour
- Pass the red-team test set (`docs/red-team.md`)
- Not relax existing safeguards without an explicit reason documented in the PR

The plugin's job is to **add safety**, not to add capability. Capability additions usually belong in the upstream `opencode` project (and we then pick them up via the SDK version bump).

### Documentation

Docs improvements are always welcome. Particularly valuable:

- Translations of `docs/compliance/*` to support kid-AI operators in other jurisdictions
- Worked examples for parents and teachers
- Diagrams clarifying the architecture (we don't have many yet)

### Compliance documents

Per-jurisdiction compliance audits live in `docs/compliance/<iso2>.md`. To add a new country:

1. Copy `docs/compliance/_template.md` to `docs/compliance/<iso2>.md`
2. Fill in based on the local statutes, regulators, and primary-source URLs
3. Open a PR with a clear "this is engineering-side only, requires qualified local lawyer review before use" caveat
4. Tag a maintainer

We will not merge compliance docs without primary-source citations. Generic-sounding legal advice is not useful.

## Code style

- TypeScript with `strict` enabled
- Filenames `kebab-case.ts`
- Exported types `PascalCase`
- Constants `SCREAMING_SNAKE_CASE`
- Tests live next to source as `*.test.ts` or in `test/` subdir

No specific style is enforced beyond what `tsc --noEmit` and (eventually) ESLint catch. We prefer clear over clever.

## What we won't accept

- Features that weaken the kid-safety layer (tool whitelist, system prompt, audit emit) without strong justification
- Course Packs targeting under-12 in this product (the V0 audience is 12+; younger-age products live in `Airbotix-AI/creative-web`)
- Anything that tracks kids for advertising or profile-building purposes — ever
- Features that require a server-side dependency we don't currently operate (DeepRouter + platform-backend are the only acceptable cloud dependencies)

## Code of conduct

This is an open-distribution kids product. Be excellent to each other in issues, PRs, and reviews. Discrimination, harassment, or trolling will result in immediate ban.

If you experience or witness conduct that violates this principle, email conduct@airbotix.ai.

## License

By contributing you agree your contribution is licensed under the MIT License (same as the rest of the repository). You retain authorship credit in the git history.

## Questions

- Architecture / direction → open a GitHub Discussion
- Security → security@airbotix.ai
- Conduct → conduct@airbotix.ai
- Compliance → privacy@airbotix.ai (we share these queries with our lawyer)
- Everything else → open a GitHub issue
