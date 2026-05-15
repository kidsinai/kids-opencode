# AU compliance — engineering-side substantive answers to open items

> Reasoned positions on each of the 8 `AU-*` open items from [`au.md`](./au.md) §9. **This is not legal advice.** It's the most rigorous engineering-side reasoning I can produce, citing the same primary sources a competent AU privacy lawyer would. A qualified AU privacy / tech lawyer must still sign off on items where lawyer review is named explicitly — but this document substantially narrows what they need to confirm vs. what they need to research from scratch.
>
> Status: 🟡 engineering-side draft. Pending qualified-AU-lawyer confirmation.
> Date: 2026-05-15

---

## How to read this document

Each item gets four sections:

1. **The question** — restated from `au.md` §9
2. **The reasoning** — what the law / regulator guidance actually says, applied to our product
3. **The position** — concrete answer
4. **What a lawyer still needs to confirm** — the smallest possible question left for an actual qualified lawyer

This structure exists because a real lawyer's review hours are worth ~A$500/hr. Showing up with "here's our reasoning and the 1-line question we need you to bless" reduces lawyer time to a tenth of "please look at this Code and tell us what to do."

---

## AU-1 — Education exemption from the Social Media Min Age regime

### The question

Does Kids OpenCode qualify for the "primary purpose is education" exemption in the Online Safety (Age-Restricted Social Media Platforms) Rules 2025, so we are not prohibited from having under-16 users hold accounts?

### The reasoning

The Online Safety Amendment (Social Media Minimum Age) Act 2024 prohibits under-16s from holding accounts on "age-restricted social media platforms" (ARSMP). The Rules made under that Act specify both which platforms are caught and which categories are exempt. The Department of Infrastructure has stated:

> Under 16s continue to have access to services that are primarily for the purposes of education and health support.

The Wikipedia summary and the Quinn Emanuel analysis agree: services whose **sole or primary purpose is education** are exempt by the Rules.

The legal test is **purpose-based, not feature-based**. Whether a feature looks like a social-media feature (a class wall, comments, profile pictures) does not automatically pull a service into the ARSMP definition; what matters is the sole or primary purpose of the service.

Applied to Kids OpenCode:

**Strongly in favour of the exemption applying**:
1. The product is designed expressly as a coding **mentor** with mission-based learning. Every kid session has a Course Pack context with documented learning objectives (PLAN.md Phase 3). This is a textbook education product.
2. Curriculum alignment with AU Digital Technologies F-10 (see `airbotix/docs/product/prd/kids-ai-platform-prd.md` §1).
3. Teacher participation is integral: workshops, class codes, teacher console (`Airbotix-AI/teacher-console`).
4. No social-media-style features in V0: no friend graphs, no direct messaging, no public profile pages, no algorithmic feeds, no notifications optimised for return-visits.
5. No advertising at all. The Stars-Pack business model means the product economics align with education delivery, not with attention extraction.
6. Distribution is via the airbotix.ai marketing site, which is a school-and-family-facing education brand (no general consumer or social-media positioning).

**Mild factors to manage**:
- A "Class Wall" feature is planned (V1+, not V0 CLI). When it ships, it must be **per-class, teacher-moderated, no DM, no public profile, no feed algorithm** to preserve the exemption. This is design-side risk, but the V0 CLI ships without it, so we are safe today.
- Some V1+ features (sharing kid projects publicly, social annotations) could individually tip the balance. The "primary purpose" test would still rescue us if we maintain a documented architecture review for each such feature against this exemption.

### The position

✅ **Kids OpenCode V0 (CLI) clearly qualifies for the education exemption.** The primary purpose is education; no social-media features ship; teacher participation is structural.

We should document this position in:
- A signed "Sole or Primary Purpose Statement" in `Airbotix-AI/airbotix` repo (marketing-site adjacent), explaining the position for regulator inspection
- An ongoing architecture-review note on every V1+ feature that adds any social-feeling element, asking "does this risk tipping us out of the exemption?"

We should NOT:
- Need to apply for any official "exempt service" status — the Rules are self-executing, not registration-based
- Try to argue the exemption defensively if we one day add real social-network features

### What a lawyer still needs to confirm

