# Engineering documentation contract

Use during initial documentation, material refresh, handover or a reconstruction
assessment. A project map is not a complete specification. Build a record of
approved intent and observed behavior usable without source access; do not
promise identical source or unspecified implementation details. Ordinary
questions use the smallest current explanation, not this whole process.

## Register owners before writing

In `sources.engineering`, register existing project-relative files with a unique
`id`, `path`, `kinds` and `modules`. Kinds are `user-needs`, `design-inputs`,
`module-contract`, `decisions`, `issues`, `verification`, and `validation`.
An empty `modules` list means project-wide. A Compact source can own several
kinds. Reuse existing paths and formats; registration does not approve their
contents. If no owner exists, use `assets/templates/engineering-baseline.md`
only when durable content is needed. Do not generate empty records per module.

Keep stable need and Design Input IDs, scope, intended outcome, acceptance
conditions, status and decision basis in those owners. An approved item needs
an inspectable human decision summary or stable reference with who decided,
when, what was accepted and its limits. An Agent-written `approved` label, a
passing test or a tool's claim is not authority. Unresolved choices remain
proposals or questions; superseded inputs leave the current baseline, with
their replacement linked and prior wording retained by Git or existing history.

Maintain separate meanings: **approved target**, **observed implementation**,
and **known deviation**. Never infer approval from legacy code, or describe an
approved but unimplemented change as existing behavior. Record useful decisions
and unresolved issues, not raw conversation, repeated summaries or speculation.

## Required depth, not a required file pack

For each applicable inventory item, supply the following information or an
explicit scoped gap/not-applicable basis. A heading alone is not evidence.

| Item | Content needed without source access |
| --- | --- |
| Function or interaction | Trigger, actors, preconditions, inputs, processing, outputs, errors, cancellation, boundaries and side effects; relevant visible UI states. |
| API, command, event or file | Identifier; every parameter and result field; types, requiredness, defaults, validation, errors, permission rules, ordering, pagination, retries and idempotency where applicable. |
| Data entity | Every persisted field; type, precision, nullability, default, units/timezone; keys, relationships, uniqueness, significant indexes, lifecycle and non-sensitive initialization rules. |
| Enum or state | Every value and its meaning, unknown-value handling, valid and invalid transitions, guards, triggers, effects and terminal states. |
| Algorithm or consistency rule | Formula, rounding, ordering, deduplication, transaction boundary, concurrent conflict and recovery behavior; enough to reproduce externally observable results. |
| Runtime design | Components, dependencies and compatible versions, configuration semantics, build/start order, environment assumptions and external contracts. Never include secret values. |
| Examples and deviations | Normal, boundary and failure inputs/outputs; distinguish verified examples from illustrations; link discrepancies to the target and issue owner. |

Use the existing module document for responsibility, behavior and details that
fit there. Split only when useful, into registered kinds:
`docs/modules/<module-id>/interfaces.md`, `data-model.md`, or `behavior.md`.
Move detailed content to its new owner and leave a link, not a second copy.
The global `interfaces-and-data.md` owns cross-module relationships and shared
contracts; link module-private details instead of reproducing their tables.
Runtime-wide facts live in architecture; module-specific ones live in its owner.
Each detail has the same structured `## Provenance` section as its module.

Machine-readable schemas remain primary executable facts. A registered
`docs/contracts/<module-id>/*.json` artifact is a generated, non-executable
delivery copy, not a second hand-maintained schema. Reference it for exact
fields and constraints and explain meanings/rules in its registered document.
Never copy full application code to satisfy a documentation checklist.

## Discover, extract, reconcile

1. Discover independently of the existing document list: enumerate modules,
   entry points, interfaces, entities, state machines and important runtime or
   algorithm rules. Inspect migrations, producers, consumers and tests as well
   as type declarations. Keep inventory truncation and unknown boundaries.
2. Register stable item IDs and owners in `engineering.coverage.inventory`.
   Preserve omitted/unread items as `unreviewed` or `gap`; do not shrink the
   denominator to what was easy to document. Architecture sampling guides
   reading order, not a whole-project completeness claim.
