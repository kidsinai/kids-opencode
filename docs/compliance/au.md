# Compliance — Australia (`au`)

> Audit / engineering reference for launching **Kids OpenCode** in Australia (V0 primary market). Not legal advice. **Mandatory qualified-AU-lawyer review before V0 launch** (master doc item L1 still pending).

**Snapshot date**: 2026-05-15 (CLI-first revision)
**Last lawyer review**: ❌ pending (master doc item L1)
**Status**: 🟡 engineering audit only — facts compiled from public sources; conclusions must be lawyer-verified before relying on any "we are exempt / we comply" claim externally

---

## 0. CLI distribution context (revised 2026-05-15)

V0 is a **command-line tool installed on the family's own machine** (`kids-opencode` via `curl ... | sh`). Kid code never reaches Airbotix infrastructure. Only the LLM round-trips reach our servers — and only via DeepRouter, which sees prompts + completions, not project files.

**What this changes vs. a hosted-web model**:
- ✅ Kid project files stay on the family's device → much smaller data-residency surface for Airbotix (we don't host their `index.html`)
- ✅ No cookies / localStorage / browser fingerprints collected by us when the kid is coding
- ✅ Webfetch host whitelisting is enforced client-side by the plugin (defence-in-depth even before DeepRouter)
- ⚠️ Audit log of tool use still flows to `Airbotix-AI/platform-backend` for managed-mode families (deferred from V0 plugin to platform-backend integration in Phase 5)
- ⚠️ Prompts + completions still flow through DeepRouter and are subject to provider Terms (Anthropic / OpenAI / Doubao) and AU obligations on Airbotix as the deployer

**BYOK mode** (the family supplies their own provider key, paying the LLM bill directly): Airbotix is no longer the deployer for that family. Our client-side plugin still enforces tool whitelist + system prompt, but server-side moderation (run by DeepRouter) is bypassed. **Recommend BYOK only for parents technical enough to read the privacy implications.** Marketing-page disclosure required.

---

## 1. Regulatory landscape at a glance

Australia regulates kid-facing online services through **three overlapping regimes**:

1. **Online safety** — Online Safety Act 2021 (OSA) + Online Safety Amendment (Social Media Minimum Age) Act 2024 + the Basic Online Safety Expectations (BOSE) determination. Enforced by the **eSafety Commissioner**, who has expanded transparency-notice and code-making powers and has been actively investigating AI products since late 2025.
2. **Privacy** — Privacy Act 1988 + the (in-draft) **Children's Online Privacy Code (COPC)**, exposure draft released 31 March 2026, registration deadline 10 December 2026. Enforced by the **OAIC** (Office of the Australian Information Commissioner).
3. **AI governance** — Australia chose **voluntary guidance + sectoral law** over a standalone AI Act (confirmed in the December 2025 National AI Plan). The **Voluntary AI Safety Standard** (10 guardrails, August 2024) is the de-facto baseline. Mandatory rules for AI risk land via sectoral codes — and the COPC is the first one with kid-AI teeth.

For Kids OpenCode, the practical effect: we are simultaneously a regulated **online service** (OSA/BOSE), a **handler of children's personal information** (Privacy Act → COPC by Dec 2026), and an **AI system serving minors** (Voluntary AI Safety Standard expectations + likely COPC enforcement vector).

---

## 2. Statutes and instruments that bind us

