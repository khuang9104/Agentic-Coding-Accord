# Agentic Coding Accord

[English](README.md) · [简体中文](README.zh-CN.md)

**A human-directed framework for agentic software engineering.**

Accord connects user intent, design inputs, implementation and verification
and validation (V&V) through a repository-local harness. You and the Agent
clarify what to build; you own material decisions and acceptance, while the
Agent analyzes, implements and gathers evidence within the agreed scope.
Project documentation keeps those decisions and implemented details available
for later development, handover and knowledge-base queries.

Works with **Codex and GitHub Copilot in VS Code**. Distributed as instructions,
templates and local scripts—not another coding agent, installer or hosted service.

> Accord currently targets development led by one human decision-maker. It can
> be used in shared Git repositories, but does not yet provide full multi-person
> decision-making or team governance. These capabilities are being explored and
> may arrive as an Accord extension or a separate project; scope and timing
> remain undecided.

[Quick start](#quick-start) · [How it works](#how-it-works) · [Project knowledge](#project-documentation-and-knowledge) · [Included methods](#awesome-copilot-methods)

## Why Accord?

Coding agents can produce code quickly. Keeping intent, implementation and
project knowledge aligned takes more than a chat history.

- **Agree on the intended behavior.** Explore requirements, dependencies
  and trade-offs with the Agent; unresolved material choices stay with you.
- **Review against the right target.** Link user needs and approved design
  inputs to verification and validation (V&V), not just a passing test suite.
- **Keep useful project knowledge.** Record architecture, module behavior,
  interfaces and data contracts; update affected sections when the system changes.
- **Carry the workflow with the project.** Shared instructions, coding practices
  and reviewed methods travel with the repository across sessions and machines.

## Quick start

You need Git, Node.js, and a coding agent with local file and command access.
Fetching this repository requires network access; a prepared local copy also
works. GitHub hosting is optional for your own project.

### 1. Ask your Agent to install Accord

Open the **target project** in Codex or GitHub Copilot Agent mode and paste:

```text
Install or update Accord in this project from:
https://github.com/khuang9104/Agentic-Coding-Accord

Fetch a separate checkout, record its full commit, and follow
CONFIGURE_WITH_AGENT.md from that same checkout.
Preserve my existing project documents, settings, Skills, history and
non-Accord content in Agent instructions. Apply conflict-free merges;
ask about unresolved conflicts or actions I have not authorized.
Verify the package and installed files using that checkout's tools.
Report the old/new version, source commit, changes, check results and
remaining actions. Do not report a partial update as complete.
```

The Agent merges the Codex and Copilot entry blocks, configures Accord, checks
existing coding practices, and generates or refreshes the project's documentation.
It asks before Git initialization, commits or dependency installation unless
you have already authorized those actions. Generated facts still need review.

**Updating later:** use the same prompt. Existing project content is merged,
not reset to blank templates. For offline adoption, replace the URL with the
path to a previously downloaded checkout.

See the [installation and update guide](CONFIGURE_WITH_AGENT.md) for manual
copying, version tracking, conflict handling and migration. Copying `payload/`
alone does not complete configuration.

### 2. Start with a normal project request

No new slash commands are required. For example:

```text
Add order cancellation before shipment. Keep completed orders unchanged.
Help me clarify refund and stock-restoration behavior, then propose design
inputs and acceptance scenarios. Leave undecided choices open.
```

Or, for an existing project:

```text
Organize project documentation and knowledge. Cover the architecture, module
behavior, API inputs/outputs, database fields and enums. Reuse existing
documents, distinguish approved requirements from observed code, and list gaps.
```

Clear instructions can already supply a decision and permission to implement.
Accord asks about missing material choices—not for the same approval again.

## How it works

Accord treats human–agent collaboration as more than approval at the end.
The Agent helps frame the problem, explores options and brings consequential
uncertainties back to you. The goal is bounded autonomy with less unnecessary
confirmation and rework—not removing the human from engineering decisions.

The workflow applies a **V-model approach**: define what the result must satisfy,
then use verification and validation as feedback throughout the change.

| Stage | What happens |
| --- | --- |
| Clarify | The Agent explores the need, affected modules, scenarios and trade-offs with you. |
| Define | Agreed requirements become **design inputs**: behavior, constraints, interface/data contracts and acceptance criteria. |
| Implement | The Agent works within the approved scope and maintains a **Change**: the current delta, decisions and evidence references. |
| Verify | Check that the implementation meets the approved requirements and design inputs. |
| Validate | Check that the integrated result meets user needs in representative usage scenarios. |
| Accept | You review the evidence and remaining gaps. A compact Record links the accepted result to its Git revision once committed. |

New or changed requirements return only the affected decisions to this flow.
Old documents and tests describe the baseline; they do not overrule a deliberate
change in user direction. Small, reversible edits use proportionate checks
rather than the full material-change process.

### The harness

Accord's harness is a repository-local engineering layer on top of your coding
agent. Prompt engineering shapes its instructions; context engineering selects
the relevant project knowledge; task routing, output conventions and local
validators support execution and feedback. The Agent performs the work;
scripts check declared structure, references and integrity. Accord does not
replace the agent's execution loop, permissions or sandbox.

```text
Target project
├── AGENTS.md + .github/copilot-instructions.md   Merged Agent entry points
├── .agents/skills/accord/                       Shared workflow and local tools
├── .accord/                                    Configuration, Changes, Records, methods
└── docs/                                       Project knowledge and coding practices
```

Short entry instructions route both agents to the same workflow. Procedures,
module details and method packets load when relevant; completed history is not
default context. Git supplies version control, diffs and recovery—not another
approval workflow. Accepting work does not force a commit or push.

This approach combines established requirements engineering and V&V with
current work on human–agent collaboration and harness design. Related reading:
[Agentic Software Engineering research roadmap](https://arxiv.org/abs/2509.06216),
[Anthropic on context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents),
and [OpenAI on harness engineering](https://openai.com/index/harness-engineering/).
Accord is a practical synthesis, not a reference implementation of these works.

## Project documentation and knowledge

Accord directs the Agent to build a common project reference from existing
documents and selective code inspection, then maintain it as part of changes.

| Project path | Purpose |
| --- | --- |
| `docs/README.md`, `docs/manifest.yaml` | Navigation, module inventory, review state and gaps |
| `docs/agent-context.md` | Compact starting context for coding sessions |
| `docs/system-overview.md`, `docs/architecture.md` | System purpose, boundaries, components and flows |
| `docs/interfaces-and-data.md` | Interface and data ownership overview |
| `docs/modules/<module-id>.md` | Module functions, inputs/outputs, data/state rules and dependencies |
| Registered details and `docs/contracts/<module-id>/` | Larger module details and applicable machine-readable contracts |
| `docs/glossary.md` | Project terms and aliases |

The target is usable engineering detail—not just an architecture summary:
applicable fields, enums, defaults, errors and state transitions belong in the
relevant module or contract. Requirements, design inputs, decisions and V&V
keep their existing owners and are linked rather than copied.

Changed facts replace outdated sections in place. Module and dependency
observations help identify which documents need review; Git retains history.
Freshness, coverage and source-free reconstruction are separate assessments.

For handover or an external knowledge base, export an explicit source-free
document set from the target project:

```sh
node .agents/skills/accord/scripts/accord-knowledge-export.mjs --project . --mode query --output ../project-knowledge
```

The export includes selected documentation and an integrity receipt, not source
files or the Agent's compact context cache. Review it before sharing. Documentation
can support rebuilding equivalent behavior within an agreed scope; an export
alone does not prove completeness or a successful rebuild.

[Documentation contract](payload/.agents/skills/accord/references/engineering-documents.md) · [Query and export guidance](payload/.agents/skills/accord/references/knowledge-query-and-refresh.md)

## Awesome Copilot methods

Accord adapts seven methods from
[GitHub Awesome Copilot](https://github.com/github/awesome-copilot/tree/7b1ebe6333397841ca918dec904d24d4695fe953).
Reviewed sources are bundled at commit `7b1ebe633339` under MIT, so using the
included methods does not depend on upstream availability.

Adaptations are maintained by Accord, with upstream copyright and MIT license
notices preserved. Accord is an independent project and is not affiliated with
or endorsed by GitHub.

| Method | Use in Accord |
| --- | --- |
| `acquire-codebase-knowledge` | Repository discovery and documentation inventory |
| `arch` | Architecture analysis with source references |
| `context-engineering` | Bounded context and impact mapping for a Change |
| `documentation-writer` | Reader-focused technical documentation |
| `bug-reproduction-brief` | Repeatable defect evidence |
| `refactor-plan` | Dependency-aware refactor planning |
| `webapp-testing` | Browser scenarios using available, authorized tools |

These are **adapted methods, not automatically installed upstream plugins**.
Accord owns the output locations and permission rules. Routing or loading a
method is not proof that it was applied; the Agent reports actual use.
Testing reuses the project's language, platform and test tools.

Accord also borrows the inspect-before-asking pattern from `code-tour`.
`project-documenter`, `drawio` and `md-to-docx` remain optional presentation
capabilities, disabled by default. See the [catalog](payload/.accord/capabilities/catalog/index.yaml)
and [upstream notices](vendor/awesome-copilot/7b1ebe633339/LICENSE).

## Customize and improve

Keep your conventions in `docs/engineering/coding-practices.md` or its configured
replacement. On first setup, the Agent inspects existing rules and asks what to
adopt. Independently installed Skills remain usable and unmanaged.

You can ask the Agent to evaluate, add or replace a method. Activation requires
review of its scope, evidence, dependencies and permissions. Recurring findings
can become approved practices, checks or method changes; they do not
automatically accumulate in the main instructions.

[Method extensions](payload/.agents/skills/accord/references/project-methods.md) · [Project-local improvement](payload/.agents/skills/accord/references/project-improvement.md)

## Checks and boundaries

From an adopted project, inspect the installed version or run a full audit:

```sh
node .agents/skills/accord/scripts/accord-adoption.mjs --mode status --project .
node .agents/skills/accord/scripts/accord-validate.mjs --project . --scope audit
```

Normal work uses narrower installation, task or delivery checks. Results
distinguish what was checked from what remains outside scope.

Accord is an instruction-based harness, not a runtime security boundary.
Checks cannot prove that an Agent understood the user, that documents are
complete, or that the result should be accepted. Human review remains necessary.
Installation and Git writes require their applicable authorization; push is a
separate action. There is no background service or autonomous self-update.

## License

[MIT](LICENSE). Bundled third-party sources retain their upstream license notices.