3. Read details in bounded module batches. Extract exact definitions when
   supported, then compare definitions with runtime validators, serializers,
   storage, consumers, tests and approved inputs. Report conflicts; do not
   silently select the most convenient source or connect to a live database.
4. Write the current explanation once, with exact values and meaning. Test
   examples when an authorized local runtime is available. Unsupported
   extraction permits bounded Agent inspection, not automated proof.
5. Review the inventory against independent project boundaries and the content
   contract above. State unexplored categories and resulting handover limits.

The read-only helper currently supports **JSON Schema in JSON** and **OpenAPI
3.0/3.1 in JSON**. It compares declared JSON properties, values and container
types, including fields, enums, defaults, requiredness and error responses. It
does not execute schemas, evaluate data validity, parse arbitrary source
languages/SQL/YAML, resolve external references, prove runtime behavior, or
certify project-wide coverage. Local unresolvable/external references and nested
schema resource scopes produce `partial`, never a complete comparison. Duplicate
JSON keys, lossy numeric literals and unsafe/same-file source-artifact aliases
are rejected instead of silently normalizing away a material difference.

Example, when these explicit project files exist:

```sh
node .agents/skills/accord/scripts/accord-contracts.mjs --project . --source schemas/order.json --format json-schema --compare docs/contracts/orders/order.json
```

Omit `--compare` to inspect; `--view markdown` renders declared facts for review.
The helper writes nothing. Exit 0 means inspected/matched declarations, 1 means
an error/mismatch, and 2 means partial evidence. Review generated artifacts for
sensitive descriptions and examples before inclusion.

## Manifest structure and scoped review

Retain the fixed overview spine and module IDs from 1.2. The `engineering`
extension has its own `schema_version: "1.0"` and independent dimensions:

| Field | Meaning and checks |
| --- | --- |
| `documents` | Optional unique `{module, kind, path}` details at the registered paths above. |
| `contracts` | Unique `{id, module, format, source, artifact, explanation}`; source and artifact differ, and explanation resolves to a registered document. |
| `coverage` | `status`: `not-assessed`, `partial`, or `reviewed`; `inventory_complete`, module `scope`, inventory, gaps and, for reviewed coverage, `inventory_basis`. |
| `coverage.inventory` | Unique `{id, module, kind, status}`; kinds `interface`, `data`, `state`, `algorithm`, `runtime`, `behavior`. Reviewed entries need `document`, primary `sources`, `review_basis`, and optional resolvable `contract_id`; others need a `reason`. |
| `coverage.gaps` | `{module, reason}` in the declared scope; include the affected information and consequence in the reason. |
| `reconstruction` | `status`: `not-run`, `passed`, `failed`, `unavailable`; module `scope` and linked `evidence`. |
| `reconstruction.evidence` | `{kind, result, environment, isolated, revision, scope, path}`; kind `question-answering` or `rebuild`, full source revision and existing result file. |

`current` is the existing freshness/review state, not a completeness label.
Reviewed coverage requires an independently checked full module inventory,
explained items and no unresolved gap or contract difference. Reconstruction
passes only for explicitly scoped modules with isolated question and rebuild
evidence at the observed source revision. Metadata validation checks declared
links and states; it cannot authenticate human approval or judge semantics.

When `coverage.status` is `reviewed`, each scoped module explanation must also
contain the standard responsibility, capability, boundary, interface, data/state
and dependency sections with substantive content or an explicit scoped gap/not-
applicable statement. This is a shape and completeness guard, not semantic
proof: field correctness, user approval and behavior still require independent
source comparison, V&V and human review. Registered `interfaces`, `data-model`
and `behavior` detail pages have the same guard for at least one substantive
topic section matching their kind; a registration cannot turn a Provenance-only
page into evidence. Reviewed inventory items also need a corresponding
vocabulary cue in their canonical explanation (for example, inputs/outputs for
an interface, fields/types for data, or transitions/guards for state); this cue
is only a missing-detail signal, not a semantic pass.

Migrate 1.2 only after reviewed changes: preserve existing documents, module
IDs and approvals, set config and manifest to 1.3 together, and initialize
coverage as `not-assessed` and reconstruction as `not-run`. Do not reinitialize
project history or imply old documentation passed new checks. The runtime reads
1.2 without this extension; embedding it under 1.2 is an error.

