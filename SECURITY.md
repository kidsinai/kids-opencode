# Security policy

## Reporting a vulnerability

If you find a security issue in **Kids OpenCode** (the `kids-opencode` CLI, the `@kidsinai/kids-opencode-plugin` npm package, the `install.sh` installer, or any related Airbotix Kids in AI infrastructure), please **email security@airbotix.ai** rather than opening a public GitHub issue.

We aim to:

- Acknowledge your report within **2 business days**
- Provide a triage decision (accepted / not accepted / need more info) within **5 business days**
- Patch confirmed issues within **30 days** for high-severity, **90 days** for medium-severity
- Coordinate public disclosure with you

If you do not receive a reply within 2 business days, please escalate to **lightman@airbotix.ai**.

## What's in scope

Issues we consider security-relevant, in rough priority order:

- **Kid safety failures** — any way to make the AI mentor produce harmful content despite the system prompt and plugin guardrails (especially if reliably reproducible)
- **Tool whitelist bypass** — any way for the agent to invoke shell, run commands, or use a tool we removed from V0
- **Path-guard bypass** — any way to read or write files outside the kid's current project folder
- **WebFetch host-whitelist bypass** — any way to fetch a URL outside the allowed hosts (developer.mozilla.org, web.dev, html.spec.whatwg.org, airbotix.ai)
- **Audit-log tampering** — any way for the agent to disable, mute, or forge audit emission
- **Personal-information exfiltration** — any way for the agent to leak personal info about the kid or family via tool calls
- **install.sh supply-chain integrity** — anything that lets a third party inject malicious content into the install path between airbotix.ai and the user's machine
- **DeepRouter routing bypass** — any way for the agent to make LLM calls outside DeepRouter when in managed mode

## What's out of scope

The following are NOT considered security issues for the purposes of this policy:

- Issues in dependent open-source projects we package or depend on (e.g., upstream `opencode`, `bun`). Please report those to their respective maintainers.
- Bugs that result in the agent simply being unhelpful, rude, or off-topic, without producing harmful output. These belong as regular GitHub issues.
- Social-engineering attacks on Airbotix employees or contractors.
- DOS attacks against airbotix.ai (we have a separate process; email security@airbotix.ai).

## What we ask of you

- Make a **good-faith effort** to avoid privacy violations, destruction of data, or interruption of service during your testing.
- Do not access, store, or share personal data of other users beyond what's strictly necessary to demonstrate the issue.
- Do not exploit the issue in production.
- Give us a reasonable time to fix before public disclosure.

In return:

- We will not pursue legal action against good-faith security research aligned with this policy.
- We credit you publicly (or anonymously, your choice) when the fix is released.

## Bounties

We do not run a paid bounty program at V0 scale. We do publicly thank reporters in the CHANGELOG and on airbotix.ai/security. For high-impact reports affecting kid safety, we may, at our discretion, offer a token of appreciation (Airbotix merchandise, a year of Stars Pack credits, etc.).

## Cryptography

For sensitive reports, you may PGP-encrypt to the security@airbotix.ai key (fingerprint and public key published at airbotix.ai/.well-known/security.txt once V0 is launched).

## Public disclosure timeline (default)

1. **Day 0**: You report to security@airbotix.ai
2. **Day +2**: We acknowledge
3. **Day +5**: Triage decision
4. **Day +30 (high) or +90 (medium)**: Fix is shipped
5. **Day +30 to +90 + 7 days**: Coordinated public disclosure (CHANGELOG entry, blog post, advisory if appropriate)

We can adjust this timeline by mutual agreement for issues that require longer fixes or affect third parties.

## Related documents

- Incident response runbook: [`docs/runbook/ndb-incident.md`](./docs/runbook/ndb-incident.md)
- AI Safety Assessment: [`docs/safety-assessment.md`](./docs/safety-assessment.md)
- Red-team test set: [`docs/red-team.md`](./docs/red-team.md)
- AU compliance audit: [`docs/compliance/au.md`](./docs/compliance/au.md)
