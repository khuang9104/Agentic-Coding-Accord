# Verification and Validation Strategy

Use only when a separate strategy owner is useful. Keep per-work obligations
and evidence in the existing Issue/PR or local work; no copy per module or task.

## Scope and Independence

- Applicable product, release, or change:
- Information profile and risk:
- Review and V&V responsibilities:
- Required independence:

## Verification Strategy

- Levels, methods, and code revision/checkpoint observed:
- Environments, tools, fixtures, and test data:
- Static, contract, security, performance, migration, and recovery checks:
- Entry and exit conditions:

## Incremental Completion Policy

- Configured test root and exact framework layout exceptions: link `vv` policy.
- Common completion criteria: acceptance conditions, necessary checks, diff
  review, changed knowledge, and inspectable version/environment/limitations.
- Scope selection and expansion: relevant modules, consumers and unknowns.
- Evidence reuse: unchanged relevant implementation, assertions, fixtures,
  configuration, dependencies and environment; retain limitations.
- Existing runner/CI entry points and result retention: link their owners.

## Validation Strategy

- Intended-use scenarios and code revision/checkpoint observed:
- Representative users, environment, and data:
- Human evaluation and acceptance:
- Entry and exit conditions:

## Traceability and Coverage

| Input reference | Purpose | Evidence location | Disposition/result/limitations |
| --- | --- | --- | --- |
| REQ/IF/DATA/RISK/OPS-* | Verification | Shared execution or review ID | Executed/reused/unmet; actual result |
| UN-* | Validation | Same ID when it proves intended use | Executed/reused/no-new-obligation/unmet; basis |

## Defects, Deviations, and Residual Risk

- Open defects and disposition:
- Accepted deviations:
- Missing or inconclusive evidence:
- Residual risk and acceptance authority:
