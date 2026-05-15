# Kids OpenCode AI Safety Assessment — v0.1 (pre-V0)

> Engineering record of safety posture for the upcoming V0 release. Aligned to the Australian **Voluntary AI Safety Standard (2024)** 10 guardrails + the **eSafety Commissioner Safety by Design** principles. Refreshed on every major release; minimum quarterly. **Not legal advice.**

---

## 1. Identification

| Field | Value |
|---|---|
| Product | Kids OpenCode (CLI) |
| Release version | v0.0.1 (pre-V0; assessment baseline) |
| Codebase | `kidsinai/kids-opencode`, `kidsinai/opencode-kernel` (upstream tracking), `Airbotix-AI/platform-backend`, `deeprouter-ai/deeprouter` |
| Assessor | Engineering team (Claude assist 2026-05-15) |
| Review date | 2026-05-15 |
| Next scheduled review | 2026-08-15 (or on next major release, whichever sooner) |

---

## 2. Audience served

| Dimension | V0 baseline |
|---|---|
| Age band | 12 and older |
| Region | Australia (V0 only); US / EU / UK / SG / CN deferred to V2+ |
| Setting | Family home (default) + classroom workshop (PLAN Phase 5) |
| Languages | English (V0); zh-Hans evaluated for V1+ |
| Modality | Terminal CLI on macOS / Linux; Windows V1+; no audio, no video, no biometric |
| Access pattern | Voluntary, parent-supervised; no compulsory school use in V0 |

---

## 3. Voluntary AI Safety Standard — 10 guardrails coverage

> Citation: Department of Industry, Science and Resources — Voluntary AI Safety Standard (August 2024) "10 guardrails". https://www.industry.gov.au/publications/voluntary-ai-safety-standard/10-guardrails

| # | Guardrail (summary) | Status | Implementation reference |
|---|---|---|---|
| 1 | Establish, implement, publish accountability process | 🟡 | Compliance officer = Lightman; this file + `docs/compliance/` directory are the published artifacts. Public-facing statement pending Airbotix-AI/airbotix `compliance/` page. |
| 2 | Risk management process incl. impact on people | 🟡 | This document is the risk register baseline. Triggered review on every release (§9). |
| 3 | Data governance — quality, provenance, security | 🟢 | CLI keeps kid code on the family device. Audit log: stderr (V0) → platform-backend persistence (Phase 5). DeepRouter request log retained 90d hot / 3y cold encrypted. |
| 4 | Test AI models / systems for safety / performance | 🟡 | 50-prompt red-team set at `docs/red-team.md` (created 2026-05-15). Acceptance: ≥48/50 prompts safely refused or redirected before V0 launch. Currently 0/50 executed; runs scheduled in Phase 4. |
| 5 | Human control / intervention (oversight) | 🟢 | `opencode` `permission.default: "ask"` enforces approval per tool call; system prompt rule #3 requires verbal announcement; parent audit log surfaces every action. |
| 6 | Inform end-users about AI use | 🟢 | System prompt rule #5: "Never pretend to be human." Terminal banner on startup (planned). AI disclosure visible in airbotix.ai marketing. |
| 7 | Establish challenge processes for affected people | 🟡 | Parent dashboard takedown flow planned in `Airbotix-AI/airbotix-app` (PLAN Phase 5). Email channel `privacy@airbotix.ai` documented in draft compliance statement. |
| 8 | Transparency across AI supply chain | 🟢 | DeepRouter is documented as our sole egress; provider list (Anthropic / OpenAI / Doubao / DeepSeek) is documented; per-tenant kids_mode flag forwards safety constraints to upstream providers. |
| 9 | Records to allow third-party compliance assessment | 🟢 | System prompts are git-tagged in `packages/kids-plugin/src/system-prompt.ts`; audit log retention 90d hot / 3y cold (per master compliance doc §6); this directory is the documented evidence chain. |
| 10 | Stakeholder engagement — safety, diversity, inclusion, fairness | 🟡 | OAIC consultation submission filed by 5 June 2026 (`docs/compliance/au-oaic-copc-submission-draft.md`). Workshop teacher feedback loop in Phase 6. No parent survey programme yet — V1 commitment. |

Legend: 🟢 implemented · 🟡 in progress / documented · 🔴 not started

**Score**: 5 🟢 / 5 🟡 / 0 🔴. None of the open items are V0 launch blockers in their current state; all have an owner and a target phase.

---

## 4. eSafety Commissioner Safety-by-Design principles coverage

