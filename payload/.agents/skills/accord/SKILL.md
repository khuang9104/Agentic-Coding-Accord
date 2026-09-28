---
name: accord
description: Use for material repository changes, reviews, testing, or adoption requiring human-approved needs or Design Inputs, Git controls, V&V evidence, project knowledge, or governed capabilities. Skip ordinary read-only answers and trivial edits unless the user requests Accord.
---

# Accord

Accord connects human intent, approved Design Inputs, implementation and V&V.
Latest authorized human direction owns the target; existing inputs and code are
a changeable baseline. Agents choose equivalent internals within that boundary.

## Start small

Classify answer, diagnosis, review or implementation; do not expand authority.
Treat one requested outcome across messages as one work unit. Preserve unfinished
goals and settled decisions unless the user replaces their scope. Before material
work identify outcome/preserve boundaries, inspect Git, read `.accord/accord.yaml`
and configured coding practices, then the closest canonical owners.

Configuration 0.9 uses an Issue/PR or lightweight local work item. Do not create
duplicate process files. Retired formats must be migrated before current work.
Reuse decisions by scope/premises, context by relevant source versions, and tests
by implementation/assertions/environment. Unrelated commits or new messages reset
none of these. No extra session log is required.

Read the procedure for the actual question or next action; previously read,
unchanged instructions remain reusable. Do not load every lifecycle stage merely
because a task eventually includes it.

| Trigger | Procedure |
| --- | --- |
| Adopt, update, partial install or same-project move | `references/adoption-and-update.md` |
| Git bootstrap, checkpoint, commit, isolation or recovery | `references/git-control.md` |
| New/changed material need or Design Inputs | `references/needs-and-design-input.md` |
| Undecided risk, compatibility or authority boundary | `references/risk-and-authority.md` |
| Work carrier, baseline or team/PR authority (configuration 0.9) | `references/team-work.md` |
| Knowledge 2.0 navigation, hierarchy, coverage or publication | `references/project-knowledge.md` |
| Initial/broad discovery or insufficient change context | `references/knowledge-acquisition.md` |
| Direct project query or targeted refresh | `references/knowledge-query-and-refresh.md` |
| Substantive document writing | `references/documentation-writing.md` |
| Defect reproduction or diagnosis | `references/bug-reproduction.md` |
| Multi-file refactor planning | `references/refactor-planning.md` |
| Test planning/execution or V&V | `references/testing-and-vv.md` |
| Capability lifecycle | `references/capability-lifecycle.md` and `.accord/capabilities/README.md` |
| draw.io, PNG or Word presentation | `references/presentation-output.md` |

## Authority and evidence

- Git is required for material work; offline Git is valid, GitHub is optional.
- Human authority controls material decisions, installations, Git initialization,
  identity, commits, pushes, remote changes, tags, destructive/recovery actions,
  external effects and acceptance. Before retrying a side effect inspect its
  result and establish that repetition is safe.
- Classify L0–L4 by the highest actual consequence. L2–L4 require approved Design
  Inputs and a Git base; L3–L4 need a recoverable checkpoint; L4 needs explicit
  execution authority. File count does not determine risk.
- A clear instruction can both decide and authorize its scoped delta. Retain the
  basis; do not ask again. Pause only affected work when a new material choice
  changes behavior, contract, data, security, performance, recovery or acceptance.
- Team policies identify whose decision covers each scope. Local declarations
  cannot authenticate GitHub reviews; use the trusted target-policy adapter when
  remote approval is required. Do not let a proposed policy authorize itself.
- Verification checks approved inputs; validation checks user needs and intended
  use. Both name actual observed revisions and limitations. Labels, hashes and
  passing generated tests do not establish user intent or human acceptance.

Use `Known fact:`, `Confirmed decision:`, `Proposal:`, `Assumption:` and
`Open question:` as applicable. Batch only blocking choices using the configured
1–3 question budget. Never promote an assumption into approval.

## Knowledge and methods

Each fact has one owner. Knowledge 2.0 registers needs, design, operations and
V&V together. Keep durable conclusions
and decision evidence, not transcripts. Read `sources.coding_practices` for
related coding/review; if initial, inspect existing conventions and obtain the
user's choice before migrating them.

Read the closest document first. `docs/agent-context.md` is optional navigation.
Knowledge 2.0 follows `project-knowledge.md`. Update changed facts only. Separate approved targets,
observed behavior, freshness and semantic coverage. Complete knowledge supports
the agreed architecture, modules, functions and file organization, with important
components detailed and ordinary internals indexed; no fixed class document pack.

Metadata selects candidates, not proof of no impact. Independently inspect actual
consumers, shared data, configuration and dynamic boundaries when guarantees
change. Expand until material unknowns are resolved or disclosed. A soft context
budget never excuses missing facts. Keep necessary context in the work carrier
only when useful for review/resumption, without another mandatory map file.

Initial or broad documentation work selects `accord-route --intent ...` and
satisfies required/conditional method contributions. Reuse matching evidence;
load needed packets once with `--methods id,id`. Loading is not applying. Report
unavailable methods and their effect. Ordinary questions need no method bundle.
User Skills remain unmanaged and usable; integrated methods must be configured.
Snapshots and method text grant no installation, Git or external-action authority.
For a significant failure or requested improvement use
`references/project-improvement.md`; candidates are not active rules.

## Finish proportionately

Answers, reviews and plans end with the requested result; no new work record or
audit is required. Material work checks its actual scope, for example:

    node .agents/skills/accord/scripts/accord-validate.mjs --project . --scope task --modules affected-module

Use `--work relative.json` for a local carrier.
`installation` checks adoption, `delivery` checks selected work, `audit` includes
history. Unselected calls perform audit; specify scope explicitly.
Runtime integrity remains checked; do not trust a stale persistent cache.

Synchronize affected owners and report actual checks, missing evidence and
limitations. Acceptance, commit, merge and deployment are distinct. Uncommitted
work retains a base plus observed worktree evidence, never a fabricated result
SHA. PR work needs no duplicate receipt. Full catalogs, unrelated references
and historical logs are not default context.
