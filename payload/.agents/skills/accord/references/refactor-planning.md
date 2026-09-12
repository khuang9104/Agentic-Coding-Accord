# Refactor Planning Adapter

Use for multi-file or cross-module refactors whose dependency order, preserved
contracts or recovery needs justify a plan. A local rename or trivial cleanup
does not need this method.

Select `refactor-planning` with `accord-route.mjs` and use its returned method
IDs and use/preflight conditions. Defaults are `context-engineering` for a
missing Context Map and `refactor-plan` for sequencing. Reuse sufficient current
context; do not force these defaults over a reviewed project replacement.
Apply the bounded map contract in `knowledge-acquisition.md`. Read each needed
packet completely, once per task.

## Plan inside the existing workflow

- Establish current and target structure, the behavior and contracts to preserve,
  affected owners, hidden coupling and relevant tests. An intended behavior
  change is a Design Input delta, not something to conceal as a refactor.
- Sequence applicable contracts/types, implementations, callers, tests and
  cleanup according to actual dependencies. Do not impose all phases when
  they do not apply. Include checks between risky phases and a proportional
  recovery approach using existing Git controls.
- Put the plan in the current Change's implementation/task sections and reuse
  its context, approvals and evidence. Planning-only work can deliver the plan
  in the response; no separate plan document or Change is required just to plan.
- A planning-only request ends with the plan. If implementation is already
  authorized and applicable Design Inputs are approved, proceed without the
  upstream additional confirmation pause. Ask only for unresolved material
  decisions; the plan itself does not approve new behavior or Git writes.
- Verify preserved behavior with the relevant existing tests and targeted
  checks. Refresh only affected documentation and compact context. Preserve
  one plan of record throughout execution.

Report methods actually applied, source revision, reused context, phase checks
and limitations. A reused current map needs no second scan or method load;
record that reuse rather than claiming a fresh analysis.

An absent legacy route requires a reviewed upgrade before integrated use. If
the verified method is unavailable, report it and continue authorized planning
with this local procedure where possible; do not claim that upstream methods
ran or install replacements silently.
