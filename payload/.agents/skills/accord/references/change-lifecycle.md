# Change Lifecycle

Use this procedure for a material engineering mutation. Apply the authority and
risk rules in `risk-and-authority.md`, the need loop when applicable, and Git
controls in `git-control.md`.

## Create and approve

Use `assets/templates/change.md` for one coherent outcome. Assign an upper-case
`CHG-*` ID and use it for both `.accord/changes/<CHG-ID>.md` and the accepted
`.accord/records/<CHG-ID>.yaml`.

Start from the current request. Keep only the scope/delta, relevant inputs and
decisions, bounded impact map and evidence references. Additions preserve
unfinished goals; explicit replacements supersede only the affected target.
Needs and Design Inputs stay in their canonical owners. Reference them instead
of repeating every dimension in the Change and again in the Record.

Use the `change-context` route in `knowledge-acquisition.md` to load the reviewed
`context-engineering` method for the bounded map. Reuse an already observed map
within the same task until scope or evidence changes. Put it in this Change,
not a separate plan file. Record the applied method and source revision in
Capability Use; a route selection alone is not analysis evidence. The 0.9
template uses a JSON array per method: requirement, actual state and basis,
plus evidence for applied/verified/reused. Before execution not-run is valid.
For delivery required contributions need verified or supported reused evidence;
unavailable/skipped contributions must narrow or defer the affected delivery.

For a multi-file refactor, use `refactor-planning.md` with this same map and
Change. For a defect, use `bug-reproduction.md` to preserve the failure evidence
before repair. For substantive document writing, use `documentation-writing.md`.
Load only matching procedures; none adds another plan or approval round.

Keep prompt scaffolding, temporary reasoning, and execution narration out of
canonical sources. The active Change retains only durable scope, decisions,
questions, references, and evidence needed to govern or review the work.

Treat conflicts with existing records as candidate deltas, not automatic
blockers. Ask the human only about unresolved Decision Frontier choices. Human
approval applies to the material delta and important preserved boundaries; it
does not require re-approving every unchanged input.

Do not begin L2-L4 implementation before Design Input Ready and human approval.
Record the base revision; L3-L4 also require a recoverable checkpoint.

## Implement

Stay inside approved scope and compare work with the recorded base. If a new
material need, contract, risk, or trade-off appears, pause the affected work,
record the proposal or question, assess impact and recovery, and return through
intent alignment and Design Input Ready. A test or implementation that reflects
superseded behavior is an affected output to update after approval, not product
authority over the current human direction.

Use Work Units only for real parallel execution. Each has exclusive paths, a
base, dependencies, expected evidence, and integration order.

## Verify, validate, and accept

Verification maps requirements and Design Inputs to evidence. Validation maps
user needs and intended-use scenarios to representative integrated evidence.
Each evidence item names the observed revision.

Use `testing-and-vv.md` for test-stack selection, execution boundaries and
evidence quality. Reuse existing tests and load the browser adapter only for
relevant scenarios with available prerequisites; do not create another V&V pack.

Classify every material check as `passed`, `failed`, `unavailable`, or `not
run`. Preserve the command or method, relevant output, observation boundary,
and limitation. Failed, missing, partial, or truncated evidence never supports
a pass or completion claim.

A review finding identifies the consequence, exact evidence, affected approved
input or behavior, and an actionable resolution. State material uncertainty,
group repeated symptoms with one root cause, and omit generic best-practice
commentary not grounded in project sources or observable impact.

Before acceptance, update affected canonical sources and project knowledge or
record a reasoned no-update conclusion. Use `knowledge-refresh` for an actual
documentation delta; refresh the compact `docs/agent-context.md` when its
derived summary changes. Show exact staged paths and diff,
checks, evidence, limitations, residual risk, and a focused commit proposal.
Follow `commit_mode`; push is separately explicit.

For an interface, data or behavior change, apply `engineering-documents.md` to
update the owner, exact contracts, enums/states, examples and affected consumers
together. Reconcile approved targets with observed implementation; do not leave
superseded rules appended to current prose. Downgrade coverage/reconstruction
claims whose evidence is stale. The no-update conclusion needs a checked
boundary, not simply an unchanged module filename.

Human acceptance does not mean a commit exists. With acceptance but deferred
commit, use `awaiting-archive`, acceptance_basis and archive_basis, retain the
Change and identify the worktree evidence. Do not fabricate a result revision.
After the result commit exists, derive a 0.9 Record from existing input,
decision, V&V and review owners. References may name a durable owner or a file
at a full Git revision; they must survive removal of the active Change.
Record reference fields use an existing project-relative file with optional
`#fragment`, or `git:<full-sha>:path#fragment` for retained historical evidence.
The Record can be committed later; it never names its own future commit.

## Stage and check

`design-input-ready` allows ready inputs without implementation approval.
`approved` onward requires approved inputs, implementation authority_basis and
the Git base/checkpoint. L4 executing stages require execution authority.
`review` onward requires evidence_basis. `accepted` requires a result commit;
`awaiting-archive` records accepted work that cannot yet be archived.
Unknown states fail. These declarations do not authenticate human decisions.

Use `accord-validate.mjs --scope task --change CHG-ID` during work, adding
`--modules id,id` for affected knowledge/dependency closure and `--routes id,id`
for method checks. Use `--scope delivery` for that same scope before handoff.
Without modules, knowledge content is explicitly not checked. Installation
checks and historical `--scope audit` are separate; no arguments retains the
legacy full-audit default. Historical 0.8 Records use their original reader;
migrate only the active Change when adopting 0.9 semantics.
