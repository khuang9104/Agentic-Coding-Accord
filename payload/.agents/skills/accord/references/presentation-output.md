# Optional Project Presentation Adapter

Use this adapter only when the user explicitly requests a project overview in
draw.io, PNG, or Word form. It incorporates the useful rendering components of
the bundled `project-documenter` snapshot without invoking that plugin's
independent repository-discovery and `docs/project-summary.md` workflow.

## Authority and inputs

1. Start from relevant project documents and their scoped review state.
   Rendering requested draft material is allowed when labeled; do not present
   unreviewed claims as accepted truth or automatically rebuild the knowledge.
2. Reuse specified formats, audience and destination; ask only missing material
   choices. Default to
   `docs/presentations/project-overview.md`,
   `docs/presentations/diagrams/<diagram-id>.drawio`, matching `.png` files,
   and `docs/presentations/project-overview.docx`; these are derived outputs,
   not canonical knowledge.
3. A requested format conversion needs no new engineering Change. Creating
   new substantive claims follows the corresponding engineering scope. Installing or
   updating Node.js, npm packages, a browser, draw.io, or any other dependency
   requires a separate explicit decision.

## Generate without a second knowledge model

- Select only diagrams that materially improve understanding: normally system
  context, container/runtime topology, or one difficult component/data flow.
- Derive names, boundaries, interfaces, and relationships from reviewed Accord
  knowledge, then verify them against its cited current sources.
- Do not rescan the repository into the upstream ten-section project summary,
  copy complete source files, or introduce new architectural claims silently.
- Label any information not established by reviewed knowledge as inferred or
  unverified and return it to the knowledge workflow rather than presenting it
  as fact.

## Optional bundled renderers

Resolve renderer files from the `project-documenter` entry's `snapshot_member`
in `.accord/capabilities/catalog/entries/project-documenter.yaml`. Preview the
preserved source through `accord-capability-bundle.mjs`; direct Skill
materialization is intentionally unavailable for plugins. Use only an
Agent-specific installation path whose exact files and destination the user
separately approves. The bundled snapshot preserves the
`drawio` and `md-to-docx` scripts, but their package dependencies are not
bundled. Before execution, inspect the pinned package manifests and report the
exact dependency and side-effect packet. Use the scripts only after the user
approves those dependencies and the output paths. Prefer an already available
local draw.io CLI; browser fallback and its network viewer require separate
approval.

## Verify

- Validate the generated diagram XML and open or render each requested format.
- Check labels, file references, module boundaries, interfaces, and flows
  against the current knowledge revision and cited repository sources.
- Record generated paths, tools and versions, failed renderers, omissions, and
  review evidence in the existing Change, or the response for a standalone render. Never mark presentation output as the
  canonical source of project facts.

This adapter incorporates integration-reviewed components from the
MIT-licensed `github/awesome-copilot` snapshot identified in
`.accord/capabilities/snapshots/awesome-copilot/7b1ebe633339/SNAPSHOT.json`.