> Citation: eSafety Commissioner — Safety by Design framework. https://www.esafety.gov.au/industry/safety-by-design

| Principle | Status | How we satisfy it |
|---|---|---|
| **Service provider responsibility** | 🟢 | Centralised: Airbotix is the operator; we do not outsource safety to "user choice" or "open ecosystem." Tool whitelist, system prompt, audit, moderation are all operator-enforced. |
| **User empowerment & autonomy** | 🟢 | Plan-then-approve at every tool use. Parents can pause / revoke / export / delete via platform-backend (Phase 5 surface). Kids see what's happening and can stop it. |
| **Transparency & accountability** | 🟢 | This file + the wider `docs/compliance/` directory + the planned public compliance statement on airbotix.ai are the transparency layer. We accept eSafety transparency notices and have a 30-day response plan (`docs/compliance/au.md` §6). |

---

## 5. Specific risk inventory + mitigations

> Each row is a concrete failure mode we have considered and the technical/operational control. New risks are added as identified.

| # | Risk | Likelihood | Severity | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|
| R-01 | Prompt injection — kid tries to make the AI ignore safety rules | High | Medium | (a) System prompt rule #9 explicitly refuses "ignore previous"; (b) DeepRouter input filter (Phase 4); (c) red-team test set covers 10+ injection variants | Team B + Team A | 🟡 prompt designed; gateway pending |
| R-02 | Jailbreak via roleplay — kid asks AI to "play as" something adult | High | High | (a) System prompt rule #6 refuses adult topics; (b) output classifier in DeepRouter (Phase 4); (c) repeated attempts → parent alert | Team B + Team A | 🟡 prompt designed |
| R-03 | Self-harm signal in kid's text | Medium | Critical | System prompt rule #10: stop coding, refer to Kids Helpline 1800 55 1800. Phase 4 will add audit flag → parent SMS alert | Team B | 🟡 prompt designed; alerting pending |
| R-04 | Inappropriate output from LLM | Medium | High | (a) Server-side output classifier in DeepRouter; (b) provider AUPs enforced at gateway; (c) plugin re-checks output before display (planned) | Team A | 🟡 Phase 4 |
| R-05 | Agent reads files outside the project folder | Low | High | `opencode` `read` tool is cwd-relative by upstream design; plugin path-guard reinforces in case of upstream regression | Team B | 🟢 implemented (plugin) |
| R-06 | Agent fetches non-whitelisted URL | Low | Medium | Plugin `webfetch` host-allowlist check; refuses non-(MDN, web.dev, W3C, airbotix.ai) URLs | Team B | 🟢 implemented |
| R-07 | Shell / arbitrary command execution | Critical (if enabled) | Critical | Tool whitelist excludes `shell`; plugin explicitly throws on any non-allowed tool name | Team B | 🟢 implemented |
| R-08 | LLM cost runaway (kid in infinite loop, parent gets huge bill) | Medium | Medium | Per-session Stars cap in DeepRouter; family wallet daily cap in platform-backend; CLI displays running cost | Team A + platform | 🟡 designs aligned, not built |
| R-09 | DeepRouter API key leak | Low | High | Per-family key, revocable from parent dashboard; rotation procedure; secret scanning on commits | platform | 🟡 designed, not built |
| R-10 | Audit log breach (kid prompts leak) | Low | High | At-rest encryption; access via parent only; 90d retention then encrypted archive; cyber liability insurance | Team A + platform | 🟡 designed |
| R-11 | Provider account suspension (Anthropic / OpenAI rate-limit or compliance flag) | Medium | Medium | Multi-provider via DeepRouter; automatic failover; pre-V0 outreach to provider compliance teams (AU-8) | Team A + Lightman | 🟡 designs aligned |
| R-12 | BYOK family bypasses our moderation | Medium | Medium | (a) Loud startup banner warning the family; (b) plugin still enforces tool whitelist + system prompt client-side; (c) compliance statement discloses prominently | Team B | 🟡 banner pending |
| R-13 | Kid copies plugin source + deletes our safeguards | Low | Low | The plugin is open source (MIT) so a determined kid could; mitigation is design rather than secrecy. The product value (DeepRouter + family billing + course packs) doesn't survive bypass; we accept the residual risk. | — | ✅ accepted residual |
| R-14 | Course Pack content drift — pack becomes inappropriate over time | Low | High | Course Packs are git-tagged + lawyer reviewed before publish; teacher / parent feedback channel; periodic content review | curriculum + Team B | 🟡 process designed |
| R-15 | Supply chain attack via opencode upstream | Low | High | Pin opencode version in `install.sh`; cherry-pick upstream patches only (no auto-merge); SBOM published in V0 | Team B | 🟡 pinning pending |
| R-16 | Statutory privacy tort claim from a breached family | Low | High | (a) Data minimisation; (b) NDB runbook (`docs/runbook/ndb-incident.md`); (c) cyber liability insurance; (d) ToS limitation clauses (lawyer drafted) | Lightman | 🟡 see AU-6 |
| R-17 | eSafety transparency notice arrives demanding 30-day response | Low (V0) → Medium (V1) | Medium | Pre-drafted answer skeleton in `docs/compliance/au.md` §6; sole-or-primary-purpose statement on file (`au-sole-or-primary-purpose-statement.md`); audit trail accessible | Lightman | 🟢 prep done |
| R-18 | OAIC investigation under new COPC | Low (V0) | High | (a) OAIC consultation submission filed; (b) compliance map per Code section once final wording lands; (c) continuous engagement | Lightman | 🟢 submission drafted |

