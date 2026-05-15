# OAIC Children's Online Privacy Code — what it is + what you actually need to do

> Plain-language operator briefing. **You must file a written submission to OAIC by COB Friday 5 June 2026.** This file explains what that means in concrete terms. A draft submission letter is at [`au-oaic-copc-submission-draft.md`](./au-oaic-copc-submission-draft.md).

---

## 1. The 60-second version

The Office of the Australian Information Commissioner (OAIC) is writing a new binding code under the Privacy Act 1988 called the **Children's Online Privacy Code 2026 (COPC)**. By **10 December 2026** this Code becomes law for every online service "likely to be accessed by children" — Kids OpenCode is exactly that.

Before they finalise the wording, they're running a **public consultation** until **5 June 2026**. Anyone — companies, parents, kids, NGOs — can email comments to **`copc@oaic.gov.au`**. The OAIC reads them, possibly amends the draft, then registers the final Code.

**Why bother filing one?** Three reasons:
1. **Shape the wording** in places where the draft is ambiguous or expensive for small kid-tool builders.
2. **Get on the regulator's radar as a constructive operator**, not someone they discover via complaint later.
3. **Build a paper trail** that you engaged with the law-making — useful if there's ever an investigation later and they want to know whether you tried to comply in good faith.

The cost of filing is one document you write and one email. The cost of not filing is nothing immediate — but the final Code will land in December and bind you regardless, possibly with rules that didn't account for your product shape.

---

## 2. What the draft Code actually says (so you know what you're commenting on)

Per the [Baker McKenzie summary](https://www.bakermckenzie.com/en/insight/publications/2026/05/australia-childrens-online-privacy-code-exposure-draft) and the [OAIC consultation page](https://www.oaic.gov.au/engage-with-us/consultations/draft-childrens-online-privacy-code-consultation-for-industry,-civil-society,-academia):

| Provision | What it requires | How it lands on Kids OpenCode |
|---|---|---|
| **Scope** | APP entities providing a service "likely to be accessed by children OR primarily concerned with the activities of children" | ✅ in scope — we're explicitly a kid-targeting service |
| **Age assurance** | "Reasonable steps" to ascertain age before collecting personal info; risk-based. **Escape hatch**: apply child protections to ALL users, then skip age assurance | We'll apply child protections universally — that's the simpler path, and we already do |
| **Parental consent** | Under 15 → parent must consent. Consent must be informed, current, not withdrawn, specific, unambiguous, voluntary. 15-17 → age-appropriate transparency. Adult at 18. | Affects platform-backend onboarding flow more than the CLI itself |
| **Default-private + data minimisation** | "High privacy by default"; collect only "strictly necessary" personal info | ✅ structurally — the CLI doesn't transmit project files; only LLM prompts (which we can't fully avoid) |
| **Targeted advertising to kids** | Severely restricted; requires consent + easy opt-out | ✅ trivial — we have no advertising, business model is Stars Pack |
| **Best interests of the child** | Collection / use / disclosure must be consistent with child's best interests | Standard we already aim for; needs a documented "best interests assessment" |
| **Enhanced kid data rights** | Access, deletion, correction — kid-friendly mechanisms | Platform-backend work; CLI hands off to the cloud side |
| **Child-readable privacy policy** | Either a separate kid version, or one document readable by both kids and adults | Marketing-site work; lawyer-drafted |

What the draft does NOT yet directly address (but might in the final version):
- AI / automated decision-making transparency
- Profiling restrictions
- Nudge-technique prohibitions (anti-engagement-trap design)

**This is where our submission can add value** — argue for clear, proportionate, AI-aware wording.

---

## 3. What "filing a submission" looks like in practice

### Format

- A **written document**, sent by **email to `copc@oaic.gov.au`** by COB Friday 5 June 2026
- Will be **published on the OAIC website by default** (so don't put personal info in it)
- No mandatory question list — you write whatever you want, structured however you want
- No strict word count, but practice is usually 3-15 pages for industry submissions
- You can flag it confidential if you have a real reason; default is public

### What to include

A good industry submission generally has:

1. **Who you are** (one paragraph identifying Airbotix / Kids in AI as a kid-AI operator launching in AU)
2. **Position summary** (3-5 bullets — what you support / oppose / want clarified)
3. **Detailed comments on each section of the draft Code that affects you**, referencing the section/clause number
4. **Specific suggestions** for wording changes where you have them
5. **Operational reality** — what the draft would mean in practice for a small operator
6. **Signed off** by a named person at the org (you, Lightman)

### What to NOT include

- Personal information about identifiable kids, parents, customers
- Confidential business information unless you flag it explicitly
- Stuff that's not about the COPC (this isn't a forum to complain about other laws)

