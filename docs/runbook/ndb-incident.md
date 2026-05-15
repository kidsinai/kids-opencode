# Runbook — Notifiable Data Breach (NDB) incident

> Operational runbook for a suspected data-breach incident affecting Kids OpenCode / Airbotix Kids in AI. Covers the Notifiable Data Breaches scheme under Part IIIC of the Privacy Act 1988 (Cth). **Not legal advice.**
>
> **Time horizon**: notification to OAIC and affected individuals must occur "as soon as practicable" and no later than 30 days after first awareness, IF the breach is an "eligible data breach" (likely to result in serious harm).
>
> For kids' data, serious-harm presumption applies. Default to notify; let the lawyer talk you down if appropriate.

---

## Owners

| Role | Person | Coverage |
|---|---|---|
| **Incident commander** | Lightman | 24/7 mobile available; final decision authority |
| **On-call engineer** | rotating; see oncall.airbotix.ai | Containment and forensics |
| **External lawyer** | [TO ASSIGN — qualified AU privacy lawyer] | Decision on "eligible breach" classification; drafts external comms |
| **Family communications** | Lightman | Authors family-facing notification (lawyer-reviewed) |
| **Regulator communications** | Lightman | Files OAIC notification (lawyer-reviewed) |

Contact list (kept current in 1Password vault `airbotix-oncall`, mirrored to a printed copy in Lightman's emergency folder):
- security@airbotix.ai (alias to on-call)
- lawyer's direct mobile
- cyber-insurance broker direct mobile
- DeepRouter on-call
- AWS Support tier (production)
- Anthropic / OpenAI compliance contact emails

---

## Phase 1 — Awareness (T0)

> "T0" = the moment any person at Airbotix becomes aware of a possible breach.

**Triggers for entering this runbook:**

- A user (kid or parent) reports their account / data is exposed
- A monitoring alert: unusual data egress, unauthorised API access, suspicious DeepRouter request log entries, etc.
- A bug report that reveals a privacy-affecting defect already in production
- A researcher reports a vulnerability (responsible disclosure)
- A third party (AWS, Anthropic, OpenAI, DeepRouter, a journalist) notifies us
- A leak appears publicly (paste sites, social media, etc.)

**Immediate actions, in this order:**

1. Whoever observes → email `security@airbotix.ai` AND directly notify Lightman by phone within 30 minutes. **Do not delay for working hours.**
2. The on-call engineer acknowledges the ticket within 30 minutes of the email.
3. **Do not** discuss the incident outside `security@airbotix.ai` recipients. No Slack #general posts, no tweets, no LinkedIn updates.
4. Open a private incident channel (e.g., Signal group `incident-NNNN`). Add only: incident commander, on-call engineer, lawyer (when engaged). Do not add senior staff for visibility; this is need-to-know.
5. Start an incident log (just a markdown file or shared Notion page) with first entry: timestamp, observed indicators, source of report.

**Do NOT yet:**
- Public-disclose anything
- Tell potentially affected families (premature speculation could create more harm)
- Run irreversible cleanup (deleting suspect logs would destroy forensics)

---

## Phase 2 — Containment (T0 + 4 hours target)

> Goal: stop the bleeding without destroying evidence.

The on-call engineer:

1. **Identify the affected systems**: platform-backend? DeepRouter? a leaked OAuth credential? a leaked DeepRouter tenant key?
2. **Revoke compromised credentials**:
   - If a DeepRouter tenant key is suspect → rotate that key immediately; revoke old via DeepRouter admin
   - If a platform-backend session token is suspect → invalidate all sessions for the affected user(s)
   - If an AWS IAM key is suspect → disable + rotate via AWS console
   - If a code repo access token is suspect → revoke from GitHub
3. **Snapshot forensic state**:
   - For AWS resources: EBS snapshots of affected EC2 hosts; copy current Postgres state to a tagged backup
   - For DeepRouter: export the relevant request log slice (timestamp range + tenant filter)
   - For platform-backend audit log: export the relevant slice
4. **Preserve evidence** in an immutable location: S3 bucket with object-lock enabled, named `airbotix-incident-NNNN`; access only to incident commander + lawyer
5. **Notify upstream dependencies** if their data is implicated:
   - DeepRouter team (if a request log breach)
   - Anthropic / OpenAI (if upstream provider data is in scope)
   - AWS Support (if AWS-managed resources are compromised)
6. Update the incident log every 30 minutes during active containment.

**Containment is not "incident resolved."** The next phase decides whether this is a notifiable breach.

---

## Phase 3 — Assessment (T0 + 24 hours target)

> Lightman + lawyer conduct this jointly. Goal: classify the incident.

Questions to answer (write the answers in the incident log):

### Was personal information involved?

Personal information under the Privacy Act 1988 includes name, address, telephone, email, biometric, opinions, photos, audit logs tied to an identifiable individual, etc.

For Kids OpenCode specifically:
- Parent email + phone → yes
- Kid profile (age band, course pack progress) → yes (when linked to family)
- Audit log entries (tool calls + summaries) → yes (linked to family)
- DeepRouter request log (prompts + completions) → yes if a kid prompt contains identifiable info
- Kid-authored code → not by itself, but if it contains identifying details (name, school) → yes
- Payment data → handled by Airwallex, **not stored by us** → likely no

If no personal information → not a "data breach" under Part IIIC. Document and close.

### How many individuals are affected?

Count families + individual kid profiles. Single-family incidents are easier to handle than scaled breaches.

### Are kids' data involved?

If yes → **default presumption: serious harm is likely**. Kids are a vulnerable population for whom OAIC has signalled tighter enforcement. Do not try to argue this away without strong lawyer support.

### Is this an "eligible data breach"?

An eligible data breach is one where:
1. There is unauthorised access to, unauthorised disclosure of, or loss of personal information held by us, AND
2. A reasonable person would conclude that the access / disclosure / loss is likely to result in serious harm to an individual to whom the information relates.

**For kid product, default → yes.**

Edge cases worth documenting:
- A leak that is contained (e.g., we discovered a misconfigured S3 bucket before any unauthorised party found it) — may not be "eligible" depending on duration of exposure and severity of misconfig
- A leak under a "remedial action" exception (Part IIIC permits us to avoid notification if we take action that prevents serious harm) — lawyer-only decision; document the basis

### Lawyer decision memo

Lawyer produces a written memo recording:
- Facts established
- Whether eligible breach (yes/no/borderline)
- If yes: what notifications are required, to whom, by when
- If no: why not, kept on file in case OAIC asks

This memo is privileged; keep it confidential.

---

## Phase 4 — Decision (T0 + 72 hours target)

> Incident commander, on lawyer advice, decides notification scope.

### If "eligible breach" = yes:

- Notify the OAIC. Use the OAIC's online form: https://www.oaic.gov.au/privacy/notifiable-data-breaches/notify-the-oaic
- Notify the affected individuals (families). Methods, in priority order:
  1. Direct email to the parent's registered address — most cases
  2. Direct phone call — if a small number of high-severity cases
  3. Public statement on airbotix.ai/security/notice — if email is impractical at scale

### If "eligible breach" = no:

- File the lawyer memo confirming the decision
- Internal post-mortem still occurs
- Voluntary disclosure to affected individuals may still be appropriate even if not legally required

### If unclear:

- Notify anyway. The cost of over-notification is reputation; the cost of under-notification is a regulator finding plus a private statutory tort claim per AU-6.

---

## Phase 5 — Notification

### To OAIC

Required content (per Part IIIC):
- Identity and contact details of Airbotix Pty Ltd
- Description of the eligible data breach
- The kind of information involved
- Recommendations for the steps individuals should take in response

Use OAIC's online form. Save the submission reference number in the incident log.

Subject line for any follow-up email: `NDB notification — Airbotix Pty Ltd — incident NNNN`.

### To affected families

Template — adapt per incident:

> Subject: Important notice about your Kids OpenCode account
>
> Dear [parent name],
>
> We're writing because of a privacy incident that affected your account.
>
> **What happened.** On [date] we became aware that [plain-English description of incident]. We acted to stop the issue within [time], and we've now reviewed what happened.
>
> **What information was affected.** [List specifically — e.g., "your email address and your child's age band were exposed in a log file that was accessible from the internet for [duration]"]. **Importantly**: [list of what was NOT affected — e.g., "your child's project files were not affected, because Kids OpenCode keeps those on your own computer."]
>
> **What we're doing.** [Concrete actions — e.g., "We've removed the misconfiguration, rotated all affected credentials, and engaged an independent reviewer to confirm there's no further exposure."]
>
> **What you should do.** [Concrete actions for the family — e.g., "We don't think you need to take any action, but please be aware of phishing emails that might mention this incident."]
>
> **More information.** A detailed account is at airbotix.ai/security/notice/[incident-id]. We've notified the OAIC; their reference is [reference]. If you have any questions, please reply to this email or call us on [phone].
>
> We're truly sorry this happened. Privacy of your family's information is fundamental to what we do, and we're committed to learning from this.
>
> [Signed: Lightman, Founder, Airbotix Pty Ltd]

### To DeepRouter, Anthropic, OpenAI, AWS

Notify their compliance / security contacts in writing, even if their data isn't implicated. Reasons:
- They may need to act on their side (e.g., revoke tokens we missed)
- Their compliance audits of us will note whether we notified them
- It's polite and the right thing to do

---

## Phase 6 — Post-incident (T0 + 30 days target)

1. **Public statement** on airbotix.ai/security/notice — if breach was material
2. **Internal post-mortem** (blameless format):
   - Timeline
   - Root cause analysis
   - What detection / containment worked
   - What didn't, and why
   - Concrete action items with owners and dates
3. **Update PLAN.md** if the incident reveals an architectural gap
4. **Update this runbook** if the runbook itself was inadequate
5. **Red-team re-test** to confirm the fix
6. **Notify cyber insurance**: file the claim within their policy window (usually 30-60 days)
7. **Refresh the AI Safety Assessment** (`docs/safety-assessment.md`) — add the incident as a documented R-row

---

## Phase 7 — Records

Every incident (eligible breach or not) gets logged in an immutable record:

- Incident log markdown
- All emails and lawyer memos
- Forensic snapshots in `airbotix-incident-NNNN` S3 bucket
- OAIC submission references
- Post-mortem
- Cyber insurance claim file

Retention: **minimum 7 years from incident closure** (per AU records retention general guidance for privacy matters; lawyer to confirm specific period). Stored in a location accessible only to incident commander + lawyer.

---

## Drill schedule

Run a simulated NDB incident every 12 months. The drill:

- Picks a plausible scenario from the AI Safety Assessment §5 risk inventory
- Walks through Phases 1-6 with mock notifications (no real emails sent)
- Documents friction points and updates this runbook
- Optional: lawyer participates in the drill to refresh their familiarity

Next drill scheduled: **2026-11-15** (6 months before estimated V0 launch maturity).

---

## References

- [Privacy Act 1988 (Cth)](https://www.legislation.gov.au/C2004A03712/latest/text)
- [OAIC — Notifiable Data Breaches scheme](https://www.oaic.gov.au/privacy/notifiable-data-breaches)
- [OAIC — Notify the OAIC of a data breach](https://www.oaic.gov.au/privacy/notifiable-data-breaches/notify-the-oaic)
- Kids OpenCode AU compliance audit: [`../compliance/au.md`](../compliance/au.md)
- Kids OpenCode AI Safety Assessment: [`../safety-assessment.md`](../safety-assessment.md)
- Master compliance doc: `~/Documents/sites/airbotix/docs/product/compliance/minors-compliance.md`

---

## Revision history

| Version | Date | Note |
|---|---|---|
| 0.1 | 2026-05-15 | Engineering-side draft from AU-5 in `au-lawyer-pass.md`. Pending qualified-AU-lawyer review of the templates. Next drill: 2026-11-15. |
