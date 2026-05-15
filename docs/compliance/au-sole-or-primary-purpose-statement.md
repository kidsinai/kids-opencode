# Sole or Primary Purpose Statement — Kids OpenCode

> **Standing instrument under the Online Safety (Age-Restricted Social Media Platforms) Rules 2025 (Cth).** This document records Airbotix's position that Kids OpenCode's sole or primary purpose is education and therefore qualifies for the exemption from the Social Media Minimum Age regime introduced by the Online Safety Amendment (Social Media Minimum Age) Act 2024.

**Issued by**: Airbotix Pty Ltd
**Authorised signatory**: [LIGHTMAN'S FULL NAME], [TITLE]
**Effective from**: 2026-05-15
**Review cycle**: every 6 months, AND on any material product change touching social-feeling features
**Document version**: 0.1 (engineering-side draft, awaiting qualified-AU-lawyer confirmation per AU-1 in [`au-lawyer-pass.md`](./au-lawyer-pass.md))
**Public location (planned)**: `airbotix.ai/compliance/kids-opencode-purpose-statement`

---

## 1. Statement

Airbotix Pty Ltd declares that **Kids OpenCode** (the "Service"), distributed through `airbotix.ai/install/kids` and operated under the `kidsinai/kids-opencode` and `Airbotix-AI/platform-backend` code repositories, has the **sole or primary purpose of education**.

Accordingly, Kids OpenCode is not an "age-restricted social media platform" within the meaning of Part 4A of the Online Safety Act 2021 (as inserted by the Online Safety Amendment (Social Media Minimum Age) Act 2024 and operationalised by the Online Safety (Age-Restricted Social Media Platforms) Rules 2025). The under-16 social-media account restriction does not apply to the Service.

This statement is made in good faith, based on the current design and operation of the Service, and is supported by the evidence enumerated in §3 below.

---

## 2. The legal test

The Online Safety (Age-Restricted Social Media Platforms) Rules 2025 exempt services whose **sole or primary purpose is education** (and a separate carve-out for health support).

Per Department of Infrastructure guidance:

> Under 16s continue to have access to services that are primarily for the purposes of education and health support.

The test is **purpose-based, not feature-based**. The presence or absence of any individual feature does not by itself decide qualification. What controls is the totality of the service's design intent, marketing, user-flow design, and operational practice. A service can include incidental social elements (e.g., a teacher-moderated class wall, peer learning discussions) without ceasing to be primarily educational, provided those elements are subordinate to and bounded by the teaching context.

---

## 3. Evidence that Kids OpenCode is primarily educational

### 3.1 Design intent

Kids OpenCode is built and positioned as a **coding mentor** for children 12 years and older. Every user-facing surface — from the install one-liner served by the airbotix.ai marketing site to the kid-safe system prompt loaded by the agent — frames the Service as a learning environment.

The product PRD (`~/Documents/sites/airbotix/docs/product/prd/kids-opencode-spec.md`) opens with:

> Kids OpenCode 是 Airbotix V0 旗舰产品 —— 公司"AI coding 是下一代通用素养"叙事的直接交付物。

Translation: "Kids OpenCode is Airbotix's V0 flagship product — the direct deliverable of the company's narrative that AI coding is the next generation's universal literacy." Coding literacy is, by definition, an educational outcome.

### 3.2 Mission-based, curriculum-aligned content

Every kid session in Kids OpenCode runs in the context of a **Course Pack** (`course-packs/`), each containing one or more **Missions** with documented **learning objectives**. The V0 Course Pack — "Personal Portfolio Website" — is in `course-packs/portfolio-site/` with three structured missions, each with a `brief.md` (teaching brief) and `acceptance.yml` (completion criteria).

Course Pack design references the **Australian Digital Technologies F-10 Curriculum** (see `~/Documents/sites/airbotix/docs/product/prd/kids-ai-platform-prd.md` §1.4). Curriculum alignment is structural, not aspirational.

### 3.3 Teacher participation is integral

Kids OpenCode supports a Workshop Mode (PLAN.md Phase 5) where:
- A teacher creates a class with a class code
- Kids join via that code
- The teacher console (in `Airbotix-AI/teacher-console`) provides per-kid progress visibility
- The bill flows to the school's credit pool, not the family wallet

Even in the home / family context (the V0 default), parent monitoring is built into the data flow via audit logging. There is no "kid-only, no-adult-in-the-loop" configuration of the Service.

### 3.4 Absence of social-media features

Kids OpenCode V0 ships **none** of the following:

- ❌ Friend graph or follower network
- ❌ Direct messaging between kids
- ❌ Public profile pages
- ❌ Algorithmic content feeds
- ❌ "Likes" or social-comparison metrics on user content
- ❌ Public sharing of kid-authored content
- ❌ Notifications optimised for return visits / engagement
- ❌ Cross-user discovery surfaces

Within the V0 product, kid-authored content (HTML/CSS/JS) **stays on the kid's own machine**. There is no upload to a shared server, no community space, no peer discovery. This is structurally non-social.

A planned V1+ "Class Wall" feature (teacher-moderated per-class exhibition of completed work) introduces a bounded social element. Per §5 below, that feature ships only after a documented architectural review against this Statement.

### 3.5 Distribution channel signals education

Kids OpenCode is distributed via `airbotix.ai`, which is publicly positioned as a K-12 AI and robotics education company:

- The marketing site lists schools partnered with Airbotix
- The pricing model is purpose-tagged (Stars Pack credits for family learning; Workshop credit pool for school deployment)
- The brand mission statement (publicly published) describes Airbotix as building "the K-12 curriculum and platform" for the next generation's AI literacy

There is no general consumer / social network positioning anywhere in our public materials.

### 3.6 Business model alignment

Kids OpenCode does not display advertising and does not sell user data. Revenue comes from:

1. Parent-purchased Stars Pack credits funding LLM usage
2. School / institutional licensing for Workshop Mode

Both revenue streams are predicated on educational value, not attention extraction. There is no commercial incentive to optimise for engagement at the expense of learning.

---

## 4. What we would NOT classify as educational

For honesty and consistency, Airbotix records that the following hypothetical features would, if added, weaken or void this Statement. Adding any of them requires a documented architectural review, lawyer sign-off, and an update to this Statement:

1. Open, cross-class discovery of kid-created content
2. Public profiles with social signals (followers, friend counts, etc.)
3. Direct messaging between kids outside teacher mediation
4. Recommendation algorithms optimising for engagement
5. Off-platform link-out features without classroom curriculum context
6. Notification systems pursuing return visits beyond Mission progress
7. Any monetisation predicated on user-content reach (advertising, sponsored posts, "promote your project" upsells)

The V0 product contains none of these. Any future addition will trigger §5 review.

---

## 5. Ongoing review

This Statement is not a one-time declaration. It must remain accurate to the actual product.

### 5.1 Periodic review

- **Schedule**: every 6 months from Effective from date (next: 2026-11-15)
- **Owner**: Lightman, with engineering team support
- **Output**: a memo confirming or amending this Statement, filed at `docs/compliance/au-purpose-statement-review-YYYY-MM-DD.md`

### 5.2 Triggered review

Any of the following triggers an immediate review independent of the periodic schedule:

- A V1+ release adding any feature on the §4 prohibited list (or anything analogous)
- A regulator request that touches the exemption
- A material amendment to the Online Safety (Age-Restricted Social Media Platforms) Rules 2025
- A material amendment to the Online Safety Act 2021 itself
- A precedent decision by an Australian court that narrows the "primarily education" carve-out

### 5.3 Architecture review checklist for new features

Before a feature that introduces any social-feeling element ships, the team answers:

1. Does this feature primarily serve the teaching outcome of a Course Pack Mission, or does it primarily serve user-to-user social interaction?
2. Is the feature scoped to a class (teacher-moderated) or open to the broader user base?
3. Is the user-to-user interaction friction-free (likes, follows, notifications) or friction-loaded (requires teacher moderation, written feedback only)?
4. Does the feature introduce engagement-optimisation surfaces (streaks, algorithmic feeds, time-on-app metrics)?
5. Does the feature's net effect tip the product's centre of gravity from "learning support" to "social networking"?

If any answer suggests social-network centre-of-gravity, the feature must either be redesigned or this Statement must be revised in consultation with counsel.

---

## 6. Authority

This Statement is issued by Airbotix Pty Ltd under the authority of [LIGHTMAN'S FULL NAME] in their capacity as [TITLE]. It is signed and dated below.

| Signatory | Title | Date | Signature |
|---|---|---|---|
| [LIGHTMAN'S FULL NAME] | [TITLE] | [DATE] | _____________________ |

Reviewing lawyer (when confirmed):

| Name | Firm | Date | Confirmation reference |
|---|---|---|---|
| [LAWYER NAME] | [FIRM NAME] | [DATE] | [memo reference / file] |

---

## 7. Filing location

Once signed, the canonical copy of this Statement lives at:

- This file in the `kidsinai/kids-opencode` repository (engineering source of truth)
- A PDF copy in Airbotix's records (legal source of truth)
- A public summary at `airbotix.ai/compliance/kids-opencode-purpose-statement`

The public summary is what regulators (eSafety, OAIC) will inspect first. It cross-references this internal record by hash.

---

## 8. Revision history

| Version | Date | Note |
|---|---|---|
| 0.1 | 2026-05-15 | Engineering-side draft. Awaiting lawyer confirmation per AU-1 in `au-lawyer-pass.md`. |
