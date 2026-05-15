# OAIC submission — send-day instructions

> Final operational checklist for emailing `docs/compliance/au-oaic-copc-submission-final.md` to OAIC.
>
> **Hard deadline**: Friday 5 June 2026, close of business (Canberra time, AEST = UTC+10). Aim to send no later than **Thursday 4 June** to leave a 1-day buffer for any last-minute confirmation back-and-forth.

---

## Pre-flight (the day before)

- [ ] Open `docs/compliance/au-oaic-copc-submission-final.md` and re-read it once. Comfortable with every position? Delete anything you don't want to defend later.
- [ ] (Optional but recommended) Send the file to an AU privacy/tech lawyer for a 1-2 hour skim. Even a "no concerns" reply gives you cover.
- [ ] Register for a virtual roundtable: https://www.oaic.gov.au/engage-with-us/consultations/draft-childrens-online-privacy-code-consultation-for-industry,-civil-society,-academia (look for the "register" link on that page; sessions are during the consultation period).
- [ ] Decide: paste in email body, or attach as PDF? Most industry submissions are PDF; OAIC accepts both. PDF reads more "official." Markdown-to-PDF via `pandoc` or just print-to-PDF from your browser/preview.

---

## Sending the email

**From**: lightman@jiangren.com.au
**To**: copc@oaic.gov.au
**Cc**: (consider) lightman@airbotix.ai or a personal address — gives you a sent-confirmation copy in another inbox
**Bcc**: (consider) your AU lawyer if they reviewed
**Subject**:

```
Submission — Draft Children's Online Privacy Code — Airbotix Kids in AI
```

**Body** (paste verbatim, then attach the PDF or paste the submission body below):

```
Dear OAIC,

Please find Airbotix Pty Ltd's submission to the Exposure Draft of the
Children's Online Privacy Code 2026 attached / below.

We confirm this submission may be made publicly available on the OAIC
website.

We would welcome the opportunity to attend a virtual roundtable during
the consultation period; we have separately registered our interest.

Yours sincerely,

Lightman
Founder
Airbotix Pty Ltd
lightman@jiangren.com.au
```

---

## After sending

- [ ] Save a copy of the sent email (mark as "OAIC submission — sent YYYY-MM-DD") in a `compliance/` folder you can pull up two years later
- [ ] Save a PDF copy of the submission alongside, named `oaic-copc-submission-airbotix-2026-06-04.pdf` or similar
- [ ] If you receive a no-reply auto-acknowledgement, archive it with the submission. Save its message-ID.
- [ ] If you don't see any acknowledgement within 2 business days, send a polite chase:
  ```
  Hi OAIC team,

  Following up on our submission sent [date] (subject above) — could you
  confirm receipt? Happy to re-send if needed.

  Best,
  Lightman
  ```
- [ ] Mark `L9` in `airbotix/docs/product/compliance/minors-compliance.md` §7 as ✅
- [ ] Update `kids-opencode/docs/compliance/au.md` §9 row `AU-2` to show submission filed + date
- [ ] Set a calendar reminder for **2026-11-15** to read the OAIC's published response document (they will summarise what changed in the final Code based on consultation input — this is where we find out if any of our suggestions landed)
- [ ] Set a calendar reminder for **2026-12-10** — Code commencement; do a full re-audit of `au.md` against the final Code text

---

## What happens after we send

| Date | What |
|---|---|
| ~end of June 2026 | OAIC publishes received submissions to its website. Ours will appear here: https://www.oaic.gov.au/engage-with-us/consultations/draft-childrens-online-privacy-code-consultation-for-industry,-civil-society,-academia (in the consultation summary section, usually published as a list of named submitters with PDFs) |
| August–November 2026 | OAIC revises the draft based on consultation input |
| ~November 2026 | Final Code text published with an Explanatory Statement summarising what changed and why |
| **10 December 2026** | Code is registered and becomes binding law |
| 10 December 2026 onwards | Compliance against the FINAL wording is what counts. Re-audit `au.md`. |

---

## If something goes wrong on send day

| Problem | Fix |
|---|---|
| Email bounces | Check `copc@oaic.gov.au` is correct (verified 2026-05-15 from OAIC consultation page). If it bounces today, OAIC may have a different address; check https://www.oaic.gov.au/engage-with-us/consultations/draft-childrens-online-privacy-code-consultation-for-industry,-civil-society,-academia for current contact |
| Attachment too large | Submission is ~2,500 words; PDF should be well under 1MB. If you're attaching extra material and hit a limit, prioritise the main submission body in the email body itself |
| You realise after sending you want to change something | Send a follow-up: "Following up on my submission today — a small amendment: …". OAIC explicitly accepts updates during the open consultation period |
| Total disaster — deadline missed | Submissions filed after 5 June may or may not be considered. Send anyway with a brief apology. Many regulators look at late submissions informally even if formally out-of-process |

---

## Reference

- Source draft: [`au-oaic-copc-submission-final.md`](./au-oaic-copc-submission-final.md)
- Master explainer: [`au-oaic-copc-explainer.md`](./au-oaic-copc-explainer.md)
- OAIC consultation page: https://www.oaic.gov.au/engage-with-us/consultations/draft-childrens-online-privacy-code-consultation-for-industry,-civil-society,-academia
