# Capability Lifecycle

Use this procedure only when the user requests a capability or ordinary tools
and approved Skills leave a real specialized gap. Accord and the active Change
remain authoritative.

The integrated methods on `.accord/capabilities/routes.yaml` are part of
adopted Accord behavior; use the matching procedure in `SKILL.md` for task routing.
This lifecycle governs installing or managing upstream capabilities, not
re-approving a bounded integrated method each time it is read.

For adding or replacing a task implementation, read `project-methods.md`.
It defines the Agent-prepared adapter, project registration, evaluation,
human-approved binding and rollback. The task contract remains internal to Accord.

User-installed personal or project Skills remain usable and unmanaged. Do not
move, disable, update, remove, or register them silently. Record material use,
outputs, limitations, and observed provenance in the Change and Record.

For an Accord-managed capability:

1. state the capability gap without promoting a product;
2. reuse an explicit request to evaluate; otherwise ask whether evaluation is wanted;
3. load only the catalog index and relevant candidate metadata;
4. review the complete pinned source, license, scripts, dependencies, network or
   MCP needs, permissions, side effects, outputs, and Accord conflicts;
5. present the exact source, revision, destination, approved use, invocation,
   outputs, constraints, and separate dependency actions; and
6. install, register, update, replace, disable, or remove only after explicit
   approval of that packet. One explicit decision may cover named installation,
   dependency and use actions together; distinct effects need distinct scope,
   not artificially separate confirmation turns.

If a reviewed capability declares dependency ranges without a lockfile, do not
treat those ranges as a reproducible dependency packet. Before any dependency
installation, resolve and review exact versions, source registries, integrity
data, scripts, and the proposed lockfile as a separate approved mutation.

Use `accord-capability-bundle.mjs --preview ... --project <project-root>` before
approval. Only after approval may `--materialize ... --project <project-root>
--approved` atomically restore a reviewed Skill under the configured project
Skill root. The helper rejects plugins because they require an Agent-specific
reviewed installer. Materialization
does not run the capability, install dependencies, change the registry, commit,
push, or contact upstream; treat each as a separate action.

`task-match` permits automatic selection only for a matching request inside
already approved scope. `ask-each-use` requires a new decision. Neither grants
authority for dependencies, external effects, Git writes, or acceptance.

When an installed capability is invoked, observe its actual registered version,
inputs, outputs, dependencies, and constraints. If it is unavailable, fails, or
returns partial output, report that state and its effect on the task. Do not
silently substitute another capability, broaden permissions, or claim that the
approved output contract was met.

Snapshots preserve reviewed source but are not independent Agent instructions,
recommendations, installations, or proof of upstream authenticity. Bundle and
file hashes detect drift; upstream authenticity depends on obtaining the
Accord release through a trusted revision or signed tag. Pinned Skill trees are
also recomputed against their declared upstream Git tree. Prefer the bundled
offline source. Check for updates read-only; applying an update requires an
exact diff, renewed review, approval, validation, and recoverable Git state.
Remove a superseded capability from Agent discovery.
