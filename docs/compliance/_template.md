# Compliance — `<COUNTRY>` (`<iso2>`)

> Audit / engineering reference for launching **Kids OpenCode** in `<COUNTRY>`. Not legal advice. **Mandatory lawyer review before any product launch in this jurisdiction.**

**Snapshot date**: YYYY-MM-DD
**Last lawyer review**: ❌ pending / ✅ YYYY-MM-DD by `<lawyer or firm>`
**Status**: 🔴 draft / 🟡 engineering audit only / 🟢 lawyer reviewed and current

## 1. Regulatory landscape at a glance

One paragraph: which national + state regulators exist, what kind of regime (statute-based / code-based / sectoral / both), how it treats AI for minors.

## 2. Statutes that bind us

| Statute / instrument | What it controls | In force? | Relevance to Kids OpenCode |
|---|---|---|---|
| _e.g. Privacy Act 1988_ | _Personal info handling_ | ✅ Yes | _High — we collect kid profile data via platform-backend_ |
| ... | | | |

For each: cite the canonical URL, current version date, and any in-flight amendments.

## 3. Regulators

| Body | Scope | Powers (notices / fines / blocks) |
|---|---|---|
| ... | | |

For each, note whether they have done relevant enforcement against AI / kid products in the last 24 months.

## 4. Specific obligations on Kids OpenCode

A table mapping each obligation to where it's implemented:

| Obligation | Cite (statute §) | Implemented in | Owner | Status |
|---|---|---|---|---|
| _e.g. age assurance for kids account creation_ | _COPC s.X_ | `platform-backend/auth/` | platform team | 🟡 designed, not built |

Don't list "we're a good product" claims — every row must be auditable.

## 5. Exemptions / safe harbours we rely on

If the regime has a "primary purpose is education" exemption, or "research/internal/non-commercial" carve-out, document **why we qualify** and **what evidence we keep on hand** (curriculum docs, school MoUs, teacher participation, etc.). Regulators will ask.

## 6. Things this product does that need special care

- Agent autonomy + tool use (Read/Write/Edit/WebFetch) → audit trail under what law
- LLM-generated content → labelling / disclosure obligations
- Code execution in browser iframe → which liability regime applies if kid produces harmful code
- Class Wall / class peer visibility → not social media (claim), but document why

## 7. Open items / TBD lawyer review

| ID | Question | Owner | Deadline |
|---|---|---|---|
| `<CC>-1` | ... | Lightman | V0 -2w |
| ... | | | |

## 8. Implementation responsibility map

Which compliance work lives where:

| Concern | `kids-opencode` (this repo) | `Airbotix-AI/platform-backend` | `deeprouter-ai/deeprouter` |
|---|:--:|:--:|:--:|
| _e.g. content moderation pipeline_ | | | ✅ |
| _e.g. parental consent records_ | | ✅ | |

## 9. What changes if we leave this jurisdiction

Document the data-residency, data-deletion, ongoing-records obligations if we sunset the product locally (e.g., user data deletion timeline, regulator notification).

## 10. Audit-ready evidence we keep on hand

For a regulator notice or eSafety transparency request, we should be able to produce within 7 business days:

- [ ] System prompt versions (git-tagged in `kids-opencode` and `deeprouter-ai`)
- [ ] Moderation hit logs (per-tenant, 90 days hot, 3 years cold; in DeepRouter)
- [ ] Parental consent records (in platform-backend; immutable audit log)
- [ ] AI Safety Assessment doc (this product, latest revision)
- [ ] Incident response runbook
- [ ] Lawyer review record for this file

## 11. Sources

- [Statute / regulator official URLs]
- [Last lawyer memo, if any]
- [Master compliance doc revision reviewed at time of writing]
