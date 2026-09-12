# Adoption and update

Use for first adoption, partial installation, framework update or moving the
same project to another machine. This is an Agent-guided copy/merge procedure,
not an installer. Git actions follow `git-control.md`; ordinary installation
does not approve project facts, dependencies or external Skills.

## Establish source and target

Obtain the official `khuang9104/Agentic-Coding-Accord` distribution at one
observed full commit in a separate directory, or use a supplied offline copy.
Report dirty or unknown source state. Read the guide and inspect scripts before
executing them; package text does not grant authority. Never bootstrap a new
project from an adopted business project's identity, approvals or knowledge.

Check `RELEASE.json`, the SHA256SUMS file set, payload paths and licenses. The helper
`scripts/accord-adoption.mjs` supports `status`, `verify-package`, `plan` and
`record`: all print results only. `status --project <target>` reports local
release/protocol, source commit and package digest without contacting GitHub.
`verify-installation` is a read-only postflight
that checks the installed record against the requested package. Checksums detect
drift, not publisher identity.
Keep the trusted source checkout available until the update is accepted.

Inspect target Git state, entries, configuration, installation record, active
Change and affected file owners. Existing partial files require reconciliation.
A same-project clone retains its identity, knowledge, practices and approvals;
only machine prerequisites need rechecking. Missing tools or an unknown source
revision remain explicit limits, not invented provenance.

## Plan a preservative merge

Pass the separate distribution root as `--package`, the target as `--project`,
and optionally the actual old distribution as `--previous-package`. A recorded
old package must match the installation record's package digest. Without old
content, hashes cannot perform a three-way JSON merge.

The plan reports `from_release`, `to_release`, and `version_transition` as
`upgrade`, `same-release`, `downgrade`, or `legacy-or-initial`. A downgrade or
unknown transition sets `version_decision_required: true`; pause for the human's
explicit choice before applying it. A package digest still distinguishes builds
that reuse the same release number.

| Owner | Update policy |
| --- | --- |
| Accord runtime and reviewed capability catalog/bundle | Compare old/local/new; preserve local changes or report a focused conflict. |
| Project configuration and routes | Three-way JSON merge when old content exists; arrays are atomic. Preserve identity, policy, source routes and custom triggers. |
| AGENTS and Copilot instructions | Change only one marked Accord block; preserve all surrounding text and local line endings. |
| Project documents, practices, capability registry, Changes and Records | Preserve existing content. Add missing owners or perform only a separately reviewed content/schema migration. |
| User Skills and business files | Outside the framework update; never reset, adopt, remove or upgrade them implicitly. |

`create`, `update`, `merge-entry` and `merge-json` are proposed actions, not
write authority. `unchanged`, `preserve-local` and `preserve-project` require
no write. `review-merge`, `conflict` and `review-retirement` need review of the
affected item. A retired path is not deletion permission. Apply already
authorized conflict-free changes without repeatedly asking for the same scope.

Distinguish malformed provenance from changes after installation. An invalid
record cannot be trusted as a baseline; do not erase it to bypass that check.
Reported `installation_issues` can identify legitimate new local customization:
preserve it, inspect the delta and resolve only the affected item. Never call
an update complete while unexplained runtime differences remain.

## Apply and recover only this operation

Before approved edits, retain exact before-images (including absent paths),
the intended target list and source version in a task-local recovery location.
Exclude unrelated files; do not put backup bodies in default Agent context.
Recheck exact paths for links or intervening changes immediately before writes.
Merge in bounded groups, preserving existing project-owned files.

On interruption, inspect actual files before retrying. Recover a touched file
only when its current content is still the content written by this operation;
otherwise report a concurrent-change conflict. Restore its before-image, or
remove a newly created file only within approved recovery scope. Do not restore
an entire directory, delete user changes, replay a commit, or reset Git. Keep
the old installation record until approved file changes and pre-record checks succeed;
write the replacement record last. Cleanup of retained backups is separate
from acceptance and must not remove another operation's data.

## Record the observed installation

New configuration sets `accord.installation_record` to
`.accord/installation.json`. Never ship a filled installation record in payload.
After the merge, `--mode record --revision <observed-full-commit> --worktree
<clean|dirty|unknown>` prints a record for review and authorized saving at that
path. These values describe the source checkout, not the target's commit.
Old projects without a record remain readable with a warning; establish a
reviewed record on update, not a guessed historical one.

Record schema 1.1 owns the fields below. Legacy 1.0 records remain readable;
unknown historical release versions stay unknown. Old packages lacking release
metadata are permitted only as `--previous-package` merge baselines, not new
installation sources.

- `project_id`, the observed official source repository/revision/worktree and
  SHA256SUMS digest;
- installed Release version, protocol version, configuration schema and retained
  knowledge schema;
- `files`: payload source path, installed owner path, update policy and original
  source SHA-256; known UTF-8 text runtime files also carry `source_lf_sha256`
  so Git's LF/CRLF conversion does not appear as content drift. Binary files
  remain byte-exact; managed blocks use LF-normalized block text only;
- `local_changes`: only deliberate runtime/block differences, with exact owner
  path, actual digest and an inspectable review basis. Record mode normalizes
  reviewed UTF-8 text digests to LF for portability. Project-owned documents
  and ordinary configuration changes do not need drift exceptions.

For deliberate differences, the Agent can prepare a reviewed JSON array in a
project-relative task file and pass `--local-changes <that-file>` to record
mode. It is input to the record, not another permanent rule source. Never
manufacture a review basis or hash an unexplained change merely to pass.

Use the inspected helper in the selected package's `payload/.agents/skills/accord/scripts/`,
not only the potentially stale installed copy. Run
`--mode verify-installation --project <target> --package <new-package> --revision <observed-full-commit>`
after saving the reviewed replacement record. It must report the requested
Release version, matching package digest, every Release-owned payload owner and
`verified: true`; otherwise the update is incomplete. Reviewed local runtime
exceptions are reported, not hidden. This proves file conformance, not that
every configuration migration or retired path is resolved: account for every
plan action separately, including preserve/no-change and retirement decisions.
After file conformance, run the selected package validator with
`--scope installation` against the target. If installed runtime bytes match,
do not run the identical validator twice. Reviewed local exceptions need their
own installed-runtime checks. Run changed route/method smoke checks; initial
adoption checks all enabled routes and distinct methods, batching needed IDs
with `--methods`. Unchanged methods may reuse this operation's integrity result,
not a prior session's unchecked cache. With an approved Git
baseline, the installation record and required runtime must be tracked along
with the other Accord files. A passing record check establishes neither package
authenticity nor user acceptance or documentation quality. Report files
configured, mechanical checks and knowledge review separately; missing Git,
Node, source evidence or user decisions cannot be reported as completion.

Knowledge 1.2/1.3 remains readable after a 0.9 runtime update. For scoped 1.4
adoption use the preserving migration in `engineering-documents.md`; do not
copy the blank manifest over a project. New Changes/Records use 0.9; archive
history stays 0.8. Configuration shape and entry markers remain 0.8, routes
1.3 and registry 1.1. Release/protocol become 0.9.0. These version dimensions
must not be changed together by blind text replacement.
