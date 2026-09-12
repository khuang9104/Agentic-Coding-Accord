# Testing and V&V

Use for test planning, execution and evidence review, standalone or within the
existing Change lifecycle. Tests serve approved requirements, Design Inputs
and intended use; observed code or UI behavior is not the expected-result
authority. Reconcile changed inputs before updating assertions.

## Select the smallest sufficient test path

Select `test-verification` with `accord-route.mjs`. Inspect the affected module's
existing test configuration, scripts, lockfiles, representative tests and CI
commands if present. Reuse a current Context Map. Do not scan the whole project
or load the capability catalog merely to run known tests.

The default uses ordinary project tools without a method. If a reviewed project
binding returns method IDs, use those IDs and resolve their use/preflight
conditions; the requirements below still govern their output and authority.

Determine the business/runtime language, test language/framework, target
platforms, runnable commands, required services and available tools. Infer
these from evidence, not file extensions alone. A multi-language repository
can require different commands per module and a separate integration check.
Do not install or substitute a framework merely because a candidate is listed.

| Test surface | Selection rule |
| --- | --- |
| Module logic, CLI, library | Use its existing runner, assertions and test conventions. |
| API, database, inter-module boundary | Use existing integration/contract tests with isolated data and explicit service prerequisites. |
| Browser-visible user journey | Use `web-testing` when the browser method adds value; a backend's language does not dictate the browser test language. |
| Native desktop/mobile, embedded | Use applicable existing platform tools. Browser tests and viewport emulation do not prove native-platform behavior. |

Select tests by affected behavior and consequence, not fixed test-pyramid or
coverage percentages. Start with focused fast checks; include relevant boundary,
failure, state/recovery and cross-module scenarios. Expand when impact or
failures justify it. Do not require CI or a GitHub remote for local evidence.

## Design and execution boundaries

- Map each material check to approved input IDs or intended-use scenarios,
  observable expected results and the environment in which they matter.
  Verification checks Design Inputs; Validation checks intended use in
  representative integrated conditions. Identify what mocks cannot demonstrate.
- Preserve existing tests where they still reflect approved behavior. Add or
  edit tests only within requested scope, using existing paths and naming.
  Planning-only work does not execute; test-only work does not repair application
  code. Read-only requests do not create test files or persistent reports.
- Inspect commands for install hooks, migrations, production targets, credentials
  and external effects before running them. Use isolated data. Starting a service,
  writing artifacts and interacting with an external system must be in scope;
  missing authority or prerequisites make that check unavailable, not passed.
- Use specific behavioral assertions and controlled fixtures. For a new regression,
  demonstrate the relevant failure before repair when feasible and safe; otherwise
  record why that evidence is missing. Do not derive assertions only from current
  output, weaken them, skip a failing test or change requirements to obtain green.
- Bound waits and retries. Preserve the first failure and report intermittent
  outcomes; a successful retry does not erase an earlier failure. Distinguish a
  product defect from test-harness and environment failures. Stop repeating an
  unchanged infrastructure failure and report the affected coverage gap.

## Browser adapter

For a justified browser scenario, select `web-testing` and load its returned
method IDs. The default is `--method webapp-testing`; do not override a reviewed
project replacement with that example. Resolve packet use/preflight conditions
and apply the reviewed method once. Reuse an existing
project test suite or an available approved browser tool; MCP is not required.
If Playwright, its browser binaries, Node.js or the intended service is missing,
report that boundary. Dependency installation is a separate approved action,
not a fallback executed by the method. Do not auto-import upstream helpers.

Check the approved URL, account/data scope and running-service readiness before
interaction. Prefer role/label/test-ID locators, state-based waits and explicit
assertions. Limit actions to the approved scenarios; do not submit real payments,
send messages or mutate production records under generic testing authority.
Capture failure traces/screenshots only within scope, redact sensitive data,
and close only resources created by the test.

When authorized to create reusable regression tests, use the project's existing
test language, framework, directories and artifact locations. Exploration is
evidence for implementation details, not a substitute for approved expected
behavior. A screenshot, navigation or successful tool call alone is not a pass.

## Report evidence without another document system

For documentation sufficiency, use the independent inventory and exact checks
from `engineering-documents.md`. Fix expected field, enum, default, state and
error outcomes before generating or grading documents. Include omission and
conflict cases; a generated table or matching heading is not correctness.
Read-only exact comparison does not prove runtime or user-need conformance.

A source-free evaluation receives only the explicit reviewed delivery set and
questions/task, without original source, Git history, private oracle or earlier
conversation. Record enforced filesystem/network boundaries; prompting an
Agent not to read accessible source is only a simulation. Grade against frozen
independent expected behavior. Preserve failures and unavailable environments;
do not change the denominator or expected outcomes to fit the generated prose.
Link scoped question/rebuild results from the manifest, leaving the actual V&V
evidence in its existing owner. Do not delete source to test reconstruction.

Use the response for standalone read-only work and existing Change/V&V owners
for material work. Link logs and tests; do not copy them into project knowledge.
For each material result retain input/scenario IDs, command or tool actions,
observed revision plus dirty-worktree boundary, runtime/OS/browser or device,
expected/actual results, status and limitations. A local pass covers only the
environment observed, not every supported platform.

Use `passed`, `failed`, `unavailable` or `not run`; unknown or partial evidence
never passes. Distinguish route selection, method loading, actual application
and result review. Report the method's pinned source when applied, or a reasoned
skip/unavailability. Automated tests contribute V&V evidence; they cannot grant
human acceptance or prove all user needs are satisfied.

Legacy route schemas require a reviewed upgrade for integrated browser use.
Ordinary authorized tests remain usable without that route or a snapshot;
report the limitation without claiming the unavailable method was applied.
