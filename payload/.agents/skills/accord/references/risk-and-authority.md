# Risk and Authority

Use the highest triggered semantic impact, not file type or an average:

| Level | Meaning |
| --- | --- |
| L0 | No engineering-behavior change. |
| L1 | Local and reversible; no contract, data, security, or compatibility impact. |
| L2 | Module behavior, requirement, or internal contract change. |
| L3 | Cross-module architecture, public contract, schema, migration, security, permission, or material compatibility change. |
| L4 | Irreversible or high-consequence production, financial, safety, regulatory, credential, or destructive action. |

Compatibility is material only when existing consumers, stored data,
deployments, or an agreed promise require it. Record a reason when it is not
applicable.

The Decision Frontier requires a human decision for an unresolved material
choice when reasonable answers would change observable behavior, contracts, data,
security, performance, recovery, compatibility, or acceptance. Use `Known
fact:`, `Confirmed decision:`, `Proposal:`, `Assumption:`, and `Open question:`
explicitly where relevant. Use the configured 1–3 blocking questions per batch.
An explicit instruction can already contain the decision and permission to
implement it. Reuse that scoped basis; equivalent implementation details stay
with the Agent. Risk determines investigation, recovery and evidence depth,
not additional approval rounds. Silence, inferred preferences and an Agent's
approved flag are not human authority. New risks reopen only affected work.

Before a side-effecting action, identify its exact target, intended effect,
authority, reversibility or recovery path, and whether a retry is idempotent.
If a result is partial or ambiguous, inspect current state before deciding to
retry, recover, or request further authority. Never replay a potentially
duplicating action merely because its first response was unclear.

L2-L4 require Design Input Ready and an accepted Git base. L3-L4 require design
review and a recoverable checkpoint. L4 also requires explicit execution
authority. A validator can check declared state but cannot infer semantic risk
or replace human approval.
