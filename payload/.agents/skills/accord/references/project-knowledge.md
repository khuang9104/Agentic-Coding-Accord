# Knowledge 2.0: one corpus, bounded context

Use knowledge 2.0. Retired formats are accepted only by the one-way migration
helper, never by ordinary validation or export. Migrate during an authorized
update, never as a side effect of answering a question. Product facts stay in their owners.

For a reviewed upgrade, `accord-migrate.mjs --project .`
returns proposed metadata, preserved owner IDs and path collisions without
writing. Resolve collisions, merge policies/runtime from the selected release,
and apply configuration and registry versions together. Keep current facts and historical evidence links, remove superseded control
files after conversion, and start new semantic claims as draft.

## Route and inspect

Start from the direct requirement, module, document or source reference.
If it is sufficient, read it directly. Otherwise:

    node .agents/skills/accord/scripts/accord-project.mjs --project . --modules orders --impact

The result selects metadata and document paths, not every document body. Read
relevant owners and use `--query` or `--documents` for additional candidates.
Always obey applicable repository instructions. The declared graph is not a
proof of completeness: independently check actual callers, shared data,
configuration, dynamic registration and deployment whenever guarantees change.
Expand along those findings. Stop when intended behavior, preserved contracts,
consumers, tests and material unknowns are understood. Budget pressure never
justifies hiding a missing boundary. Reuse unchanged sources and decisions.

## Canonical declarations

`docs/manifest.yaml` has schema `2.0`, structure `accord-project-knowledge`,
knowledge_root `docs`, status `draft|current`, system `documents`, and
`module_files`: literal paths to module metadata. Paths may be nested and
existing project files can retain their locations. No compulsory module pack.

Each module has `id`, `parent` (ID or null), `kinds`, `source_paths`,
`depends_on`, `status` (`draft|current`), `gaps`, and `documents`.
`source_paths` are literal files/directories; longest prefix owns a file.
Duplicate owners and parent cycles are invalid; dependency cycles terminate.
A child has a stable identity independent of folder location. Important classes
can be child components; simple private helpers can remain in the file map.
Kinds include `module`, `stateful-component`, `runnable-service` or project kinds.

Every document declares `id`, `path`, `topics`, `refs` (document IDs),
`requirements` (stable requirement IDs), `audience`, `sensitivity`
(`public|internal|restricted`), and `status`
(`draft|approved-target|observed|gap|retired`). Its owning module is inferred
from its declaration; system owners have no module. A reviewed document adds
`review: {sha256, basis}` binding reviewed bytes to an inspectable assessment.
This is a review claim, not authenticated human acceptance. Record applicable
release/version constraints in the document; do not treat latest development
intent as deployed behavior.

Register each owner once. For 2.0, move `sources.engineering` declarations into
this unified registry and remove that old field. Do not move or duplicate
their underlying content merely to migrate metadata. Needs, Design Inputs,
design decisions, exact-contract explanations, tests and operations are all
eligible topics. Executable schemas/types remain exact owners; derive reference
content instead of hand-maintaining another schema. Requirements preserve both
approved targets and explicitly identified implementation gaps.

For exact comparisons, the root manifest may include `exact_contracts`, each
with `id`, `module`, `source`, `artifact`, `format` (`json-schema|openapi-json`)
and `explanation`. Register the artifact and explanation as documents; keep the
executable source outside the document registry. The existing contract reader
compares source and artifact and reports unresolved references separately.
It does not extract arbitrary language or SQL semantics automatically.

## Configurable coverage

`.accord/documentation-policy.yaml` is editable JSON-compatible YAML, schema
`1.0`. Coverage is `all-maintained-files`, detail `importance-based`. Each rule
has a unique `id`, `kinds`, `topics`, and layout
`combined-or-split|separate-topics`; optional `modules`, `min_files` and
`max_files` narrow applicability and file count. All matching rules combine.
To replace a global rule for a module, narrow that global rule's applicability
and add the replacement; no hidden specificity or script execution is used.
Conflicting requirements must be corrected in the policy, not silently ignored.
Modules may declare `not_applicable: [{topic, reason}]` for real semantic
inapplicability; explicit file-count requirements still apply.

The default system topics cover needs, Design Inputs, architecture and system
constraints. Modules cover local/inherited needs, inputs, responsibility,
contracts, source mapping and verification. Stateful components add states,
transitions, invariants and failure recovery; runnable services add operations,
configuration, observability and rollback. Extend these requirements for the
project. Do not generate blank files merely to satisfy a topic or count.

Map all maintained files to responsibilities. `excludes: [{path, reason}]`
accounts for generated/vendor groups explicitly. Git ignores are respected;
ignored sources that matter need an explicit project decision. The generated
file map is not a language-independent class/method semantic analyzer: record
uninspected symbols and important hidden rules as gaps. Complete docs should
support rebuilding the agreed architecture, modules, functions and file
organization, without promising byte-identical code or creating another pack.

Capture source observations using the existing helper:

    node .agents/skills/accord/scripts/accord-scope.mjs --project . --paths src/orders

Store its actual result as the module's `observation`. New/deleted/changed
source files invalidate this scoped observation. Do not advance it without
reviewing the matching changes. Update only affected explanations and reviews.

    node .agents/skills/accord/scripts/accord-project.mjs --project . --validate --modules orders
    node .agents/skills/accord/scripts/accord-validate.mjs --project . --scope task --modules orders

Mechanical validation checks owners, paths, content hashes, topic declarations,
source observations and unmapped files. Scoped checks also follow document
references, report retired targets and inspect referenced owners; they do not
prove semantic completeness.
Draft gaps remain visible. A manifest claimed `current` cannot hide such gaps.
No symbol analysis, independent rebuild or actual user acceptance is inferred.

## Publish for the user's pipeline

    node .agents/skills/accord/scripts/accord-project.mjs --project . --publish --audience operations --release RELEASE-ID

This prints a portable manifest to stdout; it does not publish or write files.
It carries document identity, module, topics, requirement links, status,
sensitivity, references, hashes and review matches, parent/dependency metadata,
module gaps/observations, source revision and the selected release label.
`--previous` accepts a prior manifest stored at a project-relative path and
emits removals for the same project, scope, audience and sensitivity selection,
including updates between release labels. The explicit previous manifest chooses
the stream to update; do not mix separate deployment channels. A release label is not proof that
the checkout matches deployment: use the actual release checkout/configuration.
The pipeline enforces permissions, selects versions, preserves required context
and propagates retirements/removals. Default publication excludes restricted
documents; unresolved context remains explicit. Never include credential values.

The knowledge-export command selects the unified corpus in query mode;
there is no separate reconstruction mode or manually maintained source. The exporter retains source-free checks and receipts. SharePoint,
Copilot Studio, chunking and retrieval implementation remain downstream work.
