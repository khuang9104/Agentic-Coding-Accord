# Engineering baseline

Use this Compact owner only when no suitable project source exists. Register
its path in `sources.engineering`; migrate discovered material only with human
agreement. Remove template guidance after recording actual facts. Do not create
an empty copy for every module or Change.

## User needs and intended use

For each stable Need ID, record actors, problem, intended outcome, scope,
non-goals, representative scenarios and acceptance conditions. Distinguish
confirmed needs from proposals and unresolved questions.

## Design inputs

For each stable Design Input ID, link its Need IDs and record the required
observable behavior, data/interface constraints, applicable quality targets,
preserved boundaries and verification/validation criteria. Link exact contract
owners instead of copying them. Equivalent internal implementation remains
the Agent's choice within approved scope.

## Decisions and unresolved questions

Keep only decisions needed beyond the conversation: stable ID, affected inputs,
decision or question, scope, rationale, status, and an inspectable human
confirmation summary/reference (who, when, accepted wording and limits).
Proposed, approved, superseded and rejected states are distinct. An Agent
inference or passing test does not establish approval. Link replacements;
Git preserves prior wording, so do not append conflicting current rules.

## Actual design and known deviations

Link module explanations and their observed revision. State any approved target
not yet implemented and any observed behavior that contradicts it; link the
issue owner. Do not turn implementation findings into approved needs.

## Evidence and acceptance

Link canonical Verification evidence for Design Inputs, Validation evidence
for intended use, their revisions and human acceptance. Keep long logs and
historical receipts in their existing locations, not this current baseline.