| Statute / instrument | What it controls | In force? | Relevance to Kids OpenCode |
|---|---|---|---|
| [Online Safety Act 2021 (Cth)](https://www.legislation.gov.au/C2021A00076/latest/text) | Online service safety obligations; eSafety's powers | ✅ since Jan 2022 | High — we are a "designated internet service" within the definition |
| [Online Safety Amendment (Social Media Minimum Age) Act 2024](https://www.legislation.gov.au/C2024A00127/asmade/text) | Under-16 social media account ban | ✅ from 10 Dec 2025 | **Conditional** — see §5 (education exemption analysis) |
| [Online Safety (Age-Restricted Social Media Platforms) Rules 2025](https://www.esafety.gov.au/about-us/industry-regulation/social-media-age-restrictions) | Which services count as "age-restricted social media platforms" and which are exempt | ✅ effective 10 Dec 2025 | Defines the education carve-out we rely on |
| [Basic Online Safety Expectations Determination](https://www.esafety.gov.au/industry/basic-online-safety-expectations) | Safety-by-Design expectations, transparency-notice trigger | ✅ updated 2024 | High — informs eSafety transparency notices like the Oct 2025 AI-companion ones |
| [Privacy Act 1988 (Cth)](https://www.legislation.gov.au/C2004A03712/latest/text) + Australian Privacy Principles (APPs) | Personal information handling | ✅ | High — applies to all kid profile data we collect |
| [Privacy (Children's Online Privacy) Code 2026 — exposure draft](https://www.oaic.gov.au/privacy/privacy-registers/privacy-codes/childrens-online-privacy-code) | Specific obligations on services likely to be accessed by children | 🟡 exposure draft (consultation 31 Mar – 5 Jun 2026); **registration deadline 10 Dec 2026** | High — Kids OpenCode is a textbook "service likely to be accessed by children". Must comply on commencement. |
| [Privacy and Other Legislation Amendment Act 2024](https://www.legislation.gov.au/C2024A00128) | Statutory tort of privacy, civil penalties uplift | ✅ Dec 2024 | Civil penalty exposure increased for serious/repeated APP breaches |
| [Voluntary AI Safety Standard (Aug 2024)](https://www.industry.gov.au/publications/voluntary-ai-safety-standard) — 10 guardrails | Non-binding but regulator-expected | ✅ voluntary; National AI Plan Dec 2025 reaffirmed primacy of voluntary + sectoral over standalone AI law | Use as our internal baseline; aligns with future COPC AI provisions |

---

## 3. Regulators

| Body | Scope | Powers | Recent enforcement relevant to us |
|---|---|---|---|
| **eSafety Commissioner** ([esafety.gov.au](https://www.esafety.gov.au)) | OSA / BOSE / Social Media Min Age / industry codes | Transparency notices (compelling explanation under penalty); civil penalties; industry codes; takedown notices; service-blocking | **Oct 2025: notices to Character.AI, Glimpse.AI, Chai, Chub** about kid safety. Outcomes: Character.AI added age assurance + removed chat for U18; Chub withdrew from AU. **This is the playbook eSafety will run on us if we miss the bar.** |
| **OAIC** (Privacy Commissioner) | Privacy Act / APPs / COPC | Determinations; civil penalty proceedings (up to A$50m+ per serious breach post-2024 reforms); investigations; can register binding codes | Issuing exposure draft of COPC; signalled enforcement focus on default-private settings + age assurance proportionality |
| **NSW Department of Education**, VIC DET, etc. (state) | Public schools' AI/tech procurement | Procurement gatekeeping for school deployments | Each state has its own list of approved AI tools for schools; we'll need to be added separately per state for B2B school sales (V1+) |
| **ACCC** | Consumer law / misleading conduct | Substantiation of advertised safety claims | Watch this if marketing claims "safe for kids" without auditable evidence |

Practical: assume **any eSafety transparency notice arrives with 30 days to respond and ~50 detailed questions**. The Oct 2025 round to AI companions is the template.

---

## 4. Specific obligations on Kids OpenCode

> Each row maps an obligation to where in the codebase / config it lives. Engineers: don't ship a feature that breaks one of these unless this table is updated AND the deletion has lawyer sign-off.

| Obligation | Source | Implemented in | Owner | Status |
|---|---|---|---|---|
| **Disclose to user that they are interacting with AI** | Anthropic AUP + OpenAI U18 Guidance + Voluntary AI Standard guardrail 6 | `packages/kids-plugin/src/system-prompt.ts` (rule #5: "Never pretend to be human"); terminal banner emitted by wrapper on startup | Team B | ✅ implemented in plugin |
| **Age-appropriate content moderation in + out** | OSA BOSE §6 + Anthropic Help Center 9307344 | `deeprouter-ai/deeprouter` Phase 4 (content moderation pipeline) | Team A | 🟡 Phase 4 not started |
| **Zero Data Retention on OpenAI calls for kid tenant** | OpenAI U18 Guidance | `deeprouter-ai/deeprouter` policy middleware (`kids_mode=true` → `store: false` injection) | Team A | ✅ landed (commits `2620e4d7` + `54fc4cf0`) — verify covers all paths |
| **No PII leaked to upstream provider in metadata** | OpenAI U18 + Anthropic AUP | DeepRouter `kids` package — strip identifying metadata before forward | Team A | ✅ landed |
| **Default privacy: kid project local-only; sharing is opt-in and goes through airbotix-app cloud** | Privacy Act APPs (data minimisation, default privacy) + COPC draft + OSA BOSE | CLI keeps project local; sharing happens in `Airbotix-AI/airbotix-app` cloud SPA with explicit kid+parent action | platform team | ✅ structurally enforced (V0 CLI has no sharing surface) |
| **Parental consent records, immutable, exportable** | Privacy Act APP 1 + 5 + 11 + COPC draft | `Airbotix-AI/platform-backend` (auth/consent audit table; export endpoint) | platform team | 🟡 not implemented |
| **One-click data export (kid + family)** | Privacy Act APP 12; COPC draft | `Airbotix-AI/platform-backend` + family dashboard UI | platform team | 🔴 V0 blocker (master doc C9) |
| **One-click account deletion + downstream wipe** | Privacy Act APP 11 + COPC draft | platform-backend + DeepRouter audit-trim job | platform team | 🔴 V0 blocker (master doc C9) |
| **No training-data use of kid content; stated publicly** | OpenAI ToS + COPP draft + market expectation | `airbotix-ai/airbotix` (public privacy policy) + provider config (we don't opt in) | Lightman + Lawyer | 🔴 V0 blocker (master doc C12) |
| **No third-party advertising** | OSA BOSE + child-product market expectation | Platform business model (Stars Pack, no ads) | Lightman | ✅ business-locked |
| **Audit log: every agent tool call, retrievable for 90 days hot + 3 years cold** | Anthropic Help Center 9307344 + OAIC enforcement posture | `packages/kids-plugin/src/index.ts` emits structured stderr lines for V0 (`tool.execute.before` / `tool.execute.after` / `tool.blocked.*`); Phase 5 integration POSTs them to `Airbotix-AI/platform-backend` `/api/audit` for managed-mode families. DeepRouter keeps the LLM-request log independently. | Team B + platform + Team A | 🟡 plugin emits; persistence pipeline Phase 5 |
| **Incident response: notify family + (per Privacy Act) OAIC for eligible data breach** | Privacy Act Pt IIIC (NDB scheme) | Runbook in `Airbotix-AI/planning/` (TBD); on-call rotation | Lightman | 🔴 V0 blocker |
| **Public-facing compliance statement on airbotix.ai** | Anthropic Help Center 9307344 ("clearly stated on organization's public-facing documentation") | `Airbotix-AI/airbotix` marketing site | Lightman | 🔴 V0 blocker (master doc C10) |
| **System prompt version registry, exportable on regulator request** | OAIC enforcement posture + Anthropic audit | DeepRouter config repo (git-tagged versions) | Team A | 🟡 versioning convention TBD |
| **Human oversight + contestability** | Voluntary AI Standard guardrails 5 + 7 | Class teacher review queue + parent override; `Airbotix-AI/platform-backend` review queue | platform team | 🟡 designed (master doc C13) |
| **Safety-by-Design assessment, refreshed pre-launch** | OSA BOSE | `kids-opencode/docs/safety-assessment.md` (to be created from master doc §5 template) | Team B | 🔴 not started |

---

## 5. The "Kids OpenCode is not social media" question

This matters because the Social Media Min Age Act (in force since 10 Dec 2025) prohibits under-16s from holding accounts on "age-restricted social media platforms". If Kids OpenCode is one, our entire 12-15 audience evaporates.

### 5.1 Why we believe we are NOT an age-restricted social media platform

The Online Safety (Age-Restricted Social Media Platforms) Rules 2025 exempt services whose "**sole or primary purpose is education**" (and health). Our case for the education exemption:

| Argument | Evidence |
|---|---|
| Sole or primary purpose is education | Product positioned as K-12 AI coding curriculum delivery (see `airbotix/docs/product/prd/kids-ai-platform-prd.md` §1). Mission-based learning (Course Pack runner) — every kid action is bound to a Mission with stated learning objectives. |
| Curriculum-aligned | AU Digital Technologies F-10 curriculum alignment (per platform PRD §1.4) — required evidence of pedagogical structure, not entertainment optimisation. |
| Teacher / parent in the loop | Class teachers create Workshop sessions; parents see audit log; no kid-to-kid private messaging. |
| Not optimised for engagement metrics | No follow graph, no feed algorithm, no notifications optimising for return-visits, no infinite scroll. |
| "Social" features bounded to teaching context | Class Wall is a per-class exhibition of completed work, moderated by the teacher. No DMs, no friend requests, no public profiles. |

### 5.2 What could fail this argument

- If Class Wall becomes browsable across classes / public, we look more social and less educational.
- If we ship features primarily to drive return visits (streaks, leaderboards, notifications), the "engagement-driven" framing risks reclassification.
- If we onboard kids without a teacher or curriculum context (pure consumer onboarding), the "primary purpose education" claim weakens.

### 5.3 What we keep on hand to prove the exemption

- Curriculum mapping document (per Course Pack)
- Teacher / school MoU samples
- Default privacy setting documentation showing class-only scope by default
- Architecture doc showing the absence of social-media features (follow, DM, recommendation feed)
- This file, lawyer-reviewed

---

## 6. eSafety transparency-notice readiness

Based on the Oct 2025 round to AI companions, expect: 30-day window, ~50 questions, public reporting of responses. Prepare answers in advance for the predictable categories:

1. **Age assurance** — what we do at account creation; failure modes; how we detect underage off-target use.
2. **Content moderation** — input + output filtering models, refusal rates, false-positive rates, sample test set, red-team programme.
3. **Suicidal / self-harm content** — detection pipeline, escalation to human, crisis-line referrals (AU Kids Helpline, etc.).
4. **Sexually explicit / grooming content** — explicit blocklist, classifier, refusal templates, reporting to ACCCE if CSAM generated/uploaded.
5. **Engagement design** — what we do to prevent excessive use; whether we use dark patterns; time-on-app metrics.
6. **Transparency to users** — AI disclosure, data handling, parental visibility.
7. **Complaints and contestability** — how a kid / parent disputes an AI response or content removal.
8. **Incident reports** — what we've had, how we responded.
9. **Underpinning models** — who trained them, what the safety eval results are, what we as deployer have done on top.
10. **Audit and external review** — who looks at our safety claims independently.

Owner: Lightman + lawyer. **First-draft answers should be written before V0 launch**, not after a notice arrives.

---

## 7. Children's Online Privacy Code readiness (deadline 10 Dec 2026)

The COPC will be law by 10 December 2026. We need to be compliant on day one. Engineering and policy work that must land by then:

| Item | Likely COPC requirement | Where it lands |
|---|---|---|
| "Likely to be accessed by children" self-classification | Documented self-assessment | This file + `safety-assessment.md` |
| Age-appropriate design / default-private | Aligned with UK ICO Age Appropriate Design Code (the COPC's stated reference framework) | `packages/kids-web/` UI defaults + `platform-backend` API |
| Parental consent for processing | Stronger than current checkbox; likely written record + verification | `platform-backend/auth` |
| Data minimisation specifically for child profiles | Beyond Privacy Act APP 3 — likely a positive duty | Schema review of platform-backend |
| Geolocation default-off | Per UK ICO precedent | `kids-web` + `platform-backend` (we currently don't collect; keep it that way) |
| Nudge-techniques restrictions | Likely prohibition of engagement dark patterns | UX review (no streaks-with-loss, no addictive notification cadence) |
| Automated decision-making disclosure | Per COPC draft direction | DeepRouter audit log + parent dashboard |
| Profiling restrictions | Likely default-off for child accounts | Schema review (we don't profile; keep it that way) |
| Connected toys / IoT (Robotics Bridge) | If V1+ ships USB → mBot, may need additional safeguards | V1+ scope |

Action: **submit a response to the OAIC consultation by 5 June 2026 deadline** (Lightman + lawyer). This both shapes the final Code and demonstrates engagement to the regulator.

---

## 8. Voluntary AI Safety Standard alignment (the 10 guardrails)

These are non-binding but are the regulator-expected baseline. Map each to our implementation:

| # | Guardrail (summary) | Where we address it |
|---|---|---|
| 1 | Establish, implement and publish an accountability process | Lightman as named compliance officer; this directory is the public-facing artifact |
| 2 | Risk-management process incl. impact on people | `safety-assessment.md` (to be created); recurring review cadence |
| 3 | Data governance (quality, provenance, security) | `platform-backend` schema + DeepRouter request log |
| 4 | Test AI models and systems for safety / performance | Red-team test set in `kids-opencode/docs/red-team.md` (to be created) before V0 |
| 5 | Human control / intervention (oversight) | Plan/approve UX in agent dialog; teacher review queue; parent dashboard |
| 6 | Inform end-users about AI use | System prompt + persistent UI label |
| 7 | Establish challenge processes for affected people | Parent / kid feedback loop; takedown / appeal endpoint |
| 8 | Be transparent across AI supply chain | This directory + DeepRouter request log + audit cooperation with Anthropic / OpenAI |
| 9 | Keep records to allow third-party compliance assessment | Git-tagged system prompts; audit log retention; parental consent records |
| 10 | Engage stakeholders (focus on safety, diversity, inclusion, fairness) | Workshop teacher feedback loop; parent surveys; consultation with kid users |

None of these is "done" yet for V0. Each row above corresponds to a Phase in `PLAN.md`.

---

## 9. Open items / lawyer TBD

> 🟢 **Engineering-side substantive draft answers for every item below** are in [`au-lawyer-pass.md`](./au-lawyer-pass.md) (2026-05-15). The "Status" column reflects whether the draft answer has been reviewed by a qualified AU lawyer yet.

| ID | Question | Owner | Draft answer | Status |
|---|---|---|---|---|
| `AU-1` | Confirm Kids OpenCode qualifies for the education exemption from the Social Media Min Age regime | Lightman + AU lawyer | ✅ Position: clearly qualifies; signed "Sole or Primary Purpose Statement" published; per-feature review on V1+ social-feeling additions. See [`au-lawyer-pass.md`](./au-lawyer-pass.md) §AU-1 | 🟡 lawyer to confirm (1-2h) |
| `AU-2` | Draft & file submission to OAIC's Children's Online Privacy Code consultation by 5 June 2026 | Lightman | ✅ Final ready to send: [`au-oaic-copc-submission-final.md`](./au-oaic-copc-submission-final.md). Send-day instructions: [`au-oaic-copc-send-instructions.md`](./au-oaic-copc-send-instructions.md). Author: Lightman (Founder), lightman@jiangren.com.au | 🟡 **Send by 2026-06-04 (1-day buffer before 6-5 COB hard deadline)** |
| `AU-3` | Public compliance statement on airbotix.ai/compliance | Lightman + lawyer | ✅ Drafted in plain English. See [`au-lawyer-pass.md`](./au-lawyer-pass.md) §AU-3 | 🟡 lawyer to confirm (2-3h) + Airbotix-AI/airbotix repo to host |
| `AU-4` | NSW + VIC + QLD state-level school procurement requirements | Lightman | ✅ Position: V0 direct-to-family is NOT caught by state approval. B2B public-school sales (V1+) require per-state approval, start NSW. Private + Catholic schools can pilot in V0/V1 transition without state list. See [`au-lawyer-pass.md`](./au-lawyer-pass.md) §AU-4 | 🟡 lawyer to confirm (1-2h, fold into broader review) |
| `AU-5` | NDB scheme runbook | Lightman + lawyer + Team B | ✅ Full runbook drafted (7-step process from awareness → records). See [`au-lawyer-pass.md`](./au-lawyer-pass.md) §AU-5 | 🟡 lawyer to confirm (2-3h) + Phase 4 implementation |
| `AU-6` | Statutory tort of privacy exposure | Lawyer | ✅ Risk analysis + 4 mitigations (cyber insurance, annual PIA, ToS limitation language, mandatory arbitration for adult terms). See [`au-lawyer-pass.md`](./au-lawyer-pass.md) §AU-6 | 🟡 lawyer to confirm (2-3h) |
| `AU-7` | AI Safety Assessment template — adopt or design? | Team B | ✅ Position: design our own, align to Voluntary AI Safety Standard + eSafety Safety by Design. Template drafted. See [`au-lawyer-pass.md`](./au-lawyer-pass.md) §AU-7 | 🟡 lawyer to confirm (1h) + Phase 4 first instance |
| `AU-8` | Anthropic "organizations serving minors" approval | Lightman | ✅ Position: no formal approval exists. Proactive outreach to Anthropic + OpenAI + Doubao compliance teams. See [`au-lawyer-pass.md`](./au-lawyer-pass.md) §AU-8 | 🟡 lawyer to confirm (1h) + Lightman to send emails |

**Total qualified-lawyer time estimate to close all 8: 11-16 hours.** Front-load in Phase 4 (W7-8).

---

## 10. Implementation responsibility map

| Concern | `kids-opencode` CLI (this repo) | `Airbotix-AI/platform-backend` | `deeprouter-ai/deeprouter` | `Airbotix-AI/airbotix-app` (cloud SPA) | `Airbotix-AI/airbotix` (marketing) |
|---|:--:|:--:|:--:|:--:|:--:|
| Kid-facing AI disclosure (system prompt + terminal banner) | ✅ | | | | |
| Tool whitelist (no shell), webfetch host allowlist | ✅ | | | | |
| Project-folder confinement | ✅ (opencode `read` / `write` / `edit` are cwd-scoped by upstream design + plugin verifies) | | | | |
| Agent audit emission (per tool call) | ✅ (stderr V0; HTTP POST Phase 5) | ✅ (persist when ingested) | | | |
| Parental consent capture | | ✅ | | ✅ (UI flow) | |
| DeepRouter tenant key issuance for family | | ✅ | | ✅ (parent dashboard) | |
| Stars wallet / billing | | ✅ | ✅ (webhook source) | ✅ (UI) | |
| Sharing kid project (only via cloud opt-in; never from CLI) | N/A (CLI is local-only by design) | ✅ (API) | | ✅ (UI) | |
| Data export / one-click delete (managed-mode kids' data) | | ✅ | | ✅ (UI) | |
| Input content moderation (prompts) | (defence-in-depth, plugin tool-args check) | | ✅ (primary) | | |
| Output content moderation (LLM responses) | | | ✅ | | |
| OpenAI ZDR injection | | | ✅ | | |
| Anthropic policy compliance forward (metadata strip, system prompt) | | | ✅ | | |
| Audit log retention 90d hot / 3y cold | | ✅ (kid-platform side) | ✅ (LLM-request side) | | |
| Public privacy policy + terms + consent forms | | | | | ✅ |
| Compliance statement page | | | | | ✅ |
| BYOK-mode disclosure ("no Airbotix moderation in this mode") | ✅ (terminal warning at startup) | | | | ✅ (download page) |
| Install signature / supply-chain integrity | ✅ (script will sign in V1) | | | | ✅ (HTTPS + checksum) |
| Incident response runbook | ✅ (product-specific) | ✅ (platform-wide) | ✅ (gateway-specific) | | |

---

## 11. Audit-ready evidence we keep on hand (regulator notice → 7 business days)

- [ ] System prompt versions (git-tagged in `kids-opencode` + `deeprouter-ai`)
- [ ] Moderation hit logs (per-tenant; DeepRouter)
- [ ] Parental consent records (platform-backend immutable audit table)
- [ ] AI Safety Assessment (`kids-opencode/docs/safety-assessment.md`, refreshed each major release)
- [ ] Red-team test set + results (`kids-opencode/docs/red-team.md`)
- [ ] Incident response log (Lightman-owned operational doc, not in repo)
- [ ] Lawyer review record for this file (status table on `README.md`)
- [ ] Curriculum mapping per Course Pack (evidence for education exemption)

---

## 12. Sources

Search & analysis date: 2026-05-15

### Statute / regulator primary

- [Online Safety Act 2021 (Cth) — Federal Register of Legislation](https://www.legislation.gov.au/C2021A00076/latest/text)
- [Online Safety Amendment (Social Media Minimum Age) Act 2024 — Federal Register of Legislation](https://www.legislation.gov.au/C2024A00127/asmade/text)
- [eSafety Commissioner — Social Media Age Restrictions](https://www.esafety.gov.au/about-us/industry-regulation/social-media-age-restrictions)
- [eSafety Commissioner — Basic Online Safety Expectations](https://www.esafety.gov.au/industry/basic-online-safety-expectations)
- [Privacy Act 1988 (Cth) — Federal Register of Legislation](https://www.legislation.gov.au/C2004A03712/latest/text)
- [OAIC — Children's Online Privacy Code](https://www.oaic.gov.au/privacy/privacy-registers/privacy-codes/childrens-online-privacy-code)
- [OAIC — Exposure Draft media release (31 March 2026)](https://www.oaic.gov.au/news/media-centre/oaic-releases-exposure-draft-of-the-childrens-online-privacy-code)
- [Department of Industry — Voluntary AI Safety Standard](https://www.industry.gov.au/publications/voluntary-ai-safety-standard)
- [Department of Industry — 10 Guardrails](https://www.industry.gov.au/publications/voluntary-ai-safety-standard/10-guardrails)

### Regulator AI-companion enforcement (precedent for transparency notices)

- [eSafety: Findings from transparency notices on AI companion apps (Oct 2025)](https://www.esafety.gov.au/industry/basic-online-safety-expectations/ai-services/findings-october-2025)
- [eSafety: AI chatbots and companions — risks to children](https://www.esafety.gov.au/newsroom/blogs/ai-chatbots-and-companions-risks-to-children-and-young-people)
- [eSafety report: AI companions are putting children at risk](https://www.esafety.gov.au/newsroom/media-releases/esafety-report-shows-ai-companions-are-putting-children-at-risk)
- [eSafety: Generative AI and child safety](https://www.esafety.gov.au/industry/tech-trends-and-challenges/convergence-series/generative-ai-and-child-safety-a-convergence-of-innovation-and-exploitation)

### Legal analysis (secondary)

- [DLA Piper Privacy Matters — Australia's exposure draft Children's Online Privacy Code (Apr 2026)](https://privacymatters.dlapiper.com/2026/04/australia-exposure-draft-of-childrens-online-privacy-code-signals-tougher-standards/)
- [Baker McKenzie — Children's Online Privacy Code Exposure Draft (May 2026)](https://www.bakermckenzie.com/en/insight/publications/2026/05/australia-childrens-online-privacy-code-exposure-draft)
- [MinterEllison — What the Draft COPC Means for Your Business](https://www.minterellison.com/articles/oaics-childrens-online-privacy-code-what-to-expect)
- [DLA Piper Privacy Matters — Social Media Ban + eSafety guidance (Feb 2026)](https://privacymatters.dlapiper.com/2026/02/australias-social-media-ban-and-the-esafety-commissioners-social-media-minimum-age-regulatory-guidance/)
- [MinterEllison — Impending Social Media Min Age obligations](https://www.minterellison.com/articles/australias-impending-social-media-minimum-age-obligations)
- [Quinn Emanuel — Australia Sets Minimum Age for Social Media Use](https://www.quinnemanuel.com/the-firm/publications/australia-sets-minimum-age-for-social-media-use-a-closer-look-at-the-online-safety-amendment-social-media-minimum-age-act-2024/)
- [Sidley DataMatters — Children's Privacy in 2026 (AU + US)](https://datamatters.sidley.com/2026/02/13/childrens-privacy-in-2026-from-australias-under-16-social-media-ban-to-a-shift-beyond-notice-and-consent-in-the-united-states/)
- [Ashurst — Australia's new AI safety guardrails + high-risk approach](https://www.ashurst.com/en/insights/australia-new-ai-safety-guardrails-and-a-targeted-approach-to-high-risk-settings/)
- [Corrs — Australia releases proposed mandatory guardrails for AI regulation](https://www.corrs.com.au/insights/australia-releases-proposed-mandatory-guardrails-for-ai-regulation)

### Cross-reference

- Master compliance doc (platform-wide, multi-jurisdiction): `~/Documents/sites/airbotix/docs/product/compliance/minors-compliance.md` (v0.1, 2026-05-11)

---

## 13. Revision history

| Version | Date | Author | Note |
|---|---|---|---|
| 0.2 | 2026-05-15 | Engineering audit (Claude assist) | Revised for V0 CLI-first product shape. Added §0 (CLI distribution context); collapsed responsibility matrix to reflect that kid project files stay local; added BYOK-mode disclosure obligation. Substantive compliance posture unchanged. |
| 0.1 | 2026-05-15 | Engineering audit (Claude assist) | Initial AU-specific compliance audit. Captures 2026-05-15 state of OSA/Social Media Min Age (in force), COPC (exposure draft consultation 31 Mar – 5 Jun 2026), Voluntary AI Safety Standard, and eSafety AI-companion enforcement precedent. **Not lawyer-reviewed.** |
