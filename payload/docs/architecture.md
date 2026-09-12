# System Architecture

## System Context

Describe users, external systems, and the system's place in its environment.

## Architectural Overview

Explain the major applications, services, packages, processes, or layers and
their responsibilities. Include a diagram when it materially improves clarity.

## Runtime and Deployment Topology

Describe execution units, environments, communication paths, persistence and
deployment boundaries. Include dependency/compatible version constraints,
configuration semantics without secret values, initialization and startup order,
and external prerequisites needed to recreate the observed behavior.

## Key Flows

Explain the most important end-to-end control and data flows.

## Working Commands and Entry Points

Record the canonical build, run, test and check commands that actually exist,
with their task-runner, manifest or CI sources. Distinguish a command found in
configuration from a command successfully executed. Keep the most-used subset
in `agent-context.md`; do not infer missing commands or remote CI enforcement.

## Architectural Decisions and Constraints

Summarize decisions and invariants needed to maintain the architecture. Link
existing decision records rather than copying them.

## Extension and Change Boundaries

Explain where new capabilities normally attach and which boundaries must remain
stable.

## Provenance

List the source paths, configurations, schemas, tests, and documents inspected.

| Source path | Contribution |
| --- | --- |
| `replace/with/project/path` | Replace this draft row with an inspected source. |