### Roundtable option

OAIC is also running virtual roundtables during the consultation period. These let you speak to OAIC staff directly. Worth registering for if you have schedule space — even just listening to the other industry voices is useful intel. Registration is on the consultation page.

---

## 4. What you (Lightman) personally need to do

| # | Action | Who | By when |
|---|---|---|---|
| 1 | Read the draft submission at [`au-oaic-copc-submission-draft.md`](./au-oaic-copc-submission-draft.md) | Lightman | Today |
| 2 | Polish it — agree / disagree with each point; add your specific operational details where I've left placeholders | Lightman | 2026-05-22 |
| 3 | (Optional but recommended) Have a qualified AU privacy lawyer review the final draft. Should be cheap because the document is short. | Lightman + AU lawyer | 2026-05-29 |
| 4 | Register for at least one virtual roundtable | Lightman | 2026-05-23 |
| 5 | Email the polished document to `copc@oaic.gov.au` with subject line `Submission — Draft Children's Online Privacy Code — Airbotix Kids in AI` | Lightman | **2026-06-05 COB (hard deadline)** |
| 6 | Set calendar reminder for **2026-11-15** to re-read the final Code when OAIC publishes it (about a month before commencement on 10 Dec 2026) and check what changed vs. our submission | Lightman | now |

---

## 5. Why this isn't a "law firm has to do it" thing

Privacy law in Australia uses public consultation as a real mechanism. The OAIC regularly references industry submissions in their explanatory statements when they amend draft text. You don't need a legal seal to submit. What you need is:

- Honest representation of who you are
- Concrete operational reasoning (small-AU-operator perspective on a kid-tool)
- Specific suggestions, not generic "we support privacy" filler

Big tech files these submissions through their legal teams because they're big. Small operators file directly. Both have equal standing.

A lawyer is still useful for:
- Sanity-checking the final language doesn't accidentally commit you to obligations you don't intend
- Strategic framing (what's worth defending vs. what's cheap to concede)

But the lawyer is **not** required to make the submission valid.

---

## 6. Risks of not filing

- Final Code lands in December and you find out then that one of its requirements is structurally hard to meet given your CLI architecture
- OAIC investigators in 2027 ask "did you participate in the consultation?" → "no" reads worse than "yes, here's what we said"
- Other industry voices (Meta, TikTok, Google) **will** file submissions optimised for their products. If small kid-tool operators don't speak up, the final Code is shaped by adversaries.

---

## 7. After 5 June

| Date | What happens |
|---|---|
| 5 June 2026 (today + 21 days) | Consultation closes |
| ~July 2026 | OAIC publishes received submissions on its website |
| August–November 2026 | OAIC revises the draft based on consultation |
| ~November 2026 | Final Code text published |
| **10 December 2026** | Code is registered and becomes binding law |

That last date is when our [`au.md`](./au.md) compliance map gets validated against the actual final wording. Plan to do a full pass through that file in late November once the final Code is public.

---

## 8. Sources

- [OAIC — Draft Children's Online Privacy Code consultation page (industry / civil society / academia)](https://www.oaic.gov.au/engage-with-us/consultations/draft-childrens-online-privacy-code-consultation-for-industry,-civil-society,-academia)
- [OAIC media release — Exposure Draft released 31 March 2026](https://www.oaic.gov.au/news/media-centre/oaic-releases-exposure-draft-of-the-childrens-online-privacy-code)
- [Baker McKenzie — Children's Online Privacy Code Exposure Draft (May 2026)](https://www.bakermckenzie.com/en/insight/publications/2026/05/australia-childrens-online-privacy-code-exposure-draft)
- [DLA Piper Privacy Matters — Australia's exposure draft signals tougher standards (Apr 2026)](https://privacymatters.dlapiper.com/2026/04/australia-exposure-draft-of-childrens-online-privacy-code-signals-tougher-standards/)
- [Privacy Act 1988](https://www.legislation.gov.au/C2004A03712/latest/text)

---

## 9. Revision history

| Version | Date | Note |
|---|---|---|
| 0.1 | 2026-05-15 | Engineering-side briefing on what the OAIC consultation is and how to file. Companion draft submission at `au-oaic-copc-submission-draft.md`. **Not legal advice.** |
