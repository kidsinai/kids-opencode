# Compliance — by jurisdiction

> Per-country regulatory analysis for **Kids OpenCode** (agentic AI coding tool for kids 12+). Engineering reference; not legal advice. Every V0 launch in a new country must have a lawyer review of the file matching that jurisdiction.

## Why a per-jurisdiction split

The master compliance doc lives at `~/Documents/sites/airbotix/docs/product/compliance/minors-compliance.md` and covers the full Kids in AI platform (creative-web + kids-opencode + platform-backend) across all markets. **That doc is platform-wide and product-agnostic.**

This directory exists because:

1. **kids-opencode is a specific product** (agentic AI coding, not creative image gen) with different threat surfaces — Bash tool, agent autonomy, tool-use sandbox escape, prompt injection, code-as-CSAM-vector. Compliance must say "for this product, do X."
2. **Each jurisdiction has its own statutes, regulators, and enforcement posture**. AU is not US is not EU is not CN. Mixing them blurs which obligation cites which law.
3. **Audience differs per file**. AU file goes to AU lawyer + AU regulator. CN file goes to CN counsel. They should be self-contained, with master-doc references.

## Jurisdictions we track

| Code | Country | Status | V0 market? | Doc | Lawyer reviewed |
|---|---|---|---|---|---|
| `au` | Australia | 🟡 audit + engineering-side substantive answers drafted | ✅ V0 primary | [`au.md`](./au.md), [`au-lawyer-pass.md`](./au-lawyer-pass.md), [`au-sole-or-primary-purpose-statement.md`](./au-sole-or-primary-purpose-statement.md), OAIC: [explainer](./au-oaic-copc-explainer.md) · [**final submission (ready to send)**](./au-oaic-copc-submission-final.md) · [send-day instructions](./au-oaic-copc-send-instructions.md) | ❌ pending (estimated 11-16 lawyer hours; see `au-lawyer-pass.md`) |
| `us` | United States | ⚪ not started | ⏸️ V2+ | _to be created_ | — |
| `eu` | European Union | ⚪ not started | ⏸️ V2+ | _to be created_ | — |
| `uk` | United Kingdom | ⚪ not started | ⏸️ V2+ | _to be created_ | — |
| `cn` | Mainland China | ⚪ not started | ⏸️ V3+ (海外华人 V2+) | _to be created_ | — |
| `sg` | Singapore | ⚪ not started | ⏸️ V2+ (DeepRouter region) | _to be created_ | — |

## How to use these docs

- **Engineers** before implementing a feature touching user data, content moderation, age signals, or AI output: open the file for every active market. Verify your design satisfies each "kids-opencode must do" row. If you're adding a feature that creates a new compliance question, raise it in the doc's "Open items" section before merging.
- **Lawyers** reviewing for a launch: this file is the engineering-side artifact. The master compliance doc has the cross-product context. Treat both together.
- **Auditors** (e.g., eSafety transparency notice, OAIC enquiry, Anthropic compliance audit): every claim about "what we do" should be traceable to either a commit in this repo, a config in `Airbotix-AI/platform-backend`, or a policy in `deeprouter-ai/deeprouter`. The implementation matrix in each file points to the actual code location.

## How to add a new jurisdiction

1. Copy [`_template.md`](./_template.md) to `<iso2>.md` (lowercase ISO 3166-1 alpha-2, e.g. `nz.md` for New Zealand).
2. Add a row to the table above.
3. Fill in §1-§11 per the template. **Do not invent statute names or quote text you have not verified** — leave gaps marked `🔴 TBD` and let a lawyer fill them.
4. Have a qualified local lawyer review before any product launch in that market.
5. Set a calendar reminder to re-review every 6 months or on major regulatory change (whichever first).

## Master references

- Platform-wide compliance: `~/Documents/sites/airbotix/docs/product/compliance/minors-compliance.md` (v0.1, 2026-05-11)
- DeepRouter's role in enforcement (server-side moderation, ZDR injection, audit log, billing): `~/Documents/sites/deeprouter-ai/deeprouter/PLAN.md` Phase 4 ("Content moderation + billing hardening")
- Product PRD: `~/Documents/sites/airbotix/docs/product/prd/kids-opencode-spec.md`

## What this directory does NOT contain

- ❌ Lawyer-drafted ToS / privacy policy / parental consent forms — those live in `Airbotix-AI/airbotix` (marketing site, where they're served publicly)
- ❌ Anthropic / OpenAI / vendor terms summaries — those live in master `minors-compliance.md` §2 (cross-jurisdiction)
- ❌ Implementation status of moderation pipeline — that lives in `deeprouter-ai/deeprouter/PLAN.md` Phase 4 and `kids-opencode/PLAN.md` Phase 4
