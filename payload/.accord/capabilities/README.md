# Accord Capability Layer

Optional capabilities are bounded workers, not workflow authorities. Accord,
the active Change, approved Design Inputs, V&V, and human decisions retain
precedence. A reviewed candidate is not installed, enabled, or recommended for
this project merely because it is present here.

## Layout

- `routes.yaml` schema 1.3 defaults to seven methods on nine task routes, including
  existing-stack V&V and bounded browser testing. Load only justified methods.
  Schemas 1.0–1.2 keep their reviewed bindings until an approved upgrade.
- `catalog/index.yaml` is the small discovery index. Read it only after an
  explicit Skill request or a demonstrated capability gap.
- `catalog/entries/<id>.yaml` contains the review packet for one candidate.
- `catalog.yaml` is a generated full export; ordinary work must not load it.
- `registry.yaml` contains approved managed Skills in `installed` and optional
  adapted workers in `methods` (schema 1.1). Both start empty. Personal and
  pre-existing Skills remain usable and unmanaged.
- `methods/<id>/method.md` and retained source files exist only when a project
  adopts a replacement worker. They are outside Agent discovery and default context.
- `snapshots/<source>/<ref>/` contains a non-discoverable compressed source
  bundle, bundle digest, per-file digest manifest, provenance, and license.
  These checks detect drift. Upstream authenticity additionally depends on a
  trusted Accord release revision or signed tag.

## Need, Review, and Approval

Use existing project tools and registered Skills first. If a specialized,
repeatable gap remains, describe the gap neutrally and ask whether the user
wants candidates evaluated. If the user names a Skill, evaluate that exact
request; do not treat its mention as installation approval.

For one matching entry, inspect its fit, conflicts, source revision, license,
scripts, tools, dependencies, network/MCP requirements, side effects, output
paths, and Accord constraints. Then present an approval packet containing the
exact candidate, revision, destination, intended use, invocation policy,
outputs, limitations, dependency actions, and registry delta. The user may
decline without blocking work possible with ordinary tools.

Verify or preview the preserved source without a network connection:

    node .agents/skills/accord/scripts/accord-capability-bundle.mjs --verify .accord/capabilities/snapshots/awesome-copilot/7b1ebe633339
    node .agents/skills/accord/scripts/accord-capability-bundle.mjs --preview .accord/capabilities/snapshots/awesome-copilot/7b1ebe633339 <capability-id> --project .

Preview is read-only. Materialization requires the user's explicit approval of
the packet and must use the approval flag:

    node .agents/skills/accord/scripts/accord-capability-bundle.mjs --materialize .accord/capabilities/snapshots/awesome-copilot/7b1ebe633339 <capability-id> --project . --approved

The helper derives `.agents/skills/<capability-id>` from the project
configuration, rejects path/symlink escapes and existing destinations, stages
the files, validates `SKILL.md`, and publishes them atomically. Direct plugin
materialization is rejected because plugin installation is Agent-specific. It
restores the exact reviewed Skill files, license, and provenance from the
bundle; it does not install
dependencies, run the Skill, register it, commit, push, or contact upstream.
Those remain separate actions and authorities. A plugin can be installed only
through a separately reviewed Agent-specific path that supports its format;
this helper never materializes plugins.

Dependency ranges without a lockfile are not a reproducible approval packet.
Before installing any dependency, resolve and review exact versions,
registries, integrity data, install scripts, and the proposed lockfile as a
separate mutation.

After validating an approved project Skill, add its exact immutable source,
approved use, invocation, outputs, dependencies, and constraints to
`registry.yaml`. Use `task-match` only for bounded local capabilities whose
description may safely trigger inside already approved scope. Use
`ask-each-use` for costly, networked, privileged, consequential, or
side-effecting work. Automatic Agent selection never expands authority.

## Integrated Adapters and Unmanaged Skills

Entries marked `integrated-adapter` contribute reviewed methods through
Accord-owned procedures and are not copied into Agent discovery. Follow the
Skill's matching procedure: `accord-route.mjs` selects the
route and loads its methods from the verified offline bundle. The Agent applies
the methods and reports evidence, rather than treating selection as use. Knowledge
acquisition uses Accord's bounded inventory and source-cited architecture
method; Change context uses bounded context mapping. `project-documenter` is an
optional presentation worker only and cannot create a competing canonical
knowledge structure. The document-writing, bug-reproduction and refactor-planning
adapters preserve requested outputs and existing authority; their null output
root and empty output lists prescribe no new files and grant no arbitrary
write scope. Plans and reproduction evidence use an existing Change or the
response, with links to tests and evidence where appropriate.

Testing uses `references/testing-and-vv.md`: ordinary project tests need no
snapshot; the browser method needs an approved scenario and available tools.
No route installs runtimes, browsers or MCP. Writing, reproduction, refactor
and browser packets return reviewed execution excerpts; `--view audit` returns
unchanged upstream instructions for inspection only. `--task` may select an
unambiguous positive single-intent route. A reviewed exact workflow alias may
contain a conjunction (for example, `整理项目文档和知识库`); only that exact
alias is selectable. Negated, quoted, extended compound or multi-route requests
remain candidates, never permission, until the Agent classifies them and selects
justified `--intent` values.

User-installed Skills are not moved, disabled, rewritten, updated, removed, or
auto-registered. When one materially contributes to a Change, record its role,
outputs, limitations, and known provenance. Offer managed adoption only if the
user wants a pinned, portable project copy.

## Update, Replace, or Remove

To bind a different worker to an existing task, follow
`../../.agents/skills/accord/references/project-methods.md`. The Agent prepares
the adapter and comparison evidence; the user approves the source, use and
binding. No edit to Accord's core method list is required. Read the returned
method IDs, not a superseded default in an example. Selection, loading,
application and output verification remain distinct. Missing or drifted methods
do not silently fall back; the task's output owners and permissions stay fixed.

Update checks are read-only. Compare the immutable old and candidate revisions
and repeat source, security, license, dependency, permission, output, and
conflict review. Apply an update or replacement only after explicit approval;
validate the installed copy and registry together. Remove a superseded Skill
from the discoverable root so it cannot continue to trigger. Git preserves the
prior state for recovery. If upstream disappears, the bundled reviewed source
remains available, but external services and package dependencies may not.
