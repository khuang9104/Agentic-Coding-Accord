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
Knowledge 2.0 registers system documents and hierarchical module declarations.
The editable documentation policy defines required topics, not a fixed file pack.
Review hashes and scoped source observations detect changed inputs; they do not
prove semantic completeness or reconstruction. Use the installed
`references/project-knowledge.md` for the format and focused commands.

## Document Map

| Question | Start here |
| --- | --- |
| Where is the relevant owner? | The registry; `agent-context.md` is optional navigation |
| What is the system and who uses it? | `system-overview.md` |
| How is it structured and how does it run? | `architecture.md` |
| What does each module do? | `modules/README.md` |
| What interfaces and data does it use? | `interfaces-and-data.md` |
| What are the exact fields, enum values, errors or state rules? | The owning module, its registered details and contract artifacts |
| What did the user approve, or leave undecided? | The canonical registry owner, not an inferred implementation fact |
| What do project-specific terms mean? | `glossary.md` |

Requirements, design inputs, V&V evidence, operations, security, and risk remain
in their existing canonical engineering records. Do not duplicate them here.

## Answering Rules

- Answer from the smallest relevant document and name the document used.
- For coding, read the closest owner first; use `agent-context.md` when navigation helps.
- Separate recorded facts from inference.
- If the answer is missing or disputed, state the specific gap. A global draft
  does not invalidate reviewed module facts, nor authorize automatic refresh.
- Load individual module files only when the question concerns that module.

## Knowledge-base Export

Use the unified registry to select documents by module, audience, status and
sensitivity, including necessary referenced context. Needs, inputs and operations
retain their canonical owners in that registry. Normal ingestion excludes the
Agent-only navigation cache; do not copy the whole `docs/` folder or temporary
context maps. The publication manifest carries IDs, hashes, gaps and removals for
the downstream pipeline. Required explanations and links must work without source
access; assess actual sufficiency separately. No additional rebuild pack is required.

## Provenance

Each document records source paths, configuration files, schemas, tests, or
existing documents used to derive its content. Provenance supports later
refresh; it is not a substitute for a self-contained explanation.

| Source path | Contribution |
| --- | --- |
| `replace/with/project/path` | Replace this draft row with an inspected source. |
