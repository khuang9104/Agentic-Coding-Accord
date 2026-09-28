# Agentic Coding Accord

[English](README.md) · [简体中文](README.zh-CN.md)

**A repository-local software engineering protocol and harness for human–agent collaboration.**

Accord connects **requirements and design inputs, module contracts, project knowledge,
verification and validation (V&V), and decision authority** in a versioned engineering
workflow. Humans define objectives, resolve material trade-offs and accept results.
Coding agents analyze, implement and verify within authorized scope, maintaining
traceable engineering evidence.

Supports **Codex and GitHub Copilot in VS Code**. Shared instructions, configurable
documentation policies and local validation tools live in Git, supporting work across
sessions, offline development and optional GitHub integration.

[Capabilities](#core-capabilities) · [Quick start](#quick-start) · [Workflow](#engineering-workflow) · [Project knowledge](#project-documentation-and-knowledge) · [Governance](#collaboration-and-governance) · [Extensions](#methods-and-extensions)

## Core capabilities

| Module | Engineering mechanism | Purpose |
| --- | --- | --- |
| **Requirements and design inputs** | Define behavior, quality constraints, interface contracts and acceptance criteria; link requirements, implementation and evidence | Establish a consistent basis for agent execution and human review |
| **Context and knowledge management** | Route by task, register hierarchical modules and document owners, use dependency analysis to identify affected scope | Load relevant context and maintain development and operations knowledge |
| **Verification and validation** | Verify against design inputs and validate against usage scenarios; bind evidence to Git revisions and input digests | Distinguish implementation conformance, user-need satisfaction and unverified scope |
| **Collaboration and governance** | Use Issues/PRs or local work items; configure delegated or federated decision authority | Define module authority, cross-domain approval and integration responsibilities |

Capabilities are selected for the current task. Questions read relevant sources;
local edits check affected boundaries; cross-module or high-risk work adds the
appropriate design, impact analysis and verification. Decisions and evidence are
reused while their applicability conditions remain valid.

## Quick start

Prerequisites: Git, Node.js, and a coding agent with project file and command access.
Use the official repository or a previously obtained local checkout. The target
project can operate with local Git alone.

### 1. Install or update project configuration

Open the **target project** in Codex or GitHub Copilot Agent mode and submit:

```text
Install or update Accord in this project from the official repository:
https://github.com/khuang9104/Agentic-Coding-Accord

Obtain a separate source checkout, record its full commit, and follow
CONFIGURE_WITH_AGENT.md from that same checkout. Preserve existing project
documents, configuration, Skills and non-Accord Agent instructions.
Apply authorized, conflict-free merges; batch unresolved material conflicts
or authorization gaps. Verify the package and installation using that
checkout's tools. Report versions, provenance, changes, check results
and unfinished work.
```

The Agent merges entry instructions, configures engineering policies and registers
existing project sources. Initial adoption establishes a project knowledge view;
subsequent updates migrate the relevant differences. Git initialization, commits
and dependency installation follow applicable authorization; previously authorized
actions need no repeated confirmation. For offline adoption, replace the URL with
the path to an existing source checkout.

The [installation and update guide](CONFIGURE_WITH_AGENT.md) covers configuration,
migration and provenance verification. See [release metadata](RELEASE.json) for this
checkout's version.

**Optional Copilot plugin:** the [Accord project setup entry](plugins/agentic-coding-accord/README.md)
provides installation, version inspection and update entry points, pinned to a tested
distribution. Plugin updates and target-project updates are separate operations;
the plugin's pinned version may lag behind the default branch. The prompt above
works with both Codex and Copilot.

### 2. Submit an engineering task

Describe the intended behavior, constraints and scope directly:

```text
Add order cancellation before shipment. Keep completed orders unchanged.
Define refund and stock-restoration rules, design inputs and acceptance
scenarios. Ask only about unresolved choices that affect behavior,
then complete implementation and verification.
```

An existing project can start by establishing its knowledge baseline:

```text
Organize project documentation and knowledge. Cover system architecture,
module responsibilities, API contracts, data fields, enums and operations.
Reuse canonical sources, distinguish approved requirements from observed
implementation, and report missing or unverified information.
```

## Engineering workflow

Accord organizes requirements engineering, contract design and V&V into an
iterative workflow:

| Stage | Inputs and outcomes |
| --- | --- |
| Requirements analysis | Identify stakeholders, usage scenarios, intended behavior, scope and material trade-offs |
| Design inputs | Translate agreed requirements into behavior, interfaces, data and quality constraints, with decidable acceptance criteria |
| Implementation | Modify code and related engineering sources within authorized scope; retain deltas and decision bases in the existing work item |
| Verification | Check conformance to requirements and design inputs, retaining test or analysis evidence |
| Validation | Assess whether the integrated result meets user needs in representative usage scenarios |
| Acceptance | Authorized owners review results, evidence and remaining gaps against the actual version |

The workflow adopts the V-model correspondence between requirements, design and
verification activities while supporting incremental implementation and feedback.
Requirement changes reopen affected decisions; existing documentation, code and
tests form a revisable baseline. Acceptance, commit, merge and deployment are
separate events.

Testing follows three checkpoints: define observable criteria, check each
meaningful increment, then review scoped evidence for acceptance. Portable test
assets share a configurable `tests/` root. Impact-based selection and valid
evidence reuse reduce repeated work; one result can support both Verification
and Validation. Missing or stale required evidence remains a delivery gap.

[V&V workflow and evidence contract](payload/.agents/skills/accord/references/vv-contract.md)

## Agent execution model

Short entry instructions route agents to the procedures, knowledge owners and
methods needed for the current task. The agent performs reasoning and engineering
operations; local tools check declared structure, references, content integrity
and evidence states.

```text
Target project
├── AGENTS.md + .github/copilot-instructions.md   Agent entry points
├── .agents/skills/accord/                       Shared protocol, procedures and tools
├── .accord/                                    Configuration, governance, optional local work
└── docs/                                       Knowledge registry, documents and coding practices
```

**Context management.** Select sources by requirement, module or document reference,
then follow parent, dependency and document relationships. Contract changes also
require inspection of consumers, shared data, configuration and dynamic registration.
Completed work and unrelated history stay outside default context. Source inspection
and tests establish relationships beyond the declared graph; unknowns remain explicit.

**Modular design.** Module contracts describe preconditions, guarantees, error
behavior, state transitions and side effects. Agents choose equivalent internal
implementations; decisions affecting externally observable behavior follow the
governance policy. Schemas, types and tests retain exact executable facts, while
documents explain responsibilities, constraints and design rationale.

[Context and impact analysis](payload/.agents/skills/accord/references/project-knowledge.md#route-and-inspect)

## Project documentation and knowledge

Development documentation and operations knowledge share one registry, with one
canonical maintenance location for each fact. Coverage includes systems, modules,
submodules and important components, with detail proportional to engineering significance.

### Organization and coverage

| Source | Content |
| --- | --- |
| Project knowledge registry | Stable document/module identities, paths, references, status, audiences and coverage gaps |
| System documents | User needs, design inputs, architecture, system constraints, interface and data ownership |
| Module/component documents | Responsibilities, contracts, states and errors, dependencies, source mapping, tests and operations |
| Executable contracts and evidence | Schemas, types, tests and V&V results linked to actual versions |
| Coding-context navigation | Optional frequently used commands, key paths and retrieval entry points |

`.accord/documentation-policy.yaml` defines applicable topics by module kind,
combined or separate document layouts, and optional file-count constraints.
`docs/manifest.yaml` registers system documents and hierarchical module metadata.
Existing documents can retain their paths; important classes can be registered
as components, while ordinary internals can be covered through a file index.

The objective is sufficient engineering information to reproduce the agreed
architecture, modules, functionality and file organization. Content evolves with
affected requirements and implementations; Git retains history. Freshness,
semantic coverage and reconstruction validation are assessed separately.

### Operations retrieval and publication

Export a source-free knowledge set from the target project:

```sh
node .agents/skills/accord/scripts/accord-knowledge-export.mjs --project . --mode query --output ../project-knowledge
```

The export contains selected documents and an integrity receipt. For a downstream
SharePoint, Copilot Studio or custom retrieval-agent pipeline, obtain a publication
manifest:

```sh
node .agents/skills/accord/scripts/accord-project.mjs --project . --publish --audience operations
```

The manifest includes stable IDs, content hashes, required references, review states
and omissions. A `--previous` manifest for the same selection identifies removals.
The downstream pipeline handles conversion, indexing, access control and deployment
version binding. Accord does not publish directly to SharePoint.

[Documentation policy and format](payload/.agents/skills/accord/references/project-knowledge.md) · [Query and export](payload/.agents/skills/accord/references/knowledge-query-and-refresh.md)

## Collaboration and governance

Issues/PRs are the preferred work carriers; local work items support offline use.
Requirements and design inputs remain durable engineering assets in their own
sources. Work items record the current delta's objective, scope, decisions and
evidence references. Active work indexes are queried on demand; discussion bodies
from closed work are excluded from default context.

`.accord/governance.yaml` supports two decision-authority models:

| Mode | Authority model | Cross-module changes |
| --- | --- | --- |
| **Delegated governance** `delegated` | Project owners retain project-level authority; module members act within delegated scope | A project owner approves, or authorized members of each affected domain approve their respective scope |
| **Federated governance** `federated` | Module domains hold independent authority; an explicit system domain governs shared constraints | Every affected domain approves separately; project owners have no implicit cross-domain override |

In delegated mode, policy or ownership changes, shared system scope and explicit
execution authorization require project-level authority. In federated mode, policy
or ownership changes require every existing domain. Both use the preceding trusted
policy. Parallel development requires explicit write scopes, a shared base,
dependencies and integration responsibilities, using branches or worktrees as needed.
Task baselines combine a Git commit with relevant input versions; unrelated commits
do not automatically invalidate requirements decisions.

The GitHub adapter reads target-branch policy and checks reviews bound to the PR
head, target and approval scope. Current remote checks require a new approval marker
after target movement. CI, branch protection and merge eligibility remain target
repository controls.

[Work items, baselines and governance](payload/.agents/skills/accord/references/team-work.md)

## Methods and extensions

Accord adapts seven task-specific methods from
[GitHub Awesome Copilot](https://github.com/github/awesome-copilot/tree/7b1ebe6333397841ca918dec904d24d4695fe953).
Reviewed sources are pinned at commit `7b1ebe633339`, bundled with their MIT license
and copyright notices, and available offline. Execution tools required by a method
are supplied by the project environment.

| Method | Responsibility |
| --- | --- |
| `acquire-codebase-knowledge` | Repository discovery and knowledge-source inventory |
| `arch` | Architecture analysis grounded in source evidence |
| `context-engineering` | Task context and impact-scope analysis |
| `documentation-writer` | Technical documentation organized around reader tasks |
| `bug-reproduction-brief` | Minimal, repeatable failure evidence |
| `refactor-plan` | Dependency sequencing, behavior preservation and recovery planning |
| `webapp-testing` | Browser scenario verification using available, authorized tools |

Method loading, application and verification have distinct states. New or replacement
methods require review of scope, effectiveness evidence, dependencies and permissions.
Project coding practices have their own maintained source, and existing user Skills
remain available. Recurring engineering findings can become approved rules, checks
or method improvements.

`code-tour` supplies an inspect-before-asking interaction reference;
`project-documenter`, `drawio` and `md-to-docx` are optional presentation capabilities,
disabled by default. Accord is independent and is not affiliated with or endorsed by GitHub.

[Capability catalog](payload/.accord/capabilities/catalog/index.yaml) · [Method extensions](payload/.agents/skills/accord/references/project-methods.md) · [Continuous improvement](payload/.agents/skills/accord/references/project-improvement.md) · [Upstream license](vendor/awesome-copilot/7b1ebe633339/LICENSE)

## Checks and boundaries

Inspect installation status from an adopted project:

```sh
node .agents/skills/accord/scripts/accord-adoption.mjs --mode status --project .
```

Installation, task and delivery checks use their respective scopes and report both
coverage and gaps. Run a full audit, including archived local work, when required:

```sh
node .agents/skills/accord/scripts/accord-validate.mjs --project . --scope audit
```

Accord is an engineering harness implemented through instructions and tools. The
host agent environment supplies execution permissions and sandboxing. Mechanical
checks detect structural, reference, version or evidence-state problems; requirements
understanding, semantic completeness and acceptance still require review. Accord
uses local scripts and has no persistent service or autonomous update process.

## License

[MIT](LICENSE). Bundled third-party sources retain their upstream license notices.