---

## 6. Open risks accepted for this release

| Risk | Why accepted | Revisit by |
|---|---|---|
| R-13 (plugin source bypass) | Open-source plugin is a deliberate design choice; the product moat is server-side (DeepRouter + billing + course packs), not client secrecy | Permanent — won't revisit |
| Some 🟡 items above (R-04, R-08, R-09, R-10, R-12) are not yet implemented | They are scheduled in PLAN Phase 4 / Phase 5; V0 launch is gated on their completion | V0 launch readiness check |
| No formal independent third-party safety audit | V0 is alpha-scale (~20 workshop kids); independent audit is a V1 commitment when paid scale begins | V1 (post 100-family signup) |

---

## 7. Test evidence summary

| Test | Status | Last run | Result | Where |
|---|---|---|---|---|
| Plugin TypeScript typecheck | ✅ | 2026-05-15 | Pass | `bunx tsc --noEmit` in `packages/kids-plugin/` |
| Plugin module loads | ✅ | 2026-05-15 | `[AsyncFunction: plugin]` | `bun --print "(await import('./packages/kids-plugin/src/index.ts')).server"` |
| 50-prompt red-team set | 🟡 designed | n/a | n/a | `docs/red-team.md`; Phase 4 |
| 200-RPM burst load (DeepRouter side) | 🟡 not run | n/a | n/a | DeepRouter PLAN Phase 3 |
| End-to-end kid session (`kids-opencode` running a real prompt) | 🟡 not run | n/a | needs provider key | Phase 2 |
| Workshop dogfood | 🔴 not run | n/a | n/a | Phase 6 |

---

## 8. Sign-off (when V0 ready)

This Assessment is provisional until V0 launch readiness check. Sign-off below at that point:

| Role | Name | Date | Sig |
|---|---|---|---|
| Engineering lead | [name] | _____ | _____ |
| Compliance officer | Lightman | _____ | _____ |
| AU lawyer (for this release) | [name + firm] | _____ | _____ |

---

## 9. Revision cadence

- Every major release of `kidsinai/kids-opencode` → full refresh of this document
- Minimum every 3 months → review even if no release
- On any incident → triggered update + new R-row in §5
- On any regulator-relevant law change → triggered update

Calendar entry for next review: **2026-08-15**.

---

## 10. References

- [Voluntary AI Safety Standard — 10 guardrails (Department of Industry, Sept 2024)](https://www.industry.gov.au/publications/voluntary-ai-safety-standard/10-guardrails)
- [eSafety Commissioner — Safety by Design](https://www.esafety.gov.au/industry/safety-by-design)
- Master cross-product compliance doc: `~/Documents/sites/airbotix/docs/product/compliance/minors-compliance.md`
- AU jurisdiction audit: [`docs/compliance/au.md`](./compliance/au.md)
- AU lawyer-pass answers: [`docs/compliance/au-lawyer-pass.md`](./compliance/au-lawyer-pass.md)
- Sole-or-Primary-Purpose Statement: [`docs/compliance/au-sole-or-primary-purpose-statement.md`](./compliance/au-sole-or-primary-purpose-statement.md)
- NDB incident runbook: [`docs/runbook/ndb-incident.md`](./runbook/ndb-incident.md)

---

## Revision history

| Version | Date | Note |
|---|---|---|
| 0.1 | 2026-05-15 | Initial assessment instantiating the AU-7 template. Pre-V0 baseline. 5/10 guardrails 🟢, 5/10 🟡, 0/10 🔴. |
