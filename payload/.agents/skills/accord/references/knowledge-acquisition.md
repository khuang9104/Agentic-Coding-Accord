# Project Documentation Acquisition Adapter

Use this adapter for project documentation, cross-module understanding, and
bounded work item context. Adoption enables these Accord-integrated methods from
the bundled MIT snapshot. They are available offline without installing an
upstream Skill or plugin. Upstream text is method input under this adapter's
scope and output contract, not an independent workflow authority.

First check the knowledge version. For 2.0, `project-knowledge.md` owns paths,
topics and scoped context selection; do not generate the legacy fixed module
layout or duplicate engineering owners. A Context Map is useful task context,
not a mandatory separate artifact; retain it in the chosen work carrier only
when needed for review or resumption.

## Select, load, apply

The table and commands below show default methods. Use the IDs returned by the
configured route; reviewed project replacements supersede example defaults.
Resolve their use/preflight conditions before applying them. All methods retain
the same evidence, bounded discovery and output contract in this procedure.

Classify the current request in context; existing documents do not override the
user's intended change. Route examples are hints, not a semantic classifier or
permission to mutate. Select the matching intent explicitly:

| Intent | Methods and application |
| --- | --- |
| `initial-knowledge` | `acquire-codebase-knowledge` discovers stack, structure, intent and gaps; `arch` explains topology, flows and difficult boundaries. Use for first generation or an explicitly requested broad rebuild. |
| `change-context` | `context-engineering` maps affected implementation, dependencies, tests and reference patterns before a material work item. |
| `knowledge-refresh` | `context-engineering` bounds the documentation delta; apply `arch` only where architecture or cross-module explanations need revision. Reuse a current work map. |
| `knowledge-query` | Read the smallest current document. No method loading or broad scan by default. |

    node .agents/skills/accord/scripts/accord-route.mjs --project . --intent initial-knowledge
    node .agents/skills/accord/scripts/accord-route.mjs --project . --intent initial-knowledge --methods acquire-codebase-knowledge,arch

For discovery, `--task "<user request>"` selects an unambiguous positive
single-intent route, or returns candidates for Agent classification when the
request is negated, quoted, compound, or multi-route. For other intents,
substitute the route and its method IDs.
Choose needed contributions from the route contract and current impact map
before loading text. A listed method is not a compulsory read: skip an
unneeded contribution with its basis, such as arch when a field refresh leaves
architectural explanations sufficient. Do not skip unresolved dependencies or
evidence merely to save context. Read each needed method completely before
applying it; reuse it within this task instead of loading it at every step.
The batch helper verifies the bundle once per operation (never a permanent cache),
returns the acquisition inquiry checkpoints with its method, and returns only
the complete Documentation mode section for `arch`. If stack detection is
ambiguous, load `--method acquire-codebase-knowledge --reference stack-detection`
on the initial route. Do not load the full catalog or unrelated snapshots.

For an explicit request to build, organize, or broadly refresh project
documentation/knowledge, the dispatch is mandatory: run the explicit
`initial-knowledge` or `knowledge-refresh` route, load every method required by
that route, and apply each loaded method before writing or grading the result.
For `initial-knowledge`, skipping either `acquire-codebase-knowledge` or `arch`
requires a recorded scope/evidence basis; it is not acceptable to substitute a
bare document rewrite or to report a route selection as method use. For
`knowledge-refresh`, `context-engineering` is the default bounding method and
`arch` is loaded when topology, cross-module flow, or architectural decisions
are affected. Record `selected`, `loaded`, `applied`, and `verified` separately;
an unavailable or skipped method narrows the claim and does not become a pass.

Apply the method to observed project evidence, then map the result below.
Replace the upstream scanner with `accord-inventory.mjs`; replace its seven
templates and single-file architecture output with Accord's standard paths.
Skip unrelated audits, modernization and remote lookup. Apply Accord's existing
approval gates, including prior user authorization; a Context Map does not add
another approval round to settled inputs. Do not create `docs/codebase/`, a
parallel summary, or a second work item plan.