> "Given the description of Kids OpenCode V0 (CLI tool for kid coding, distributed via airbotix.ai, no social-media-style features), is our self-classification under the 'sole or primary purpose is education' carve-out from the ARSMP Rules safe to rely on? If yes, is a signed standing statement (rather than per-user verification) sufficient documentary evidence?"

Estimated lawyer time: 1-2 hours.

---

## AU-2 — OAIC Children's Online Privacy Code consultation submission

### The question

Draft and file a written submission to OAIC's COPC consultation by 5 June 2026.

### The position

✅ **Drafted as a working document.** See companion files:
- Explainer: [`au-oaic-copc-explainer.md`](./au-oaic-copc-explainer.md)
- Submission draft: [`au-oaic-copc-submission-draft.md`](./au-oaic-copc-submission-draft.md)

Lightman to polish bracketed placeholders, optionally have a lawyer skim, and email to `copc@oaic.gov.au` before COB Friday 5 June 2026.

### What a lawyer still needs to confirm

Optional review of the submission letter (the document is short and the substance is genuinely about regulatory framing, not legal positioning). If you skip this, the practical risk is low.

Estimated lawyer time: 1-2 hours optional.

---

## AU-3 — Public compliance statement on airbotix.ai/compliance

### The question

Draft the public-facing compliance statement that Anthropic's "Responsible Use of Anthropic's Models — Organizations Serving Minors" article (Anthropic AUP support article 9307344) requires us to publish.

### The reasoning

Anthropic requires:

> Compliance with these regulations should be clearly stated on the organization's website or similar public-facing documentation.

The published statement satisfies a few audiences:
1. **Anthropic compliance auditors** — proves we are not pretending to comply privately
2. **AU regulators (eSafety, OAIC)** — first thing they look at if they investigate
3. **Parents** — many parents Google "is this kid-AI safe?" before paying

A good compliance statement is:
- Plain English
- Specific (lists what we do, not just "we comply with applicable laws")
- Auditable (claims are verifiable against the product behaviour)
- Updated when material changes happen

Below is a draft.

### Draft compliance statement for airbotix.ai/compliance

