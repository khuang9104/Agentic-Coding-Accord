# Git Control

Use this procedure when Git is missing, the directory is not a repository, a
baseline or checkpoint is needed, work is parallel, or recovery is requested.
Accord authority and the active Change remain controlling.

## Inspect

Run read-only checks first: `git --version`, `git rev-parse --show-toplevel`,
`git status --short`, and `git log -1`. Redact credentials in remote URLs.

- If Git is unavailable, explain approved package-manager, local-installer,
  package-cache, and network options. An offline Agent cannot download Git.
- If the directory is not a repository, inspect only. Explain `git init`,
  `.gitignore`, project-local identity, and baseline scope before requesting
  separate authority for persistent actions.
- If no commit exists, do not begin material Accord implementation. Show the
  exact staged paths, validation, and proposed baseline commit first.

Local offline Git is valid. A remote is optional and push is explicit.
Existing explicit authority may cover these named actions together; do not
split one approved packet into repeated confirmation rounds. Inspect commit
trees to prove committed paths; index membership only proves staging. Compare
content when claiming the current files are the committed version.

## Use proportionately

| Risk | Git control |
| --- | --- |
| L0 | Review the diff; no Change or commit required. |
| L1 | Focused checks; propose a commit only when it is a useful recovery point. |
| L2 | Record the approved base; propose checkpoint and acceptance commits. |
| L3 | Require an approved base and recoverable checkpoint before execution. |
| L4 | Require explicit execution authority, revision-bound evidence, and tested recovery. |

Before a commit, inspect unstaged and staged diffs, stage only approved paths,
show evidence and a focused message, then follow `commit_mode`. Never infer push
authority from commit authority.

If a mutating Git command fails, times out, or returns incomplete output,
inspect the relevant HEAD, branch, index, worktree, and remote state before any
retry. Preserve the original failure and do not repeat commit, push, revert,
reset, or another potentially state-changing command until its observed effect
and retry safety are known.

For parallel writes, define each Work Unit's exclusive paths, base revision,
dependencies, expected evidence, and integration order. Use branches or
worktrees only when they reduce a real conflict; one coordinator reviews the
integrated diff.

Prefer `git revert` or restoration from a named revision. Force push,
`git reset --hard`, destructive clean, deletion of history, remote changes,
tags, commits, and pushes require the authority stated by project policy and the
human.

Implementation, V&V, human acceptance, commit, push and archive are distinct
facts. If the user defers commit, preserve worktree evidence (base plus scoped
content digest), accepted scope and pending archive in the current Change.
Do not stage/commit to satisfy a template. Once the matching result commit
exists, archive through the Record; its own commit may follow later.