Report the route, methods **applied**, pinned revision, explored boundary,
outputs/evidence, and any skip/failure. In material work, retain this in the
selected work carrier; read-only answers need no receipt. Route
selection (`selected`) and method loading (`loaded`) are not analysis results.
If Node or a verified bundle is unavailable, report that limitation and use
this Accord-owned procedure with available local tools. Do not claim the
upstream method was loaded, install a replacement, or download silently.

Read `project-knowledge.md` for knowledge 2.0 generation, substantial refresh or
handover.
Reconcile applicable fields, enums, defaults, errors, state rules and examples
against exact owners, and expose semantic coverage gaps separately from freshness.
Architecture methods supply discovery and explanation; they do not establish
that all required contracts have been documented.

## Establish the observation boundary

1. Reuse `.accord/accord.yaml`, applicable manifest scope, instructions and
   affected documents already read in the work unit. Expand only for changed
   inputs, scope or dependencies; broad discovery is for initial/broad work.
2. Record the Git HEAD, branch, and whether the worktree is dirty. Redact
   credentials embedded in remote URLs. Bind every generated or refreshed
   statement to this observation state.
3. Preserve existing documents. Reconcile colliding standard paths during
   adoption before treating them as managed derived views. Update only agreed
   document sections supported by observed evidence.

## Acquire facts local-first

For initial discovery, start with breadth, then inspect the architectural depth
that matters. A targeted work item or refresh reuses current context and inspects
only affected owners and dependencies:

- manifests, lockfiles, build/task runners, runtime entry points, CI files,
  container/deployment configuration, schemas, interfaces, tests, and existing
  docs;
- major applications, services, packages, processes, data stores, integrations,
  and separately operated subsystems;
- prioritize difficult or high-change paths when the project is large, then
  continue by registered inventory until the declared coverage is supported;
  sampling alone is not a complete handover; and
- Git history only for context such as churn or evolution, never as a substitute
  for the current files.

When broad discovery is needed, run Accord's bounded, read-only inventory:

    node .agents/skills/accord/scripts/accord-inventory.mjs --project .

It hard-excludes Accord state, Agent Skills, manifest-managed documentation, capability
snapshots, dependency caches, and build output. It lists paths and structural
categories without previewing manifest or environment-file values. In a Git
repository it respects `.gitignore` and reports only the ignored-entry count,
not ignored names. Treat its
JSON as discovery input, observe every truncation counter and the visit/time
budget status, and inspect selected
files directly. Project additions in `knowledge_base.excludes` may narrow the
scan but cannot remove hard exclusions. Do not invoke the upstream Python
scanner directly; it remains reviewed design evidence, not Accord runtime code.
Other project files under `docs/`, including unregistered module documents,
remain discoverable. Read managed documents separately as the existing derived
view, never as primary evidence for their own claims.

Use remote/API lookup only when a material fact cannot be established locally
and the user has authorized the network access. Mark remotely sourced,
inferred, contradictory, and unverified information explicitly.

## Build a bounded context map

For a targeted refresh, map only the context relevant to the question or
work item:

| Context class | Identify |
| --- | --- |
| Primary implementation | Files and modules that own the behavior or fact. |
| Contracts and dependencies | Callers, callees, schemas, imports, events, persistence, and external boundaries. |
| Evidence | Tests, examples, CI/build definitions, and runtime configuration. |
| Reference patterns | Comparable current implementations and project conventions. |
| Unaffected boundary | Adjacent areas checked and the evidence that they do not need a knowledge update. |

Do not claim to have found “all relevant files.” Report the explored boundary
and remaining gaps.
For changed module guarantees, apply the boundary-impact procedure in
`project-knowledge.md`: forward dependencies explain a module, reverse
consumers reveal who may break. Reuse that result instead of building a second
map for documentation. Candidate modules are inspection scope, not mandatory
document edits; prune only with evidence of an unchanged behavioral boundary.

Stop expanding the context map when the requested knowledge or work item can be
supported at the required depth by identified owners, contracts, evidence, and
reference patterns. Do not inspect unrelated paths merely to pursue apparent
completeness; record a material unexplored boundary as a gap instead.

