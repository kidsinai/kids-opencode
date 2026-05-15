# Submission to OAIC on the Exposure Draft of the Children's Online Privacy Code 2026

> **Status**: ready to send. Paste into an email body (or attach as PDF) to **`copc@oaic.gov.au`** with subject **"Submission — Draft Children's Online Privacy Code — Airbotix Kids in AI"** by **COB Friday 5 June 2026**.
>
> See the companion explainer at [`au-oaic-copc-explainer.md`](./au-oaic-copc-explainer.md) for what this submission is and why we're filing.

---

**To:** Office of the Australian Information Commissioner
**Email:** copc@oaic.gov.au
**Re:** Public consultation — Exposure Draft of the Privacy (Children's Online Privacy) Code 2026
**Date:** 4 June 2026
**From:** Airbotix Pty Ltd (trading as Airbotix and Kids in AI)
**Author:** Lightman, Founder
**Contact:** lightman@jiangren.com.au
**Submission status:** ☒ For public release

---

## 1. About this submission

We thank the Office of the Australian Information Commissioner for the opportunity to comment on the Exposure Draft of the Children's Online Privacy Code 2026 (the Code).

Airbotix is a small Australian education company building AI-assisted coding curriculum for primary and secondary students, in partnership with AU schools. In 2026 we are launching **Kids OpenCode**, a kid-safe command-line AI coding mentor distributed via `airbotix.ai/install/kids`, designed primarily for kids 12 years and older.

Kids OpenCode is a textbook "service likely to be accessed by children" within the scope of the draft Code. We have studied the Exposure Draft in detail and welcome the OAIC's effort to give children's online privacy the dedicated treatment it deserves. Below we offer practical comments from the perspective of a small Australian operator launching a kid-AI product *under* the Code, not from the perspective of an incumbent platform retrofitting an existing product.

We have prepared a detailed engineering-side compliance audit referencing the draft Code, which we are happy to share with the OAIC on request.

---

## 2. Position summary

In one page:

1. **We strongly support** the Code's "best interests of the child" overarching standard, the default-private rule, and the data minimisation requirement. These align with how we have designed our product.
2. **We support, with one practical concern,** the age-assurance regime. The "apply child protections to all users → skip age assurance" escape hatch is the right design choice. We urge the OAIC to make that path *explicitly* lower-burden than the risk-based ascertainment path, so small operators are not penalised for choosing the safer-by-default route.
3. **We urge the OAIC to add explicit, proportionate provisions on AI / agentic systems serving children**, separately from generic "automated decision-making" framing. Agentic AI tools — where the system uses tools (read files, fetch URLs, write code) on the kid's behalf — raise unique questions of consent scope and audit trail that generic ADM provisions don't capture.
4. **We urge clarity on the developer-tool / utility-software boundary**. A coding tool is not a social network. Mechanically applying social-media-style restrictions (e.g., on engagement design, on profile creation) to a coding utility would impose cost without meaningful protection.
5. **We strongly support** the prohibition on targeted advertising. Our business model intentionally avoids advertising; we want this to be normative.
6. **We propose** the Code explicitly permit and encourage the *use of server-side moderation gateways* (e.g., where a kid-product operator routes all LLM traffic through a single moderation pipeline) as a recognised compliance mechanism, distinct from per-device controls.
7. **We urge** the Code to recognise that for many small operators, the practical bottleneck to compliance is not engineering capacity but **legal clarity**. Clear examples and safe-harbours in the Explanatory Statement do more for actual child safety than open-ended duties enforced after the fact.

---

## 3. Detailed comments

### 3.1 Scope — "likely to be accessed by children" *or* "primarily concerned with the activities of children"

We support the dual scope. Self-classification under either limb is workable for an operator who designs the product with children in mind from day one. Two specific points:

**3.1.1 A small operator's path to compliance is "be honest about the audience"**. We are explicitly building a kid product and will self-classify. We urge the OAIC to make clear in the Explanatory Statement that **self-classification under either limb does not require a quantitative audience survey** — the operator's design intent and marketing material are sufficient evidence. Otherwise small operators waste resources proving the obvious.

**3.1.2 Clarify "primarily concern the activities of children"** for educational tools that are also used by adults (parents, teachers). Our product is used by a kid, but their parent reads the audit log and their teacher administers the class. Are we "primarily concerned with the activities of children" because the kid is the active user, even though adults are in the data flow? We propose: **yes, if the kid is the intended end-user, even where adults are in supervision / billing / monitoring positions**. The Explanatory Statement should adopt this view explicitly so operators know.

### 3.2 Age assurance

**3.2.1** The escape hatch is the right design. We will use it: kids-opencode applies child protections to all users universally, eliminating the need to ascertain age. We urge the OAIC to make this path **clearly the lighter-touch path** in the final Explanatory Statement. Otherwise small operators are pushed into building age-ascertainment infrastructure (and collecting more personal information) to comply with an obligation they could have skipped.

**3.2.2** For operators that do undertake age ascertainment, "reasonable steps" must remain workable for small operators. We urge the OAIC against importing the UK ICO's prescriptive list of acceptable methods. A risk-based, proportionate standard with regulator-provided examples is preferable to a rigid checklist.

**3.2.3** For age ascertainment, we propose the Explanatory Statement explicitly permit **billing-instrument verification as a parental-consent proxy** (e.g., a parent's credit card or bank transfer providing real-world adult identity verification). This is widely used in COPPA practice in the US and works well for small operators without face-to-face onboarding.

### 3.3 Parental consent

**3.3.1** We support the under-15 boundary for parental consent. It aligns with the existing Privacy Act consent threshold guidance.

**3.3.2** We urge clarity on **what "informed, current, not withdrawn, specific, unambiguous and voluntary" consent looks like in a digital product context**. The Explanatory Statement should provide a worked example. We are happy to provide our parent onboarding flow as an example if helpful.

**3.3.3** The Code is silent on **renewal of consent**. We propose: consent should be considered current for the lifetime of the kid profile, with proactive re-confirmation triggered only when:
- A material change to processing practice occurs;
- The kid turns 18;
- A breach or significant incident occurs.

Continuous re-prompting parents undermines genuine engagement; less is more.

### 3.4 Default-private and data minimisation

We strongly support both. Two practical points:

**3.4.1** "High privacy by default" should be defined relative to the **kid's expectation**, not to platform competitor benchmarks. A coding tool's default should be "your project stays on your device"; a social tool's default should be "your posts go nowhere outside friends". Both are "high privacy" in their context.

**3.4.2** "Strictly necessary" data collection is a strong but operationally vague standard. Suggest the Explanatory Statement adopt **purpose-limitation** language: "collected only to the extent necessary for the stated purpose, with reuse for any other purpose requiring fresh consent." This is implementable and auditable.

### 3.5 Targeted advertising

We strongly support the restrictions. Our business model is paid-by-parents (Stars Pack credits), with no advertising. We propose:

**3.5.1** The Code should explicitly **prohibit profile-building of kids for advertising purposes by third-party partners**, not just direct advertising. Otherwise data brokers will route around the rule via partnership disclosures.

### 3.6 Best interests of the child

This is the right overarching framing. We urge the Explanatory Statement to give **concrete examples of how to conduct a "best-interests assessment"** for common product types: a coding tool, a social tool, a creative tool, an educational platform. Without examples this risks becoming a tick-box compliance exercise without real effect.

### 3.7 Kid data rights — access, deletion, correction

We strongly support enhanced rights for kids and parents. Two practical comments:

**3.7.1** **Time-to-respond.** Adult data requests under APP 12 currently have a 30-day window. We urge the kid version to be **shorter — 14 days** — given that kids and parents both have less patience for bureaucratic delays.

**3.7.2** **Deletion ⇒ propagation downstream.** When a kid (or parent on their behalf) requests deletion, the obligation should explicitly include **downstream service providers** (e.g., the LLM gateway the operator uses, the model providers behind it). Otherwise data lingers across the supply chain. We do this voluntarily; we urge it become law.

### 3.8 Transparency

We support child-friendly privacy policies. A single-document approach (readable by both child and adult) is preferable to separate docs for a small operator. We will produce our policy in plain English at year-9 reading level.

### 3.9 AI / automated decision-making — a gap in the current draft

The current draft does not explicitly address AI / agentic systems. We urge the OAIC to add provisions:

**3.9.1 AI disclosure**. Kid services using LLMs must explicitly disclose this to the kid and family. Aligns with Anthropic's and OpenAI's existing guidance for "organisations serving minors."

**3.9.2 Agentic tool use audit**. Where AI takes actions on behalf of the kid (reads files, fetches URLs, writes code), every tool call should be auditable by the parent in human-readable form. This is the core "agentic" obligation that distinguishes AI coding tools from chat-only AI.

**3.9.3 No training on kid data**. Kid data should not be used to train AI models without separate, explicit, current parental consent. Default should be **opt-out, not opt-in**.

**3.9.4 Server-side moderation as compliance mechanism**. Where an operator routes all LLM traffic through a single moderation gateway (input filter, output filter, audit log, OpenAI Zero Data Retention injection), this should be recognised as a strong compliance posture — distinct from operators that allow direct, unmediated LLM access.

**3.9.5 Bring-your-own-key disclosure**. Where an operator allows families to plug in their own LLM provider keys (bypassing operator-side moderation), the operator must clearly disclose this and the loss of protection.

### 3.10 Nudge techniques

The current draft is silent on engagement design (streaks, loss-aversion notifications, infinite scroll). We urge the Code to **prohibit nudge techniques that exploit cognitive biases in children**, including: variable-reward systems, sleep-disrupting notification cadences, social comparison metrics, and friction-asymmetric account-deletion paths.

This is where many kid products that *claim* to be safe still cause harm. The Code is an opportunity to close it.

### 3.11 Recognising small-operator burden

Compliance with a complex Code is structurally easier for large incumbents than for small operators. We urge:

**3.11.1** **Templates and worked examples** in the Explanatory Statement. Small operators do not have legal teams; they have engineers. Concrete examples (a sample privacy policy, a sample best-interests assessment, a sample consent flow) reduce real-world compliance friction more than open-ended duties.

**3.11.2** **A small-operator engagement channel** at OAIC for clarification questions without triggering enforcement risk. Even an FAQ accumulating regulator answers to common questions over time would be invaluable.

**3.11.3** A reasonable **good-faith grace period** for small operators (e.g., revenue < $3m or active users < 10,000) between Code commencement (10 December 2026) and full enforcement, conditional on documented good-faith efforts and timely correction of issues.

---

## 4. Conclusion

We thank the OAIC for the open consultation and for the rigorous draft. We would welcome:

- A virtual roundtable participation slot during the consultation period
- An opportunity to share our internal best-interests assessment as a worked example
- Continued engagement as the final Code is registered and implemented

We are happy to be contacted at lightman@jiangren.com.au for any clarification.

Yours sincerely,

Lightman
Founder
Airbotix Pty Ltd
