# Work carriers, baselines and authority

Use configuration 0.10. Issue/PR or local work are the current carriers.
Migrate retired Change/Record content into current owners and work references,
then remove retired working-tree files; Git retains historical versions.

## Choose a carrier once

Prefer PR-only for a small bounded change, Issue plus linked PRs for substantial
or coordinated work, and a lightweight local record for offline work or durable
handoff. Ordinary answers and trivial edits need no record. One requested
outcome continues across messages. A work item is a delta; a requirement is a
durable target, so do not rename every Change into a Requirement.

Keep current requirements and consequential design conclusions in their Git
owners. Work bodies retain goal, scope, base, important decisions and evidence
references. A PR already carrying those facts needs no duplicate Change or
accepted Record. Partial PRs reference the parent Issue without closing the
whole goal. Closing an Issue does not approve, implement or deploy a requirement.

    node .agents/skills/accord/scripts/accord-work.mjs --project . --modules orders
    node .agents/skills/accord/scripts/accord-work.mjs --github OWNER/REPO --labels module:orders

These are explicit read operations. Local indexes read current work metadata.
`--history` opts into
the local work archive. GitHub queries paginate visible open Issues/PRs, not
their discussion bodies. Failure/limited visibility never means no related
work. Labels are optional project conventions; Accord does not create them.
Avoid a shared current-task pointer. Monitor review age, blocked dependencies
and overlapping work; do not cap historical Issue/PR counts.

## Baselines and evidence

Resolve a shared branch to a commit, retain the task's base plus relevant input
versions, verify the actual integration candidate, and publish knowledge from
the deployed version. These are four contexts, not four mandatory files or
branches. Approved targets can precede implementation. Latest authorized user
direction can change the baseline; reconcile only affected requirements.

    node .agents/skills/accord/scripts/accord-work.mjs --project . --baseline docs/requirements.md

This returns a base commit and hashes, without writing. A local work record
has schema `1.1`, unique `id`, `title`, `state` (`active|blocked|closed`),
`risk`, `modules`, `requirements`, and this `baseline`. Material work records
an inspectable `decision_basis`; L3/L4 additionally needs a resolvable
`checkpoint_revision`, L4 an `execution_basis`. Delivery adds obligations,
shared evidence and a current scope review as defined in `vv-contract.md`.
Each necessary obligation needs valid evidence or justified applicability;
one execution can serve both V purposes. Review is an evidence method.
Historical failures remain inspectable while current repaired evidence can pass.
Human acceptance and semantic sufficiency cannot be established by labels alone.

    node .agents/skills/accord/scripts/accord-validate.mjs --project . --scope delivery --work .accord/work/WORK-ID.json --modules orders

Preserve actual worktree evidence when uncommitted; never invent result SHA.
Reuse decisions while their scope and assumptions hold, context while relevant
sources hold, and tests while implementation/assertions/environment match.
Unrelated commits do not reopen decisions. Integration evidence and GitHub
required checks must still match the actual candidate. Approval, acceptance,
commit, merge and deployment are distinct actions.

## Implement and review

Inspect the affected flow, contracts and consumers; reuse still-valid context.
Check existing code, standard/platform facilities and approved dependencies for
the simplest sufficient solution; stop searching when the constraints are met.
For substantial work use small verifiable behavior slices, without mandatory
per-slice records, approvals or commits. A defect within unchanged approved
behavior needs diagnosis and repair, not a new requirements interview.

When actual parallel work is needed, establish write scopes, shared base,
dependencies, evidence and integration responsibility. Review findings must
identify a concrete consequence and supporting evidence. Update changed facts,
contracts, states, examples and consumers together; an unchanged owner needs a
reasoned scope check, not a duplicate rewrite. Report checks as passed, failed,
unavailable or not run against the actual revision. Use the focused testing
procedure for V&V; do not rerun unchanged checks without a reason.

## Configurable authority

`.accord/governance.yaml` has schema `1.0`, mode `delegated|federated`,
`project_owners`, `review_binding: explicit-head-marker`, and `domains`.
Each domain has `id`, `members`, and `modules`; a module belongs to one domain.
Principals are `local:identity` or `github:login`. Local claims cannot authenticate
GitHub review. Use actual identities at adoption, not the default local example.

In delegated mode, module members act within their scope and a project owner
can cover it. Policy/ownership changes, unknown shared scope and L4 execution
need the project authority. In federated mode, every affected independent
domain must approve; project owners have no implicit override. Define a domain
containing `$system` for shared constraints and unknown source paths. Unassigned
independent modules are an error. One member per required domain suffices;
domains may deliberately share members, but each required group is evaluated.

```json
{
  "schema_version": "1.0",
  "mode": "federated",
  "project_owners": ["github:coordinator"],
  "review_binding": "explicit-head-marker",
  "domains": [
    {"id": "orders-domain", "members": ["github:alice"], "modules": ["orders", "refund"]},
    {"id": "checkout-domain", "members": ["github:bob"], "modules": ["checkout"]},
    {"id": "shared-domain", "members": ["github:steward"], "modules": ["$system"]}
  ]
}
```

    node .agents/skills/accord/scripts/accord-governance.mjs --project . --modules orders,checkout

Local mode returns who must decide and explicitly requires verification of the
actual human decision. It does not manufacture a cryptographic approval from
a chat summary, hash or `approved` field. A clear, sufficiently scoped user
instruction is still valid local authority; do not ask for it again.

## Live GitHub review adapter

    node .agents/skills/accord/scripts/accord-governance.mjs --github OWNER/REPO --pr NUMBER --action implementation

This requires an already available/authenticated `gh` CLI and explicitly reads
GitHub. It never installs/authenticates, writes Issues, submits reviews or merges.
It reads policy and ownership from the PR's target SHA; enumerates all changed
and previous rename paths; expands declared reverse consumers; and reads live
reviews. A reviewer grants the chosen action in the same ordinary approval by
including this exact line with the full head SHA:

    Accord-Approve-implementation: FULL_HEAD_SHA APPROVAL_CONTEXT_SHA256

Actions also include `requirements`, `acceptance`, and `execution`; use the
corresponding marker printed by the checker. The context hash binds current
target commit, policy and affected scope, preventing replay against a different
integration base or authority policy. This remote check deliberately requires
a new marker after target movement; unchanged local requirements decisions may
still be reused. It does not equate an unrelated commit with changed user intent.
This is one scoped review, not another approval round.
The marker covers versioned contents, not mutable PR-body claims. Bots, missing
markers, wrong commits and dismissed/changes-requested reviews do not satisfy
approval. Target/head movement during the read requires retry. Incomplete file
pagination or impact metadata fails rather than silently narrowing domains.

Policy changes use the previous trusted policy: A requires project authority;
B requires every existing independent domain, including shared scope. Module
ownership metadata changes use the same conservative authority rule; routine
observation or document-review updates do not. Switching
mode does not erase history; active work re-evaluates affected requirements at
the new policy version. Unknown modes never fall back to A.

CODEOWNERS locates reviewers but does not enforce joint domain approval. This
adapter returns a revision-bound result, not GitHub merge eligibility. If used
as a required check, run it from trusted target code with a read-only token,
bind its result to the checked head, and preserve native stale-review/CI rules.
Do not execute PR-supplied checker code with secrets or let a PR replace its
own required workflow. Configure protected checks in the target repository
explicitly; Accord does not silently install a workflow or change rulesets.
Re-run after review changes or target movement. Merge queue integration must
also validate the actual merge-group candidate. Offline work retains local
authority; unresolved remote gates remain unresolved.