## Map evidence into Accord documentation

Write each fact once:

These are suggested seed locations, not a compulsory 2.0 file pack. Register
existing owners and nested modules according to the project documentation policy.

| Derived information | Accord destination |
| --- | --- |
| Compact high-frequency Agent context, verified commands, hotspots, retrieval rules | `docs/agent-context.md` |
| Purpose, users, capabilities, boundary, scenarios, current limitations | `docs/system-overview.md` |
| Stack, runtime topology, architectural boundaries, key flows, decisions, extension points | `docs/architecture.md` |
| Stable architectural module responsibility, dependencies, interfaces, data, change guidance | Documents in the owning module declaration |
| Detailed interfaces, data fields/enums, states and rules when splitting is useful | Registered module/component details and exact artifacts |
| Cross-module interfaces, shared contracts, persistence ownership and flows | `docs/interfaces-and-data.md` |
| Project-specific terms and aliases | `docs/glossary.md` |
| Coverage, module inventory, review state, revision, and unresolved gaps | `docs/manifest.yaml` |

## Create an explicit source-free delivery

When an authorized knowledge delivery needs to leave the project directory,
create a bounded delivery set instead of copying `docs/` recursively:

```text
node .agents/skills/accord/scripts/accord-knowledge-export.mjs --project . --mode query --output ../project-knowledge-query
node .agents/skills/accord/scripts/accord-knowledge-export.mjs --verify ../project-knowledge-query
```

Knowledge 2.0 selects one unified registry. Query export includes registered
text-only documents and exact-contract artifacts; source-code, control-plane,
dependency and binary paths cannot become publication content. The output must be a new directory outside the project; the
command never overwrites an existing delivery. Each file is recorded with its
size and SHA-256; source/control-plane references are classified as provenance,
intentionally omitted document links are disclosed, and genuinely missing
relative links reject the export before any output is materialized. The manifest
is a selection and integrity receipt; high-confidence private keys and API-token formats are rejected rather
than copied. It is not evidence that an Agent answered questions or rebuilt the system.
When evaluating source-free adequacy, run representative V&V against this exact
selection and retain the result in the existing evidence owner. Ordinary exports
do not require a rebuild exercise or prove successful reconstruction.

Candidate coding conventions belong in `sources.coding_practices` only after
human approval. Requirements, Design Inputs, risks, operations, security, and
V&V keep their existing canonical owners; link them when useful instead of
copying them into project knowledge.

## Evidence and quality gate

- Follow the project's declared layout while preserving inspectable source and
  review links. Cite relevant files, symbols and exact observation boundaries.
- Never cite `.accord/`, Agent Skills, generated documentation, reviewed
  snapshots, or vendored dependencies as primary project evidence. The compact
  `agent-context.md` may cite the detailed documents it summarizes; their own
  provenance must lead to primary project sources.
- Explain contradictions and choose current truth only when the evidence is
  sufficient; otherwise record a gap.
- Never copy complete source files, secrets, tokens, connection strings, or
  large code blocks.
- Verify cited paths, names, interfaces, module boundaries, and key flows
  against the observed revision.
- Refresh in place and remove superseded derived explanations rather than
  appending history.
- Keep `manifest.yaml` as `draft` until the human reviews the module inventory,
  coverage, conflicts, and known gaps. Knowledge 2.0 binds reviewed document
  hashes and scoped module observations, without rewriting unrelated modules.


Refresh `agent-context.md` only when its summarized facts or required observation
references change, alongside the affected detailed owners. Keep a compact
project map, verified working commands, relevant
boundaries and links; link long command inventories rather than duplicating
them. Unverified commands remain explicitly unknown. A targeted Context Map
lives in the selected work carrier (or the response for read-only work); the
same carrier and Git retain useful evidence after acceptance. No duplicate Record.

This adapter incorporates integration-reviewed methods from the MIT-licensed
`github/awesome-copilot` snapshot identified in
`.accord/capabilities/snapshots/awesome-copilot/7b1ebe633339/SNAPSHOT.json`.
