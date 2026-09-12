# Knowledge Query and Refresh

Use this procedure for a project question or a targeted knowledge refresh.

1. Go directly to the smallest relevant explanation; use `docs/README.md` only
   when navigation is needed. Ordinary coding
   starts with `docs/agent-context.md`; a specific factual question may go
   directly to its module or interface explanation, registered exact contract,
   or relevant `sources.engineering` owner. Read only what the question needs.
2. Answer covered facts from the named document. Check the relevant manifest
   observation and dependencies if freshness affects the answer; a global gap
   does not invalidate an unrelated module. Do not run a full audit or report
   every status field for an ordinary question.
3. Inspect cited source only when the answer needs verification or the knowledge
   is stale, missing, disputed, or requested at another revision.
4. Separate recorded facts, inference, and unknowns. Never guess across a gap.

For an authorized refresh, follow the `knowledge-refresh` route in
`knowledge-acquisition.md`. A stale answer alone does not authorize doc edits.
Before a material Change is accepted, update affected sections in place and remove
obsolete derived explanations. If no knowledge content changes, record the
reason once in the Change. Advance an observation only when the matching source
content was actually checked; an unrelated commit needs no metadata-only rewrite.
Requirements, Design Inputs, V&V, operations, security, and
risk remain in their canonical sources and are linked rather than copied.
For changed fields, enums, defaults, state rules or outputs, use the content
contract in `engineering-documents.md`: reconcile the exact artifact, meaning,
examples and consumers, not just the architecture summary. Reset affected
coverage or reconstruction claims when their evidence no longer applies.
For external knowledge-base ingestion, use the detailed documents listed by
the manifest, with review/gap metadata disclosed: system overview, architecture, interfaces/data,
glossary, `modules/<id>.md`, registered module details and exact contract
artifacts. Include README/module indexes as navigation and
the manifest as revision/coverage metadata. `agent-context.md` is a derived
coding cache; exclude it from normal content ingestion to avoid duplicate
answers, or use it separately as a retrieval summary. Do not recursively ingest
all of `docs/`: engineering records retain their own scope and authority.
Source files and temporary Context Maps are not part of this documentation
export. Explanations must stand alone for readers without source access;
provenance remains a trace, not a substitute for the explanation. A reconstruction
delivery additionally selects relevant approved input and environment owners;
follow `engineering-documents.md` without duplicating those sources.

Treat configured document budgets as warnings. Remove duplication and stale
detail before proposing a justified exception. Do not create a new knowledge
document kind without an approved structure-version change.
