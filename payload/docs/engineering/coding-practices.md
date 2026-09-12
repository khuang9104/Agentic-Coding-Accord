# Coding Practices

This is the versioned, repository-scoped canonical source for the team's coding
practices. Its path is configured by `sources.coding_practices` in
`.accord/accord.yaml`. Keep project rules here; do not copy them into
`.accord/` or the managed agent-entry blocks.

## Discovery State

- State: initial
- No project practices have been confirmed in this file yet.

While the state is `initial`, an agent must inspect existing project guidance,
tooling, lint and format configuration, test scripts, source conventions, and
relevant documentation. It reports candidate practices with their source paths
and asks the human which ones should migrate here. It must not move, rewrite,
or remove existing guidance until the human explicitly approves that migration.

After the human decides, change the state to `confirmed` and record the
accepted project practices below. Keep unrelated instructions in their current
files. Per-person, machine-local preferences belong in the agent's own local
configuration rather than this committed project source.

## Confirmed Practices

No project practices have been confirmed yet.

## Automation and Evidence

When a practice can be enforced by a formatter, linter, type checker, test, or
CI check, name that executable control here with its command or configuration
path. Use prose only for constraints that cannot be automated.