Structure **1.4** keeps the fixed spine and introduces `scopes`, one entry per
reviewed module boundary. Engineering schema **1.1** adds
`coverage.reviewed_modules` and `reconstruction.current_run`. Earlier 1.2/1.3
remain readable; upgrading runtime does not require inventing scoped reviews.

A scope entry contains `module`, `depends_on` (registered module IDs), `sources`
(literal source files/directories, including shared configuration),
`dependency_basis`, `status` (`draft`/`current`), `gaps`, and for current entries
`review_basis`, `observed_at`, `observation`. Resolve dependency closure before
claiming a local result; unknown shared dependencies require expanded inspection.
The mapping is an inspected declaration, not an automatic import-graph proof.

`observation` has `kind` (`commit`/`worktree`), `base_revision`, `digest` and
`file_count`. Capture it read-only with:

```sh
node .agents/skills/accord/scripts/accord-scope.mjs --project . --paths src/orders,schemas/shared.json,package.json
```

Add `--revision <full-sha>` only for a committed observation. The digest covers
the declared paths and their file membership/content, respecting Git ignore for
untracked files and normalizing CRLF text; tracked deletions and new unignored
files change the digest. Ignored dependencies need an explicit alternative
evidence owner, not a completeness claim. Hashing does not approve documents.
To promote a worktree observation to a commit, capture the same paths at that
commit and compare digests; a newer HEAD alone is insufficient.

`reviewed_modules` permits complete inventory claims for declared modules even
when overall coverage is partial. Each needs independently complete inventory,
explained entries, no scoped gaps and matched contracts. Global `known_gaps`
remain visible. Reconstruction evidence adds `run_id` and
`observation_digest`; `current_run` selects the present assessment. A passed
claim requires fresh reviewed scopes and isolated question/rebuild evidence
for every module and its dependency closure. Historical failures remain linked
but do not become results of the current run. Never erase failures to pass.

For a 1.3 → 1.4 migration, preserve documents, inventory and global observations;
start `scopes` and `reviewed_modules` empty. Preserve previous reconstruction
outcomes in the existing V&V owner before initializing the new run as not-run;
retain its references/evidence with a historical run_id. Do not label old
evidence as a new run or invent observation digests. Change manifest/config
structure versions together and engineering schema to 1.1. If historical
evidence cannot be accounted for, retain 1.3 and report the blocked migration.

Use `--modules orders` on validation or knowledge export to select the same
dependency closure. A scoped delivery still includes the common overview spine
and discloses omitted modules; it is not a full-project reconstruction claim.

## Update and deliver

For a change, reconcile target inputs first, implementation facts second, and
revision-bound evidence after validation. Update affected owners, exact
artifacts, examples, callers/consumers, index and compact context together.
Remove obsolete current wording. Leave unrelated modules unchanged. Identical
inputs should preserve content, IDs and file sets; observation metadata changes
only when justified. Detail budgets are soft: deduplicate, then split rather
than dropping a field, enum value or business rule.

Before editing a page, identify its changed fact, stale reference/example or
missing explanation. Checking a consumer does not itself justify changing its
documentation: if the existing explanation remains accurate and sufficient,
keep that page unchanged. Put new regression results and their revisions in the
existing V&V owner, not additional examples, test counts or refresh notes in
every checked module. A deliberately expanded documentation request can justify
new explanations; an ordinary refresh should not accumulate proof-of-work prose.
Keep still-valid examples unless the changed contract or a demonstrated gap
requires revising them. Advance the manifest's scoped observation once; update
an affected summary only when its facts or required observation reference change.

Knowledge-query delivery uses the manifest's detailed documents and registered
contracts, with indexes/manifest as metadata. Reconstruction additionally needs
relevant approved inputs, representative examples and runtime prerequisites
from their existing owners. Select these explicitly; do not export every file
under `docs/`, all Records, private data or source history. Resolve necessary
links inside the delivery set; mark provenance-only source references, external
references and other prerequisites as such. The compact Agent context is a derived cache,
not another knowledge corpus. Use `testing-and-vv.md` for independent assessment;
an unisolated dry run cannot support a source-free reconstruction claim.
