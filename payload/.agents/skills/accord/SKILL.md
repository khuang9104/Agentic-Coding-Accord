---
name: accord
description: Use for material repository changes, reviews, testing, or adoption requiring human-approved needs or Design Inputs, Git controls, V&V evidence, project knowledge, or governed capabilities. Skip ordinary read-only answers and trivial edits unless the user requests Accord.
---

# Accord

Accord connects human intent, approved Design Inputs, implementation and V&V.
The human owns goals, material decisions, installation, Git writes, external
effects and acceptance. Agents work within that authority; Git tracks the work.

Latest human direction owns the target; old inputs, code and tests are a
changeable baseline, not a veto.

## Start and route

Classify first: answer with needed inspection; diagnose without fixing; review
without repairing; change only within approved scope. Switching modes requires
human authority.

Treat one requested outcome across messages as one work unit. Additions preserve
unfinished goals; explicit replacements supersede only their affected scope.
Before material work, identify the outcome and preserve boundaries; inspect Git
and read `.accord/accord.yaml`, the applicable Change and configured practices,
then affected sources. Reuse decisions, context and method packets while their
scope, content and dependencies remain valid. A new message or unrelated commit
does not reset them. No extra session log is required.

Read only matching procedures, completely:

| Trigger | Required procedure |
| --- | --- |
| Accord adoption, partial installation, update or same-project move | `references/adoption-and-update.md` |
| Git missing, bootstrap, baseline, checkpoint, commit, parallel isolation, recovery | `references/git-control.md` |
| New or changed material need, brainstorm, requirements, Design Input Ready | `references/needs-and-design-input.md` |
| Risk, compatibility, approval, or Decision Frontier | `references/risk-and-authority.md` |
| Create, implement, verify, validate, accept, or record a material Change | `references/change-lifecycle.md` |
| Initial documentation, broad refresh, cross-module understanding, Change context | `references/knowledge-acquisition.md` |
| Project question or targeted knowledge refresh | `references/knowledge-query-and-refresh.md` |
| Substantive documentation writing or readability | `references/documentation-writing.md` |
| Defect reproduction, diagnosis, or repair evidence | `references/bug-reproduction.md` |
| Multi-file refactor planning or implementation | `references/refactor-planning.md` |
| Test planning, execution, browser scenarios or V&V evidence | `references/testing-and-vv.md` |
| Skill discovery, review, installation, update, replacement, removal | `references/capability-lifecycle.md` and `.accord/capabilities/README.md` |
| draw.io, PNG, or Word project presentation | `references/presentation-output.md` |

## Non-negotiable gates

- Git is required for Accord-managed material work. Local offline Git is valid;
  a GitHub remote is optional.
- Do not install, initialize Git, configure identity, stage, commit, push,
  change a remote, tag, revert, force, clean, or remove history without human
  authority.
- Before retrying a side effect, inspect current state and establish that
  repetition is safe. Otherwise preserve the failure and request authority.
- Classify semantic impact L0-L4 by the highest triggered consequence. L2-L4
  require approved Design Inputs and a Git base; L3-L4 require a recoverable
  checkpoint; L4 requires explicit execution authority.
- A clear human instruction can supply both a behavior decision and scoped
  implementation authority. Record its basis; do not request the same approval
  again. Unstated consequential choices remain open. Risk controls evidence and
  recovery depth, not the number of confirmation rounds.
- Verification checks approved requirements and Design Inputs. Validation checks
  user needs and intended use in representative integrated conditions. Evidence
  states the revision observed.
- Stay within approved scope. If implementation reveals a new material need,
  contract, risk, or trade-off, pause the affected work and return to the gate.

Use `Known fact:`, `Confirmed decision:`, `Proposal:`, `Assumption:`, and `Open
question:` where relevant. Use `clarification.question_budget.default_batch_size`
(1–3) for blocking questions; infer supported facts and do not re-ask settled decisions.

## Canonical information

Read `sources.coding_practices` before affected coding/review. If `initial`,
inspect existing instructions, docs, tooling, tests and conventions; ask which
practices should migrate. Never rewrite guidance silently.

Use `sources.engineering` for needs, inputs, decisions and issues. Each fact has
one owner; retain durable conclusions and inspectable human decision bases,
not chat transcripts or Agent-approved labels. Profiles organize information,
not compulsory document packs.

## Project documentation and knowledge

`docs/agent-context.md` is the compact first read; manifest-managed explanations
and registered engineering owners supply detail on demand. Use the acquisition
procedure and its `engineering-documents.md` contract for generation/refresh:
record applicable inputs, outputs, fields, enums, state rules and actual design.
Separate approved targets, observed behavior and deviations. Do not duplicate
full source, canonical inputs or V&V.

Use registered paths and real module boundaries; update affected owners in
place or explain no update. Git and Records retain history.
Knowledge 1.4 supports module commit/worktree observations alongside global
review state. Freshness, completeness and reconstruction are separate claims;
see the engineering contract. Soft budgets never justify missing facts.

Use the route procedure; classify first. Docs/knowledge generation or broad
refresh must run `accord-route --intent ...` and satisfy its contributions:
required, conditional, or reused with matching evidence. Explain unavailable
methods; never count them as used. Batch needed packets with `--methods id,id`.
Ordinary questions use current docs. Compound/ambiguous requests stay in
classification. Loading is not use. Keep Context Maps in active Change.

## Optional capabilities

User Skills stay usable and unmanaged. Only configured integrated methods are
enabled; snapshots authorize no upstream execution or installation. Evaluate
candidates for real gaps. Materialization, dependencies, external effects and
replacement retain approval gates; selection cannot expand authority.

For significant failures or requested local improvements, read
`references/project-improvement.md`. Candidates are not active rules.

## Validate and finish

Ordinary questions, reviews and plans end with their requested result; they do
not require a new Change, Record or full audit. For material work, with Node.js:

    node .agents/skills/accord/scripts/accord-validate.mjs --project . --scope task --change CHG-ID --modules affected-module

Use actual IDs and disclose omitted scopes. `installation` checks adoption;
`delivery` checks selected work; `audit` includes history. Details and fields
are in `references/change-lifecycle.md`.

Mechanical checks do not prove intent, facts, V&V sufficiency or human acceptance.

At delivery, synchronize changed facts in their existing owners and report
evidence, limitations and residual risk. Git writes follow existing authority;
push is separate. Human acceptance, commit and archive are distinct. If the
user defers commit, retain the Change as `awaiting-archive` with observed worktree
evidence; never invent a result SHA. After the result commit exists, create a
0.9 reference Record. Old 0.8 Records remain readable without rewriting history.

## Context budget

Records, the full catalog, unrelated references, logs, and snapshots are not
default context. Stop when affected behavior, contracts, precedent, tests, and
unresolved decisions are known; report material unexplored boundaries.
