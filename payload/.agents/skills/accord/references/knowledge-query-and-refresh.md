# Knowledge Query and Refresh

Use this procedure for a project question or a targeted knowledge refresh.

1. Go directly to the smallest relevant explanation; use `docs/README.md` only
   when navigation is needed. `docs/agent-context.md` is optional navigation;
   a specific factual question may go
   directly to its module or interface explanation, registered exact contract,
   or relevant canonical owner. In knowledge 2.0 use the unified registry and
   `project-knowledge.md`.
   Read only what the question needs.
2. Answer covered facts from the named document. Check the relevant manifest
   observation and dependencies if freshness affects the answer; a global gap
   does not invalidate an unrelated module. Do not run a full audit or report
   every status field for an ordinary question.
3. Inspect cited source only when the answer needs verification or the knowledge
   is stale, missing, disputed, or requested at another revision.
4. Separate recorded facts, inference, and unknowns. Never guess across a gap.

For an authorized refresh, follow the `knowledge-refresh` route in
`knowledge-acquisition.md`. A stale answer alone does not authorize doc edits.
Before material work is accepted, update affected sections in place and remove
obsolete derived explanations. If no knowledge content changes, record the
reason once in the selected work carrier. Advance an observation only when the matching source
content was actually checked; an unrelated commit needs no metadata-only rewrite.
Requirements, Design Inputs, V&V, operations, security, and
risk remain in their canonical sources and are linked rather than copied.
For changed fields, enums, defaults, state rules or outputs, use the content
contract in `project-knowledge.md`: reconcile the exact artifact, meaning,
examples and consumers, not just the architecture summary. Reset affected
coverage or reconstruction claims when their evidence no longer applies.
For external ingestion, knowledge 2.0 uses the unified publication selection in
`project-knowledge.md`, including needs, inputs, operations and referenced context.
Publish applicable review/gap metadata and deployment versions. Exclude the
Agent-only navigation cache, source files and temporary context maps; do not
recursively ingest `docs/`. Explanations must stand alone without source access.
The one canonical corpus requires no additional rebuild pack.

Treat configured document budgets as warnings. Remove duplication and stale
detail before proposing a justified exception. In 2.0, adjust topic/layout
requirements through the editable policy; ordinary new document kinds do not
require a protocol-version change.
