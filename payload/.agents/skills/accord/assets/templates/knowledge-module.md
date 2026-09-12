# Module Name

Use the approved lower-case kebab-case Module ID as the filename under
`docs/modules/` and list it in both the module catalog and manifest.

## Purpose and Responsibilities

Explain the outcomes owned here; link approved Need/Design Input IDs and their
canonical sources. Distinguish the approved target from observed implementation
and unresolved or known deviations.

## Capabilities

For each material function, record trigger, preconditions, inputs, processing,
outputs, errors, cancellation, boundary cases and side effects. Give verified
normal/boundary/failure examples. Link evidence and known deviations.

## Boundaries and Non-responsibilities

Define what belongs inside the module and what explicitly belongs elsewhere.

## Interfaces

Identify every material API, event, command, file or user surface; parameters,
results, types, requiredness, defaults, errors, permissions, ordering and
applicable retry/idempotency rules. Link exact registered contracts; explain
their semantics here instead of hand-maintaining a second schema.

## Data and State

Record owned entities and every persisted field's type, precision, nullability,
default, units/timezone, keys, relationships and constraints. Explain all enum
values, unknown-value handling, legal/illegal state transitions, guards and
effects; include lifecycle, transaction/concurrency and recovery rules.

Split substantial details only into registered `interfaces`, `data-model` or
`behavior` documents under this module ID. Move the content and retain links;
never omit fields or values to fit a soft size budget. Mark unsupported or
uninspected items as scoped gaps in the manifest, not completed headings.

## Dependencies and Consumers

Describe allowed dependencies, downstream consumers, and integration contracts.

## Provenance

List the source paths, configurations, schemas, tests, and documents inspected.

| Source path | Contribution |
| --- | --- |
| `replace/with/project/path` | Replace this draft row with an inspected source. |
