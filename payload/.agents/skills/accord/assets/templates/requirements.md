# System and Software Requirements

## Requirement Rules

- Give each material requirement a stable reference.
- State one behavior or constraint per item.
- Link its user need, risk, interface, or external source.
- Define an inspectable fit criterion and verification method.
- Keep implementation choices out unless they cross the Decision Frontier.

## Functional Requirements

| Reference | Status | Source | Requirement | Fit criterion | Allocation | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-F-001 | proposed | UN-001 | State one decidable behavior | Observable result | System/module | Evidence method |

## Quality Requirements

| Reference | Status | Source | Quality constraint | Conditions and threshold | Allocation | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-Q-001 | proposed | UN/RISK-* | State a measurable constraint | Workload, environment, and threshold | System/module | Measurement or analysis |

## Interface, Data, Risk, and Operational Inputs

| Reference | Status | Source | Constraint | Fit criterion | Verification |
| --- | --- | --- | --- | --- | --- |
| IF/DATA/RISK/OPS-001 | proposed | External or derived source | State the contract or control | Observable result | Evidence method |

## Allocation and Coverage

| Input reference | Allocated architecture/module | Downstream contract/test |
| --- | --- | --- |
| REQ/IF/DATA/RISK/OPS-* | Link owner | Link output or planned evidence |
