# Needs and Design Input

Use this procedure for a material new product, feature, behavior, or changed
user need. Do not jump from a vague request directly to architecture or code.

    Current User Direction
      -> Intent Alignment and Baseline Reconciliation
      -> User Need and Intended Use
      -> Functional and Quality Requirements
      -> Interface, Data, Risk, and Operational Constraints
      -> Approved Design Inputs
      -> Architecture and Other Design Outputs
      -> Implementation and Revision-bound Evidence

## Authority and evidence

Within project decisions, the latest explicit human direction owns the target
behavior. Existing approved needs, Design Inputs, documentation, code, schemas,
and tests describe the current baseline. Use them to discover consequences and
preserved boundaries, not to make the user defend a deliberate change.

Do not force a new request into old wording. When direction conflicts with the
baseline, explain the conflict as a candidate delta. An explicit change may
supersede an old input, but consequences inferred by the Agent remain proposals
until approved. Never turn an inference, checklist item, current test, or
existing implementation into a user requirement without human confirmation.

## Align intent before expanding requirements

Read the current request first, then inspect the smallest relevant repository
facts. Summarize, in outcome language:

1. the direct request and problem being solved;
2. the intended user, use context, and observable target outcome;
3. the current state and the requested target state;
4. explicit preserve instructions and non-goals; and
5. the recommended interpretation plus any genuine uncertainty.

Calibrate the interaction:

- for a clear local request, state the interpretation briefly and proceed under
  the applicable authority;
- for a clear material request, perform a bounded impact scan, record the
  explicit instruction as the decision/authority basis and proceed within it;
  ask only about new material choices not already settled by that instruction;
- for ambiguous intent, offer focused interpretations or options before asking
  a Decision Frontier question; and
- for a conflict with an approved input, state what appears to change and why,
  instead of treating the old input as a veto.

Infer everything supported by the request and repository. Ask only what cannot
be inferred reliably and would change observable behavior or acceptance.

## Reconcile the baseline

Classify only affected or important coupled inputs:

| Relation | Meaning |
| --- | --- |
| `preserve` | The current input remains an explicit boundary. |
| `extend` | New behavior is added without changing the existing promise. |
| `modify` | Part of the current behavior or constraint changes. |
| `supersede` | The approved new direction replaces an old input. |
| `unresolved` | A human decision is still required. |

Do not enumerate every unaffected requirement. Record `preserve` only where it
controls scope, coupling, compatibility, or acceptance. Git retains the former
baseline; the active Change owns only the inspectable delta.

After alignment, draft only the dimensions material to the Change:

1. intended users, use context, desired outcome, observable success;
2. normal, boundary, failure, recovery, and material misuse scenarios;
3. scope, non-goals, dependencies, and existing decisions;
4. functional behavior and quality constraints;
5. interfaces, data, state, and ownership boundaries;
6. risk, security, operations, migration, and compatibility when material; and
7. verification, validation, and acceptance evidence.

For each material dimension, provide repository evidence, a recommended
default, or an explicit gap. Explore adjacent consequences and viable options,
but label them as required now, recommended, optional, or not applicable. Do
not invent a requirement to fill a checklist. A dimension is not applicable
only with a stated basis. Ask only questions that cross the Decision Frontier,
using the labels and question budget in `risk-and-authority.md`.

A changed need records the approved User Need and Design Input delta, affected
scenarios, requirements, constraints, scope, risk, and V&V. Existing tests that
encode superseded behavior become affected outputs to revise; they are not a
reason to reject the new direction. Pause only affected implementation until
the revised inputs are approved.

Design Input Ready means intended use, scope, representative scenarios,
contracts, data, decidable requirements, material risks, verification,
validation, and high-impact questions are sufficiently specified. Readiness is
not permission or evidence of execution. The human approves the material delta,
possibly in the original request, not the entire baseline again. Record
the required Git base and checkpoint before affected implementation.

Register existing need, Design Input, decision and issue owners in
`sources.engineering` for retrieval in later sessions. Follow the owner and
approval rules in `engineering-documents.md`; reuse settled sources, do not
create a second baseline or infer approval from implementation. On approval,
replace the affected target text in its owner. Keep not-yet-implemented targets
distinct from the module's observed design until implementation is verified.
