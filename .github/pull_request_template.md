## What

<!-- One paragraph: what does this PR change? -->

## Why

<!-- One paragraph: why is this change needed? Link to any relevant issue. -->

## Kid-safety impact

<!-- ⭐ This section is mandatory ⭐ -->

- [ ] This PR does **not** weaken any kid-safety guarantee (tool whitelist, system prompt, webfetch allowlist, audit emit, default-private).
- [ ] If it modifies safety code, I have updated `docs/red-team.md` to cover the new behaviour AND added a test in `packages/kids-plugin/test/`.
- [ ] If it adds a new tool / hook / public capability, I have documented the V0 vs V1+ scope in the relevant doc.

## Compliance impact

- [ ] No new personal information collected
- [ ] No change to data-residency posture (still AWS Sydney for AU data)
- [ ] No new third-party providers introduced without a corresponding update to `docs/compliance/`
- [ ] If this changes how parental consent is obtained / what it covers, I have updated `Airbotix-AI/airbotix/docs/legal/parental-consent.md`

## Checklist

- [ ] `bun run typecheck` passes locally
- [ ] `bun run test` passes locally (or new tests are included with this PR)
- [ ] `bun run smoke` passes (`sh -n` clean on shell scripts; plugin loads)
- [ ] `CHANGELOG.md` updated under `[Unreleased]`
- [ ] If this is a user-visible change, the README is updated
- [ ] Conventional Commit prefix in the PR title (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `security:`)

## How was this tested

<!-- "I ran the new test", "I dogfooded locally with a real DEEPROUTER_API_KEY", "manual red-team run", etc. -->

## Anything else reviewers should know

<!-- Concerns, open questions, follow-ups you'd accept as separate PRs. -->