> **Kids OpenCode — How we keep your kid safe**
>
> Kids OpenCode is built for kids 12 and older. It runs on your family's own computer. Here's exactly what we do, and what we don't do.
>
> **What Kids OpenCode does:**
> - Talks to an AI mentor through Airbotix's secure gateway (DeepRouter). The gateway adds content moderation that catches harmful prompts and harmful responses before they reach your kid.
> - Refuses to run shell commands or touch files outside the project folder your kid is working in.
> - Asks before every single tool use ("I'm about to write `index.html` — OK?"). The kid (or the parent) approves each step.
> - Never pretends to be human. Never introduces adult topics. Always redirects self-harm conversations to Kids Helpline (1800 55 1800).
>
> **What we don't do:**
> - We don't show ads. Ever.
> - We don't sell your kid's data. Ever.
> - We don't use your kid's data or code to train AI models. Ever.
> - We don't keep your kid's project files on our servers — they live on your family's computer.
>
> **How AI requests get handled:**
> - Every AI request goes through DeepRouter, our gateway. DeepRouter:
>   - Strips identifying information before sending the request to OpenAI / Anthropic / etc.
>   - Forces "Zero Data Retention" mode on OpenAI requests (the strictest privacy option OpenAI offers).
>   - Filters harmful content in and out.
> - We keep a record of which AI calls were made (not the content), for 90 days for safety review, then 3 years in encrypted archive.
>
> **What we collect and why:**
> - Family email (so a parent can log in and manage the family account).
> - Kid's age band (so we can tailor the AI mentor's behaviour). We don't store the kid's birthday or real name.
> - Audit log of AI tool calls (so a parent can see what happened in a session).
> - Payment info for Stars Pack purchases (handled by Airwallex; we don't store card numbers).
>
> We do not collect or store: voice, face, location, biometric data, school name (unless your family fills it in), or third-party tracking.
>
> **How to ask for your kid's data, or delete the account:**
> - Email `privacy@airbotix.ai` from the parent email on the account.
> - We respond within 14 days. Full deletion completes within 30 days.
>
> **Australian families:**
> - Your data stays in Sydney (AWS ap-southeast-2 region).
> - We are committed to the Privacy Act 1988 and the Children's Online Privacy Code (currently in draft; we are tracking it for the 10 December 2026 commencement).
> - We are a kid-product operator under Anthropic's "Organizations Serving Minors" guidelines and abide by OpenAI's Under-18 API Guidance.
> - For your kid's online safety: the eSafety Commissioner is the right body. We cooperate fully with eSafety transparency notices.
>
> **Bring-your-own-key mode (advanced families):**
> - If your family chooses to connect Kids OpenCode to your own Anthropic or OpenAI account directly (bypassing our gateway), you lose our moderation layer. The on-device tool whitelist and safe-system-prompt still apply. We recommend most families use the default (DeepRouter-mediated) mode for full kid safety.
>
> **Where this document lives:**
> - `airbotix.ai/compliance` — this URL
> - Always reflects the current product state
> - Material changes will be notified to family accounts by email
>
> **Need to talk to a human?** privacy@airbotix.ai
>
> **Version 0.1 — 2026-05-15 — last updated [DATE].**

### What a lawyer still needs to confirm

> "Read the draft compliance statement above. Are there overstatements, missing legally-required content, or formulations that create unnecessary liability? Is the 14-day deletion response window an enforceable commitment? Is the AWS Sydney data-residency claim accurate given our actual deployment?"

Estimated lawyer time: 2-3 hours.

---

## AU-4 — State-level school procurement requirements

### The question

For B2B sales to AU schools (V1+), do we need to be on any pre-approved AI tool list (NSW DoE, VIC DET, QLD DoE, etc.) before we can be deployed in schools?

### The reasoning

Each AU state runs its own approval process for AI tools used in public schools. As of 2026:

- **NSW Department of Education** has issued AI guidance for schools and an Approved AI Products List. Tools not on the list are by default not approved for use with student data, though there is a self-assessment / risk-assessment path for limited pilot.
- **VIC Department of Education and Training** has been running an AI in Education pilot and maintains its own approval list.
- **QLD Department of Education** has a procurement-side approval process distinct from teaching guidance.

These lists do NOT apply to:
- Independent (private) schools
- Catholic-system schools (which have their own approvals)
- Tools used outside school networks (e.g., kids using kids-opencode at home, even if for school homework)

V0 launches as a direct-to-family product. School deployment is V1+. The implication:

- For V0 we are NOT making B2B school sales. State-level approval is not on the critical path.
- For V1+ workshop deployment, we will work with each state's approval process **only as we add states to our footprint**. Starting with NSW (where Airbotix is based) makes sense.
- Independent and Catholic schools can be approached for pilot deployment in V0 / V1 transition without state-list dependency.

### The position

✅ **Not a V0 blocker.** Note in PLAN.md that:
- Direct-to-family sales (V0) do not require state approval
- B2B public-school sales require **per-state pre-approval** (start with NSW)
- B2B private-school sales can proceed pilot-by-pilot in V0/V1 transition

Action: add a row to `airbotix/docs/product/prd/kids-ai-platform-prd.md` under "GTM constraints" pointing at this analysis. No urgent action required.

### What a lawyer still needs to confirm

> "Confirm V0 direct-to-family distribution (via airbotix.ai download) is not caught by any AU state's school AI procurement regime. Confirm Catholic and independent schools can be approached as B2B pilots in V0 without state-list registration."

Estimated lawyer time: 1-2 hours. Could be folded into the broader privacy review.

---

## AU-5 — Notifiable Data Breaches scheme — runbook

### The question

Build a runbook for the Notifiable Data Breaches (NDB) scheme under Part IIIC of the Privacy Act 1988: who notifies whom, how fast, threshold for kid product.

### The reasoning

The NDB scheme requires APP entities to notify the OAIC and affected individuals of an "eligible data breach" — unauthorised access, disclosure, or loss of personal information likely to result in serious harm — **as soon as practicable** after becoming aware of it, and no later than **30 days** after first awareness.

For kids:
- A breach involving children's data is presumptively "likely to result in serious harm" because kids are vulnerable. Default to notify.
- OAIC has signalled tighter enforcement of NDB for kid products in their 2024-2025 enforcement strategy.

What constitutes an "eligible data breach" for kids-opencode V0:
1. **Strong yes** — unauthorised disclosure of any kid profile data (age band, audit log) from `Airbotix-AI/platform-backend`.
2. **Strong yes** — unauthorised disclosure of family contact information.
3. **Strong yes** — DeepRouter audit log breach where prompts/responses are exposed.
4. **Yes** — leak of parental consent records.
5. **Yes** — DeepRouter API key breach (could let attacker route requests under our tenant; itself not personal data, but operationally serious).
6. **Probably no** — leak of a single kid's HTML/CSS file from their own local machine via, e.g., a Github accidentally-public commit; that's a parent-side mistake, not our breach. But we should still help the family if asked.

### Draft NDB runbook

```
1. AWARENESS — anyone observing or being notified of a possible breach must
   immediately email security@airbotix.ai. The on-call engineer takes the
   ticket.

2. CONTAINMENT (within 4 hours of awareness) — the on-call engineer:
   - Revokes affected access keys / tokens / sessions
   - Snapshots the affected systems for forensics
   - Notifies Lightman (founder) and the most senior engineer present
   - Does NOT public-disclose anything publicly yet

3. ASSESSMENT (within 24 hours) — Lightman + lawyer review:
   - What personal info was involved?
   - How many individuals (kids + families) are affected?
   - Are kids' data involved? (default: serious harm presumption)
   - Is this an "eligible data breach" under Part IIIC?
   The Assessment must be documented in a memo.

4. DECISION (within 30 days of awareness, ideally within 72 hours) —
   Lightman, on lawyer advice, decides:
   - Is notification to OAIC required? (likely yes if kids' data involved)
   - Is notification to affected individuals required? (likely yes)

5. NOTIFICATION — if required:
   - To OAIC: via the OAIC online form (notifying.oaic.gov.au) — includes
     identity of the entity, description of the breach, kind of info
     involved, recommendations for affected individuals.
   - To affected families: by email to the parent account, in plain
     English, including: what happened, what info was affected, what we are
     doing, what they should do (change password, watch for phishing, etc.),
     contact for questions.
   - To Anthropic / OpenAI / DeepRouter operators if their data was
     implicated.

6. POST-INCIDENT (within 30 days of containment):
   - Public statement on airbotix.ai if breach was material
   - Internal post-mortem (blameless)
   - PLAN.md update if architecture needs to change
   - Re-test by red team to confirm fix

7. RECORDS — every breach (eligible or not) is logged with timestamps,
   decisions, and outcomes in an immutable audit log accessible only to
   Lightman + lawyer.
```

### The position

✅ **Runbook drafted above.** Implement in Phase 4 / before V0 launch:
- `security@airbotix.ai` email alias active
- On-call rotation defined (V0 = Lightman + 1 engineer)
- Notification templates pre-drafted (one for OAIC, one for families)
- One annual NDB drill where we simulate a breach and walk through the runbook

### What a lawyer still needs to confirm

> "Review the runbook above. Specifically: is the 'kids' data → serious harm presumption' the right default for our product type? Are the notification templates legally appropriate? Is the 30-day decision window correct given recent OAIC enforcement positioning?"

Estimated lawyer time: 2-3 hours. Worth folding into the AU-1 / AU-3 lawyer session.

---

## AU-6 — Statutory tort of privacy exposure

### The question

The Privacy and Other Legislation Amendment Act 2024 introduced a **statutory tort of serious invasion of privacy**. What is our civil liability exposure if a kid's data leaks?

### The reasoning

The new tort (in force from late 2025) gives individuals a private right of action for "serious invasion of privacy" — distinct from regulatory enforcement under the Privacy Act. The leading elements:

- An invasion of privacy occurs
- The invasion is serious
- The conduct is intentional or reckless (or, for some breaches, even negligent in narrow cases)
- The plaintiff has a reasonable expectation of privacy
- The countervailing public interest does not outweigh the privacy interest

What this changes vs. APP-only liability:

- **APP enforcement** is by OAIC, with civil penalties up to $50m+ for serious / repeated breaches. Most kid-product cases settle.
- **The new tort** lets a parent (on behalf of their kid) sue the operator directly. Damages can include emotional distress, not just financial loss.

For kid products this is a meaningful new exposure because:
1. Parents are more litigious about kid harm than about their own privacy
2. "Serious" is a low bar when kids are involved
3. Class actions become viable (one breach → 1000 affected families → real damages)

What protects us:
- Strong data minimisation (less to leak)
- Documented good-faith compliance posture (this directory)
- Insurance (cyber liability + general liability with kid-product endorsement)

What hurts us:
- Long audit-log retention windows
- BYOK mode where families think they have privacy but bypass our moderation
- Any unilateral product change that materially expands collected data without clear consent

### The position

⚠️ **Real but manageable exposure.** Concrete actions:

1. **Cyber liability insurance with kid-product endorsement** — get a quote in Phase 2. Premium should be modest given V0 user count.
2. **Annual privacy impact assessment** — document our minimisation choices, retain records.
3. **Consider liability-mitigation language in Terms of Service** — limitation of liability clauses do not survive serious negligence in AU, but help against frivolous claims.
4. **Mandatory arbitration for adult-account terms** — kids cannot validly waive litigation rights, but adult parental account terms can include arbitration.

### What a lawyer still needs to confirm

> "Review our data minimisation choices and proposed insurance posture against statutory-tort-of-privacy exposure. Recommend wording for parent-account terms-of-service that fairly limits exposure without being unenforceable. Comment on whether AU class-action risk is realistic given V0 user count <1,000."

Estimated lawyer time: 2-3 hours.

---

## AU-7 — AI Safety Assessment template

### The question

Adopt Standards-Australia / CSIRO-aligned AI Safety Assessment template, or design our own?

### The reasoning

There is no single mandatory template. What's relevant:

- The **Voluntary AI Safety Standard (Aug 2024) 10 guardrails** is the closest thing to government-blessed practice
- **CSIRO's Responsible AI Pattern Catalogue** offers process-level templates for risk assessment
- **eSafety Commissioner's Safety by Design framework** focuses on online services for kids specifically
- **Standards Australia** has not yet published a binding kid-AI assessment standard as of 2026-05-15

The pragmatic move is to **design our own template** that explicitly checks each Voluntary AI Safety Standard guardrail + each eSafety Safety by Design principle. This produces an artifact that:
- Maps to regulator-expected practices
- Is interpretable by regulators (they see their own framework reflected)
- Is small enough that we can actually maintain it per-release

### Draft AI Safety Assessment template

Save as `kids-opencode/docs/safety-assessment.md` (to be created in Phase 4):

```markdown
# Kids OpenCode AI Safety Assessment — v[VERSION]

> Engineering record. Refresh on every major release.

## 1. Identification
- Release version: [vX.Y.Z]
- Assessor: [engineer name]
- Review date: [YYYY-MM-DD]
- Review cadence: every major release; minimum quarterly

## 2. Audience served
- Age band: 12+
- Region: AU (V0); add international rows as we expand
- Context: family setting + classroom workshop

## 3. Voluntary AI Safety Standard — 10 guardrails coverage
For each guardrail:
- 1. Accountability process — [who, where documented]
- 2. Risk management — [link to most recent risk assessment]
- 3. Data governance — [data flows + provenance + security posture]
- 4. Test & evaluation — [last red-team test set + results]
- 5. Human oversight — [plan/approve UX + audit log access by parent]
- 6. Inform end-users — [AI disclosure in system prompt + terminal banner]
- 7. Challenge mechanism — [feedback / takedown endpoint]
- 8. Supply chain transparency — [DeepRouter dependency disclosure + provider list]
- 9. Records & third-party assessment — [audit log retention + this document]
- 10. Stakeholder engagement — [last consultation / parent feedback summary]

## 4. eSafety Safety-by-Design principles coverage
- Service provider responsibility — yes; design-time review of every release
- User empowerment & autonomy — yes; plan/approve at every tool use
- Transparency & accountability — yes; this doc + public compliance statement

## 5. Specific risk inventory + mitigation
- Prompt injection — mitigation: [link]; last tested [date]; pass rate [N/N]
- Jailbreak via roleplay — mitigation: [link]; etc.
- Inappropriate content output — mitigation: [link]
- Self-harm signal — mitigation: [link to system prompt rule #10]
- PII leak via tool — mitigation: [link to plugin tool args check]
- Cost runaway — mitigation: [link to platform-backend Stars cap]
- Provider account compromise — mitigation: [link to key rotation procedure]
- ... (one row per concrete failure mode we have considered)

## 6. Open risks accepted
- [risk] — [why we accept it for this release] — [revisit by date]

## 7. Sign-off
- Engineering lead: [name] — [date]
- Compliance officer: [Lightman] — [date]
- Lawyer review for this release: [yes/no — if yes, who and when]
```

### The position

✅ **Design our own; align to Voluntary AI Safety Standard + eSafety Safety by Design.** Template drafted above. Implementing it is a Phase 4 task; first version due before V0 launch.

### What a lawyer still needs to confirm

> "Confirm a self-designed AI safety assessment aligned to Voluntary AI Safety Standard + eSafety Safety by Design is appropriate evidence of due diligence for a kid-AI operator. If yes, suggest signature / record-keeping practices."

Estimated lawyer time: 1 hour.

---

## AU-8 — Anthropic "Organizations Serving Minors" approval

### The question

Apply for explicit approval from Anthropic to operate as an "organisation serving minors" under their AUP.

### The reasoning

Anthropic's [support article 9307344](https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors) lays out requirements for organisations serving minors but does not, as far as currently published, describe a formal pre-approval or registration process. Their model is:

- You are operating under their AUP and must comply
- They reserve the right to audit
- Non-compliance → suspension or termination

This is more like "agree to the terms, comply, be ready for audit" than "apply for permission."

What's useful to do:

1. **Email Anthropic's compliance / partnerships team** describing Kids OpenCode and the safeguards we have in place. Even if no formal approval exists, getting on their radar as a constructive kid-product builder reduces friction if there's ever an enforcement question.
2. **Document our compliance posture comprehensively** in this directory so we can produce it on demand for an Anthropic audit.
3. **Track Anthropic's public guidance updates** — the article is currently version-dated; subscribe to changes.
4. **If Anthropic opens a formal program** (similar to OpenAI's "Trusted Partners" or similar), apply on day one.

The same logic applies to **OpenAI**: their Under-18 API Guidance currently has no formal approval path either. Be visible, be auditable, be the operator they would point to as "the right way to do it."

### The position

✅ **Proactive outreach, not formal approval.** Action plan:

1. Lightman emails Anthropic compliance / sales at `safety@anthropic.com` (or similar) with a 1-page "we are kids-opencode, here's our compliance approach, please consider us a partner organisation." Include link to this directory once public.
2. Same to OpenAI compliance.
3. Same to Doubao / DeepSeek when we route through them (via DeepRouter).
4. Subscribe to provider AUP version notifications.
5. If/when formal kid-operator programs launch, apply immediately.

### What a lawyer still needs to confirm

> "Confirm that proactive outreach with disclosure of compliance posture to Anthropic / OpenAI does not create downstream legal hooks (e.g., implied representations we then have to maintain forever). Recommend phrasing."

Estimated lawyer time: 1 hour. Could be the cheapest item to fold into the broader package.

---

## Total lawyer time estimate

If a single lawyer takes all eight items in one engagement: **11-16 hours**. At Sydney privacy / tech rates that's around A$5,500 – A$8,000. Front-load this in Phase 4 (~weeks 7-8) so the lawyer-confirmed positions are stable before V0 launch.

By way of comparison, asking a lawyer to do this work from a blank slate (no engineering-side preparation) would be 40-60 hours. The reduction is the whole reason this document exists.

---

## Caveats — read once

1. **I am not an Australian lawyer.** Nothing here is legal advice. This document is the engineering-side reasoning a competent operator should produce before showing up to a lawyer.
2. **Final positions must be lawyer-confirmed** on every item except possibly AU-2 (which is a regulatory submission, not a legal posture).
3. **Anthropic and OpenAI terms change.** Re-check both AUPs every quarter; on any material change, refresh this document.
4. **The COPC is currently in draft.** When the final Code is registered in December 2026, revisit the entire `au.md` audit and this document for alignment with final wording.
5. **AU statutes are amended frequently.** The Privacy Act has been amended substantially in each of 2022, 2023, 2024. Treat citations in this document as accurate to 2026-05-15 only.

---

## Revision history

| Version | Date | Author | Note |
|---|---|---|---|
| 0.1 | 2026-05-15 | Engineering (Claude assist) | Initial draft. Substantive engineering-side answers to AU-1..AU-8 with citation back to primary sources. Pending qualified-AU-lawyer review on each. |
