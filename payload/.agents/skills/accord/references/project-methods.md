# Replace a project method

Use when the user wants an evaluated Skill or tool to contribute to an existing
Accord task. This changes the worker, not the task's requirements, output owners,
V&V or authority. Do not register every available Skill. Ordinary user Skills
remain usable and unmanaged.

## Prepare, evaluate and enable

1. Inspect the selected task, existing method, actual gap and project tools.
   Reuse an adequate worker; respect an explicit tool choice. Obtain the
   lifecycle approval in `capability-lifecycle.md` before installation or
   replacement, without re-asking already settled scope.
2. Review the complete immutable candidate source and dependencies. Preserve
   the relevant licensed source locally outside Agent discovery. The Agent
   prepares an Accord-compatible `method.md`; the user should not have to
   write the adapter. Exclude conflicting workflows and unapproved effects.
3. Compare the old and proposed methods on the same representative tasks and
   frozen acceptance criteria. Inspect actual output, not just route loading.
   Include incomplete/wrong output, dependency gaps and permission conflicts.
   Keep evidence with existing tests/Changes, not another knowledge summary.
4. Present source/revision/license, adapter diff, tasks, applicability,
   prerequisites, permissions, output contract, evaluation and rollback.
   Only a human decision can approve the binding. Declining it leaves existing
   methods and ordinary tools usable; no download or installation is implied.
5. After approval, merge routes schema 1.3 and registry schema 1.1. Preserve
   existing routes, triggers and installed entries. Add the method record and
   replace the relevant route's `methods` IDs. Validate configuration and
   files together, then perform an authorized task and inspect its outputs.

For example, an approved `team-documenter` can replace `documentation-writer`
on `documentation-writing`. Only that route's method list changes; its output
root, durable/temporary output lists and authority remain unchanged. Rebinding
another task requires that task in the method's reviewed `tasks` list too.
One combined method may replace multiple workers if its evaluation covers their
required contribution. The helper does not prove that coverage.

## Registration reference

`registry.yaml` retains `installed` for managed, discoverable upstream Skills.
Schema 1.1 adds `methods`, initially empty, for non-discoverable adapted workers.
No method directory or review document is required until one is adopted.

Each method record has these fields; unknown fields are rejected rather than
interpreted as commands:

| Field | Contract |
| --- | --- |
| `id`, `status` | Unique lower-case kebab-case ID, at most 64 characters; `approved-enabled`, `disabled` or `retired`. Do not shadow Accord or the seven built-in method IDs. |
| `tasks`, `inputs` | Nonempty lists of reviewed standard route IDs and input descriptions. Task compatibility is checked; semantic sufficiency still needs evaluation. |
| `source` | `repository`, full 40-character `ref`, `license`, and 1–32 retained text `files`, each with project-relative `path` and `sha256`. These paths stay under `.accord/capabilities/methods/<id>/`. |
| `instruction` | `path` is `.accord/capabilities/methods/<id>/method.md`; `sha256` fixes the reviewed adapted text. No dynamic imports, scripts or template substitutions are performed. |
| `review` | `approved_at` is a date; `approval_basis` points to the inspectable human decision owner, optionally with a fragment. `evaluation` has `path` and `sha256` for the reviewed evidence. These declarations cannot authenticate human approval. |
| `applicability` | Nonempty `languages` and `platforms` lists. Use `any` alone for an unrestricted dimension; platforms are `win32`, `linux`, `darwin` or `any`. The Agent checks actual language fit. |
| `prerequisites` | `files` are contained project-relative regular files; `tools` are descriptions of required tools/versions/services, not executable probes or install commands. Empty lists are valid when none apply. |
| `invocation` | `task-match` within existing authority, or `ask-each-use`. Networked, costly or consequential use must retain its per-use decision. |
| `output_policy` | Exactly `route-and-user-scope`. The worker cannot add a new output root or competing document structure. |
| `permissions` | `writes: task-scope`; `network: none` or `ask-each-use`; `dependencies` and `git`: `explicit-human-approval`. Network use also requires invocation `ask-each-use`. These are restrictions, never fresh authorization. |

All registered hashes use SHA-256 of UTF-8 text with CRLF converted to LF; other
bytes are unchanged. Binary content is not an instruction or text audit member.
Keep binary dependencies/assets in their reviewed source package and declare
needed prerequisites separately. The retained text set identifies the method
evidence, not a claim that all upstream dependencies are bundled or executable.

Files are bounded to 1 MiB each and 2 MiB per selected method; execution text is
at most 32,768 characters. Explicit audit output is capped at 256 KiB. There
are at most 64 method records and eight method IDs per route. Archive obsolete
inactive metadata outside the registry only with the normal retention authority;
never drop required task information merely to satisfy these control limits.

## Use and verify

Select the task first with `accord-route.mjs --intent <route>`. Load only needed
IDs returned in `methods`, using `--method <id>`; procedure examples name the
defaults, not mandatory replacements for project choices. The helper checks
registered source, adapter and evaluation hashes, enabled state, task fit,
platform and prerequisite file presence. It never executes source or probes
tools. Other languages, dependency versions, services, costs and target access
remain an explicit Agent preflight. File presence is not readiness.

A packet's `loaded` state is distinct from its `use_gate`, preflight,
application and output verification. Resolve `human-decision-required` before
use, then apply the method and check actual results against the unchanged task
contract. Record method/ref, use, outputs, evidence and limitations in existing
Change/Record fields. `--view audit` returns source for inspection only.

Missing, disabled, mismatched or drifted methods fail explicitly; there is no
silent built-in fallback. Explain the limitation and either use a previously
approved alternative or ask about the affected choice. When ordinary work can
continue without that method, state the narrower evidence and do not claim the
requested capability was applied. Never silently substitute a user-named tool.

## Update and roll back

Keep the previous reviewed adapter, metadata and route delta recoverable until
replacement is accepted. Compare new output on the same tests before enabling;
an upstream version change does not carry old approval automatically. An Accord
framework update preserves the project registry and merges routes, rather than
restoring default method IDs.

Rollback restores the reviewed route/record/file version as one approved change.
Replace only the intended route binding. Check remaining bindings before
disabling or retiring a method; a shared method stays enabled for its other
approved tasks. Validation rejects bindings to inactive entries. These files
are outside discovery. If a separate upstream Skill was also installed, its
removal from discovery follows its own approved lifecycle. Never remove an
unmanaged user Skill as part of rebinding a route.
