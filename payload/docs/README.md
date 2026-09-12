# Project Documentation and Knowledge

This is the standard entry point for understanding, maintaining, or taking over
the project. It routes Agents to a compact context view or to the smallest
durable document that answers the current question.

## Status and Scope

Check the relevant observation in `manifest.yaml` when freshness or review
status affects the question; report applicable gaps, not every status field.
The knowledge base contains derived project
explanations, not complete source files. Code, configuration, tests, schemas,
and approved engineering inputs remain the primary facts when available.
`current` is a freshness/review state. Structure 1.4 adds module/dependency
observations, including explicitly identified worktree content, and retains
engineering coverage and source-free reconstruction evidence; neither is
implied by having current documents.

## Document Map

| Question | Start here |
| --- | --- |
| What should an Agent load first? | `agent-context.md` |
| What is the system and who uses it? | `system-overview.md` |
| How is it structured and how does it run? | `architecture.md` |
| What does each module do? | `modules/README.md` |
| What interfaces and data does it use? | `interfaces-and-data.md` |
| What are the exact fields, enum values, errors or state rules? | The owning module, its registered details and contract artifacts |
| What did the user approve, or leave undecided? | The relevant owner in `sources.engineering`, not an inferred implementation fact |
| What do project-specific terms mean? | `glossary.md` |

Requirements, design inputs, V&V evidence, operations, security, and risk remain
in their existing canonical engineering records. Do not duplicate them here.

## Answering Rules

- Answer from the smallest relevant document and name the document used.
- For ordinary coding, load `agent-context.md` first, then follow its links.
- Separate recorded facts from inference.
- If the answer is missing or disputed, state the specific gap. A global draft
  does not invalidate reviewed module facts, nor authorize automatic refresh.
- Load individual module files only when the question concerns that module.

## Knowledge-base Export

Use the manifest's declared scope and review state to select `system-overview.md`, `architecture.md`,
`interfaces-and-data.md`, `glossary.md`, registered `modules/<id>.md`, optional
module details and exact contract artifacts for
external knowledge-base content. Keep this README, the module index, and
manifest as navigation and revision metadata. Use `agent-context.md` separately
as a compact retrieval view; normal content ingestion excludes this duplicate
summary. Do not ingest the whole `docs/` folder or temporary Context Maps.
For an engineering reconstruction delivery, also select the necessary approved
input and runtime sources from their existing owners. Required explanations
and links must work without source access; assess actual sufficiency separately.

## Provenance

Each document records source paths, configuration files, schemas, tests, or
existing documents used to derive its content. Provenance supports later
refresh; it is not a substitute for a self-contained explanation.

| Source path | Contribution |
| --- | --- |
| `replace/with/project/path` | Replace this draft row with an inspected source. |
