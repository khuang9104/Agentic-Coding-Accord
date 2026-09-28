# V&V policy and evidence contract

Read when registering a check, collecting machine evidence or validating a work
item. Workflow and sufficiency rules belong to `testing-and-vv.md`. This is a
reference, not another mandatory project document.

## Policy and assets

Configuration 0.10 retains the V&V targets and revision binding. Its `vv` section
adds schema `1.0`, `test_root` (default `tests`), `layout_exceptions` and `checks`.
Keep portable tests, fixtures and test-only scripts under the test root; organize
by module and cross-module scenarios. Create folders only for actual content.
Use `<test_root>/.artifacts/` for ignored local results. Retain durable evidence
in the existing CI/artifact store or work owner before temporary results expire.

Each layout exception names an exact asset `path` and technical `reason` for a
framework-required source location. No broad source-tree exceptions. CI and
package-manager entries can remain in their native locations and invoke these
assets. Build/release tools need not move. Migrations update discovery, imports,
fixtures and commands, compare discovered cases, then remove superseded paths.

Register suites/commands, not every test case. Existing runner configuration owns
test discovery; the small registration only adds routing and evidence metadata.
Empty `checks` permits native/manual evidence; it does not mean no testing is
needed. Unknown paths require independent scope review and conservatively select
all registered checks.

```json
{
  "id": "orders",
  "modules": ["orders"],
  "purposes": ["verification", "validation"],
  "inputs": ["src/orders", "tests/modules/orders", "package.json", "package-lock.json"],
  "assets": ["tests/modules/orders/cancel.test.mjs"],
  "command": ["node", "--test", "tests/modules/orders/cancel.test.mjs"],
  "adapter": "node-test",
  "environment_keys": ["TZ"],
  "timeout_ms": 60000
}
```

`inputs` are literal files/directories covering implementation dependencies,
assertions, fixtures, relevant configuration and toolchain/lock inputs. `assets`
declare the portable test assets or exact exceptions, and must be covered by
inputs. `modules` route reverse-consumer selection. `purposes` state what the
assertions can establish; registering Validation requires business outcomes,
not merely successful status codes. All arrays are bounded and IDs unique.

The built-in `node-test` adapter uses Node's native runner and TAP counts, rejects
zero named tests, failed/cancelled/skipped/todo tests and input changes during
execution. Commands start with `["node", "--test", ...]`; Accord supplies the
reporter. `exit-code` is restricted to `method: "analysis"` for tools such as
linters that report success by exit status; do not label a unit-test command as
analysis to bypass discovery checks. Other frameworks use their existing runner
and reviewed native results; automatic result parsing is not implemented for them.

## Select and execute separately

```sh
node .agents/skills/accord/scripts/accord-vv.mjs --project . --base FULL_BASE_SHA
node .agents/skills/accord/scripts/accord-vv.mjs --project . --run orders
```

Planning is read-only. It includes dirty, untracked, deleted and both renamed
paths; consults module dependencies; returns selected IDs, unknown paths,
`scope_digest` and required boundary probes. Saving the work carrier or generated
logs does not invalidate its own scope review. It does not scan historical work
or test bodies. Agents inspect actual consumers, shared state/configuration and
dynamic/deployment boundaries; the graph alone cannot establish completeness.

`--run` explicitly executes the registered command without a shell, with at most
60 seconds and bounded output. Inspect command effects and existing authorization
first. A timeout or unavailable executable is a gap; use the existing runner
directly for longer/platform-specific checks and retain its actual observations.
The command writes one log under `.artifacts` and prints an evidence object.
Keep the object in the selected work/PR evidence owner, not a second report.

An execution observes inputs before and after the run. Receipt schema `1.0`
contains ID, check ID, method, result, actual Git revision, literal inputs,
before/after observations, environment fingerprints, command/adapter binding,
exit code, counts where applicable, log source and digest. Environment records
Node/OS/architecture and hashes named environment variables without exposing
values. It cannot discover live service/database state or undeclared inputs;
include relevant version/state inputs or rerun when equivalence is uncertain.

## Work 1.1

Keep existing identity, scope, baseline and authority fields. Delivery adds:

- `scope_review`: current plan's `scope_digest`, inspectable `source`, impact
  `basis`, and `resolved_probes` covering the returned required probes.
- `obligations`: unique `id`, `purpose` (`verification|validation`), referenced
  requirement/scenario `target`, observable `expected`, `disposition` and an
  `evidence` list of evidence IDs.
- `evidence`: execution receipts or scoped manual observations. One ID can
  support several obligations and both purposes without another execution.

Disposition is `executed`, `reused`, `no-new-obligation` or `unmet`. Actual
evidence results remain `passed|failed|unavailable|not-run`. No-new requires
`basis`, `baseline_source`, no evidence IDs and no selected checks for that
purpose; it cannot waive affected existing checks. Material work accounts for
both purposes and each declared requirement. No-new is applicability, not a pass.

For manual `review` or `demonstration`, retain schema/ID/result/source/revision,
expected/actual observations and `basis`, plus input/environment observations.
The exported `observeInputs(root, paths, vv)` and `observeEnvironment(keys)`
helpers capture these before/after the actual observation. Do not invent a
test command, execution count or user approval for manual evidence.

Delivery checks all referenced evidence, selected checks and current scope.
Historical failed attempts may remain unreferenced; a later valid repair can
satisfy an obligation. An unexplained flaky retry does not resolve the defect.
Machine checks establish declared bindings and result structure; review still
assesses assertions, impact and sufficiency. Matching hashes are not proof of
complete dependencies, correct expected results or authenticated acceptance.

Use native CI required checks for enforceable GitHub merge gates. Reconcile the
actual merge candidate and release environment; separate branch passes alone
do not establish integration fitness. Offline checks remain usable without GitHub.

## One-way update

```sh
node .agents/skills/accord/scripts/accord-migrate.mjs --project . --vv
node .agents/skills/accord/scripts/accord-migrate.mjs --project . --work .accord/work/WORK-ID.json
```

These print configuration 0.9/work 1.0 migration proposals without writing.
Retain old results for inspection, reconstruct actual obligations and bindings,
then replace the old carrier and runtime. Imported results never automatically
become valid evidence. Current delivery rejects work 1.0; no parallel legacy
validation path is retained.
