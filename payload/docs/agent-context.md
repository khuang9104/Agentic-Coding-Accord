# Agent Context

This is the compact, high-frequency view for coding Agents. Keep it short and
link to the durable project documents below instead of copying their detail.
Refresh affected summaries alongside the detailed documents before review.

## Current project map

Summarize the system purpose, runtime, entry points, major modules, and external
boundaries. Each item must link to a more detailed document or a source path.

## Working commands

Keep only commands verified in project configuration. Link the full inventory
in `architecture.md`; command discovery does not mean execution or permission.

| Task | Command | Source or document |
| --- | --- | --- |
| Install | Replace with a verified command | `replace/with/project/path` |
| Run | Replace with a verified command | `replace/with/project/path` |
| Test | Replace with a verified command | `replace/with/project/path` |
| Check | Replace with a verified command | `replace/with/project/path` |

## Change hotspots

List stable module boundaries, public contracts, schemas, data stores, and
high-churn or high-consequence areas that an Agent should inspect before an
implementation Change. Link to `modules/`, `architecture.md`, or
`interfaces-and-data.md`.

## Retrieval rules

1. Read this file first for ordinary coding; go directly to relevant docs for a specific question.
2. Load `system-overview.md` only for needed purpose/boundary facts.
3. Load `architecture.md` only for needed runtime, dependency or flow facts.
4. Load the relevant module and interface documents before changing a boundary.
5. For material work, use the applicable Change and its input/evidence references.
   Reuse valid context and decisions; an unrelated message or commit is not a reset.

## Provenance

This view is derived from the durable project documents and verified command
sources. It is a retrieval aid, not a second authority.

| Source path | Contribution |
| --- | --- |
| `replace/with/project/path` | Replace this draft row with an inspected source. |
