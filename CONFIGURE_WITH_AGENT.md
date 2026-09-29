# Install or update Accord with an Agent

[English](#english) · [中文](#中文)

## English

Open the target project and use the prompt in [README.md](README.md#quick-start).
The prompt authorizes fetching this repository and conflict-free Accord file
merges. It does not authorize unrelated project changes, target Git writes,
dependency installation or approval of generated project facts.

### 1. Obtain one source version

Fetch the requested repository into a separate temporary directory. Use the
user's specified ref, or resolve the default branch to a full commit and keep
that checkout fixed for this operation. Read its README and this guide from the
same checkout. A supplied local package also works offline; report its revision
when available and any uncommitted source changes. Do not call an unversioned
download a verified revision.

Before executing package scripts or copying files, check `RELEASE.json` and the
entries in `SHA256SUMS` against `RELEASE.json`, `payload/` and `vendor/`,
including missing or extra files. Report the release version, protocol version,
full source commit and SHA-256 digest of `SHA256SUMS`. Reject absolute paths,
traversal and symlink escapes. Stop on a mismatch. The checksum excludes the
release README and this guide; it detects drift, not publisher identity. Do not download or install the Awesome Copilot tools
separately.

### 2. Inspect the target and choose adoption or update

Check the project root, Git availability/status/baseline, Node.js, existing
Agent instructions, `.accord/accord.yaml`, coding practices, documents and
capability registry. Report the intended file scope before writing. A missing
`.accord/` means new adoption; an existing installation requires comparison
and merge, not another bootstrap over it. If only some Accord files exist,
treat that as a partial adoption and reconcile them before copying anything.

Read `payload/.agents/skills/accord/references/adoption-and-update.md` for the
shared merge and recovery contract. Its `accord-adoption.mjs` helper only
prints package checks, an update plan or an installation record; it performs
no installation. After source review, use `--mode verify-package
--package <distribution-root>` first, then `--mode plan --project <target-root>
--package <distribution-root>`, optionally with `--previous-package
<recorded-old-distribution>`. Replace these parameters with the inspected paths.
The old package must match the existing installation record. Local drift becomes
a focused merge issue, not permission to reset the project. Treat the plan as a
complete file inventory: every payload action must be accounted for; copying a
subset of `payload/` is not an update. Report `from_release`, `to_release` and
`version_transition`; a downgrade or unknown transition requires my explicit
decision before applying it.

| Target | New adoption | Update |
| --- | --- | --- |
| `.agents/skills/accord/` | Copy the runtime from payload | Compare old/local/new files when the old source is known; preserve local customizations and resolve conflicts |
| `.accord/accord.yaml` | Configure project identity and existing source paths; default to compact and local-only Git | Merge needed schema/settings changes; retain project identity, source mappings and Git policy |
| Agent entry files | Merge payload entry blocks into `AGENTS.md` and `.github/copilot-instructions.md` | Update only the marked Accord blocks; retain all other content |
| Practices and project docs | Create missing standard files and populate them from project evidence | Retain authored content, module IDs and review history; update only affected explanations or approved layout migrations |
| Capabilities | Carry catalog, routes, compressed snapshot and empty registry | Update compatible catalog/routes/runtime together; retain installed registry entries, custom triggers and unrelated Skills |
| Work, policies and licenses | Configure documentation/governance policies and preferred Issue/PR or local carrier; copy `ACCORD-LICENSE` | Merge policies; preserve existing work, needed work facts, project license and upstream notices; retire obsolete files |

Use only the payload's runtime/control files and missing document templates.
Do not copy this distribution's `.git/`, release README, guide or expanded
`vendor/` tree into the target. Do not recursively overwrite `.agents/`,
`.accord/` or `docs/`. Check existing Accord runtime customizations before
replacing them; if the old version is unknown, inspect differences conservatively.
Remove obsolete managed files only after their ownership and replacement are
established and deletion is authorized. Preserve unrelated uncommitted work.

Perform conflict-free authorized merges directly. Ask only about unresolved
content conflicts, behavior-changing migration choices or actions outside
existing authority. Target Git initialization, identity, staging, commits,
remotes and pushes retain their existing authorization requirements.

### 3. Configure practices, documents and routes

Read the selected runtime's `SKILL.md` and only the matching procedures.
For initial coding practices, inspect existing instructions, tooling and code
conventions; ask which should migrate to the configured practices source.
Do not silently turn discovered conventions into approved rules.

For new project documentation, follow `references/knowledge-acquisition.md`:
select `initial-knowledge`, load and apply acquisition and architecture methods,
use the bounded inventory, and populate the standard `docs/` view with source
provenance. Confirm actual architectural modules, not one file per code folder.
Keep requirements, Design Inputs, V&V and other canonical engineering records
in their existing owners, registered once in knowledge 2.0. Keep the manifest
`draft` until coverage, conflicts, scoped source observations and gaps have been
reviewed. A mechanical check cannot certify semantic completeness.

An update does not require rebuilding all project documentation. Use a targeted
refresh only when facts or structure change. For old `docs/knowledge/` layouts,
resolve legacy layout collisions before proposing a registry migration; preserve
historical Records and unrelated files. Never set an old view to `current` merely because
the runtime update passed validation.

New adoptions use knowledge 2.0, configuration 0.10 and protocol 0.11.0.
Entry markers remain 0.8; route/registry remain 1.3/1.1. Read
`references/project-knowledge.md` for hierarchical module declarations and the
editable documentation policy; `references/team-work.md` covers Issue/PR work,
local fallback, and delegated or independent-domain governance. Configure real
owners and domains; the example local identity does not authenticate a reviewer.

Updates migrate directly to the current format. Run `accord-migrate.mjs --project
<target>` for a one-way metadata proposal, preserve stable IDs and useful content,
resolve actual collisions, and apply registry/config/policies together. Transfer
active work to Issue/PR or local work; move lasting conclusions into canonical
owners. Remove retired Change/Record files, old readers/templates and obsolete
`sources.engineering`, `changes`, `records` settings. Git retains historical
versions. Do not keep conflicting old instructions as an alternate workflow or
infer new approval from old observations. New installation receipts use 1.1;
old receipts are read only while planning migration. Exact comparison supports
JSON Schema/OpenAPI JSON; other languages still need focused inspection.

Only route schema 1.3 runs in the current runtime. It includes existing-stack
V&V and browser-testing routes; review and merge runtime,
routes, catalog and entry blocks together, preserving custom triggers and
project approvals. Bundled method excerpts need no upstream installation;
browser tools and other dependencies still require separate approval. `--task`
may select an unambiguous positive single-intent route. A reviewed exact
workflow alias such as `organize project documentation and knowledge` or
`整理项目文档和知识库` is also selectable; a negated, quoted, extended
compound or multi-route request remains a candidate until the Agent interprets
actual scope and selects an explicit intent.

New adoptions use route schema 1.3 and registry schema 1.1. When upgrading,
preserve project method entries and bindings as well as installed Skills.
Follow `references/project-methods.md` for an approved method replacement;
do not overwrite custom bindings with default method IDs from this guide.

### 4. Verify and report the result

Before final validation, prepare and review `.accord/installation.json` using
the source helper's `--mode record`, with `--project`, `--package`, the observed
full source commit in `--revision`, and its `--worktree clean|dirty|unknown`.
Save the returned JSON only after approved file merges; retain the prior record
until then. New configuration requires this file; the template does not include a filled record. For deliberate runtime or
managed-block differences, supply a reviewed project-relative JSON array through
`--local-changes`; do not record unexplained drift as approved. Existing project
documents and configuration values are not required to match blank templates.
Unknown source revisions cannot produce a verified record: report the limit
and obtain the intended pinned source rather than inventing a commit. Projects
without a current receipt must complete migration before validation can pass.

From the target root, run the checks below. Replace `<distribution-root>` with
the absolute path of the inspected, pinned source checkout, and `<full-commit>`
with its observed full revision. The source tools live under `payload/`:

```bash
node "<distribution-root>/payload/.agents/skills/accord/scripts/accord-adoption.mjs" --mode verify-installation --project . --package "<distribution-root>" --revision <full-commit>
node "<distribution-root>/payload/.agents/skills/accord/scripts/accord-validate.mjs" --project . --scope installation
```

Run `verify-installation` only after all approved merges have been applied and
the new `.accord/installation.json` has been reviewed and saved. A non-zero
result is an incomplete update: do not claim success; use its errors to locate
missing or stale files, then rerun the plan and postflight check. The check
requires the installed release metadata, every Release-owned payload file, the
matching package digest and release/protocol versions, and a valid installation
record. It does not write files. Reviewed local exceptions are shown in the
result. Account for configuration migrations and every retirement action
separately; file conformance does not certify those decisions. Do not rely on
the old installed validator alone: it may not know the new file requirements.

After verified file equivalence, do not repeat the same full validator using
installed bytes. Validate reviewed local runtime exceptions separately.
For initial adoption check each enabled route; on update check changed routes,
methods and their affected consumers. Load needed method packets in one batch
with `--intent <route> --methods id,id`; unchanged contributions can reuse the
same operation's verified result. No cross-operation integrity bypass is allowed. Derive the
IDs from the installed `.accord/capabilities/routes.yaml`; do not assume the
latest schema was enabled. These read-only smoke checks verify routing and
offline snapshot loading, not method effectiveness or project-document truth.

Inspect `git diff --check`, `git diff`, `git status --short`, newly created
files and the merged entry blocks. Check installed unmodified runtime files
against the selected package; explain deliberate local merges instead of
expecting project configuration and authored docs to match blank templates.
Repeat adoption/update only if needed and confirm it would not duplicate
blocks, reset state or modify already matching files.

Report:

- release version, protocol version, source URL/path and full revision, plus
  source-dirty or unknown-revision limits;
- adoption or update, changed paths, deliberate merges and preserved local state;
- each check as passed, failed, unavailable or not run, with commands/results;
- knowledge review status, capability registry state and remaining user actions.

Distinguish **files configured**, **mechanical checks passed**, and **knowledge
review pending/accepted**. If Git/Node or a baseline is missing, request only the
needed action and report incomplete verification. Run the validator again after
an authorized baseline or migration; do not label a blocked setup complete.
A passing validator and method smoke check do not prove Agent behavior. For a
fresh-session check, ask the Agent to identify the loaded Accord entry, project
configuration, relevant route and existing project context before material work.

## 中文

在目标项目中使用 [README 的提示词](README.zh-CN.md#快速开始)。它授权 Agent 获取发布源并
执行无冲突的 Accord 文件合并；项目 Git 写操作、依赖安装、重要迁移决策和知识视图
认可仍遵循已有授权。

### 获取与检查

将仓库获取到独立临时目录，使用指定 ref，或将默认分支固定到完整 commit；README、
本指南和 payload 必须来自同一版本。离线时可以使用本地发布目录，说明其 revision 和
未提交修改；没有版本信息时不要声称来源版本已核实。应同时报告 `RELEASE.json` 的发布版本、协议版本、
来源完整 commit 和 `SHA256SUMS` 摘要；默认分支网址只是入口，不是可追踪版本。

执行脚本或复制前，检查 `RELEASE.json`，并用 `SHA256SUMS` 校验
`RELEASE.json`、`payload/` 与 `vendor/` 的完整文件集合，
拒绝越界路径与符号链接逃逸，缺失、额外文件或哈希不匹配时停止。校验范围不包含发布
README 和本指南，哈希也不能代替发布者身份认证。无需另行下载 Awesome Copilot 工具。

检查目标根目录、Git、基线、Node.js、现有 Agent 指令、Accord 配置、编码实践、文档
与能力注册表，报告拟修改范围。仅存在部分 Accord 文件时，先核对并合并，不能当成
空项目直接覆盖。首次采用与已有安装分别处理：

- 运行文件：复制或合并 `payload/.agents/skills/accord/`；保留本地定制。能取得旧版
  时比较旧版、本地、新版；旧版未知时逐项检查，不能直接覆盖。
- 配置：首次填写项目身份及现有来源路径，默认 compact、本地 Git；更新保留项目身份、
  来源映射和 Git 策略，只合并所需 schema/配置差异。
- 入口：将 payload 中两个入口区块原位合并到 `AGENTS.md` 和 Copilot 指令；
  已有区块只更新一次，区块外内容全部保留。
- 实践与文档：仅创建缺少的标准文件；更新保留已有内容、模块 ID 和审核记录。
  初始实践先发现已有规范，再问用户哪些需要迁移，不自动宣布为已批准规则。
- 能力：同步目录、路由、快照和运行文件，保留已安装 registry、用户触发词和其他 Skills。
- 状态与许可：迁移工作与证据，移除旧载体，保留项目 LICENSE；使用 `ACCORD-LICENSE` 保留
  Accord MIT 声明，并保留第三方许可。

按 `payload/.agents/skills/accord/references/adoption-and-update.md` 执行共同的
合并与恢复约束。`accord-adoption.mjs` 只输出检查结果、更新计划或安装记录，不执行安装。
审阅来源后，以 `--mode verify-package --package <发布目录>`，再以
`--mode plan --project <目标根目录> --package <发布目录>` 检查；
有旧版时增加 `--previous-package <记录对应的旧发布目录>`。参数使用实际检查过的路径，
旧包必须与安装记录匹配。本地定制应成为局部保留／合并事项，不是重置整个项目的理由。
把 plan 当作完整文件清单：每个 payload action 都必须有处理结果；只复制 payload 的一部分不算更新完成。
同时报告 `from_release`、`to_release` 和 `version_transition`；降级或未知版本转换必须先取得我的明确决定。

不要把发布仓库的 `.git/`、README、本指南或展开的 `vendor/` 放入目标项目。不要
整目录覆盖 `.agents/`、`.accord/` 或 `docs/`，也不要清理无关未提交修改。
过时受管文件需确认归属、替代关系和删除授权后才移除。

无冲突且已授权的步骤直接继续。只有未解决的冲突、影响行为的迁移选择，或未授权操作
才需要询问；不能仅因项目已有 Accord 就停止更新。

### 文档与版本迁移

按运行文件中的 `SKILL.md` 路由到相关说明。首次生成项目文档时，按
`references/knowledge-acquisition.md` 使用初始知识路由、两个审核方法和有限清单器，
从项目证据生成标准 `docs/` 文档及真实模块清单，附来源路径。需求、设计输入、V&V
等继续保存在各自权威记录中。只有用户确认覆盖范围、冲突和缺口，且观察版本满足要求
后，才能将 manifest 从 `draft` 改为 `current`。

更新运行文件不等于需要重建全部文档。有实际事实或结构变化时才按影响刷新；旧
`docs/knowledge/` 应先解决旧布局冲突，再提出登记迁移方案，保留用户内容和历史 Record。
校验通过不能自动把旧知识状态改成 `current`。

新项目采用知识结构 2.0、配置 0.10、协议 0.11.0。入口标记仍为 0.8，路由/registry
仍为 1.3/1.1。按 `references/project-knowledge.md` 配置分层模块和可修改的文档政策；
按 `references/team-work.md` 选择 Issue/PR 或本地工作载体，以及委托或模块独立决策模式。
配置真实负责人和权限域；默认的本地示例身份不能证明 GitHub 评审者身份。

更新直接迁移到当前格式。用 `accord-migrate.mjs --project <目标根目录>` 得到单向
元数据转换建议，保留稳定 ID 和有用内容，解决实际冲突，一起更新登记、配置和政策。
活动工作转到 Issue/PR 或本地 work，持久结论归入规范所有者；随后移除旧 Change/Record
文件、读取器、模板及 `sources.engineering`、`changes`、`records` 配置，不保留冲突旧流程。
历史交给 Git，不能从旧观察推导新批准。安装收据更新为 1.1，旧收据仅作为迁移输入。
精确比较支持 JSON Schema/OpenAPI JSON，其他语言仍需有界核实。

当前运行文件只支持路由 schema 1.3，包含现有测试栈 V&V 和浏览器测试
路由时，审核并同步合并路由、目录、运行文件和入口，保留自定义触发词、授权及输出。
浏览器工具和依赖仍需单独批准。`--task` 只对明确、肯定的单一意图选择路由；已审核的完整
工作流别名（例如 `organize project documentation and knowledge` 或 `整理项目文档和知识库`）
也可直接选择。否定、引号、追加动作的复合请求或多路由请求仍返回候选，Agent 理解实际范围
后再选择显式意图。

新采用使用路由 schema 1.3 和 registry schema 1.1。升级时同时保留项目方法条目、
绑定及已安装 Skills。经批准的方法替换遵循 `references/project-methods.md`；
不要用指南中的默认方法 ID 覆盖项目自定义绑定。

### 验证与完成标准

最终校验前，使用来源辅助脚本的 `--mode record`，指定 `--project`、`--package`、
实际观察到的完整来源 commit（`--revision`）及来源工作树状态
（`--worktree clean|dirty|unknown`），审阅其输出并在已批准的文件合并后保存为
`.accord/installation.json`。新配置要求此记录；在新记录准备好之前保留旧记录。
有意保留的运行文件／入口区块差异通过 `--local-changes` 提供已审核的项目相对路径
JSON 数组，不能把不明变更随意登记为已批准。项目文档和配置无需匹配空白模板。
来源 revision 未知时报告限制，取得预期的固定来源后再记录，不能编造 commit。
没有当前安装收据的项目需完成迁移；不能把部分更新当作已通过校验。

在目标项目根目录运行。将 `<发布目录>` 换成已检查的固定来源目录的绝对路径，
`<完整commit>` 换成实际观察到的完整 revision；来源工具位于 `payload/` 下：

```bash
node "<发布目录>/payload/.agents/skills/accord/scripts/accord-adoption.mjs" --mode verify-installation --project . --package "<发布目录>" --revision <完整commit>
node "<发布目录>/payload/.agents/skills/accord/scripts/accord-validate.mjs" --project . --scope installation
```

`verify-installation` 必须在所有批准的合并完成、并已审阅保存新的
`.accord/installation.json` 后运行。非零结果表示更新不完整，不能报告成功；根据错误定位
缺失或旧文件，重新运行 plan 和 postflight。它检查目标中的发布元数据、每一个 Release
受管 payload 文件、匹配的包摘要、发布/协议版本和有效安装记录，不写入文件。
结果会列出已审核的本地例外；配置迁移和废弃路径的处理须逐项确认，文件一致性检查
不能代替这些决策。不能只运行已安装的旧校验器，它可能不知道新版要求。

确认安装版与来源运行文件内容一致后，不必再执行一次相同的全量校验；有已审核的本地
运行文件定制则单独核实。首次采用检查每个启用路由，更新检查有变化的路由、方法及受影响
调用方。从实际 routes 读取 ID，用 `--intent <route> --methods id,id` 批量加载。
不变贡献可复用同一操作的验证结果，但不能跨操作跳过完整性校验。这些检查不代表方法已
实际分析项目或效果达标。

检查 `git diff --check`、完整 diff、Git status、新文件和两个入口区块；未定制的
运行文件应匹配来源版本，本地合并差异需解释，不能要求项目配置和文档匹配空白模板。
确认再次执行不会重复区块、重置状态或重写已匹配文件。

最后报告发布版本、协议版本、来源网址/路径与完整 revision、安装或更新、修改文件、保留的本地内容、各项
检查状态和结果、知识审核状态、能力注册状态及剩余事项。明确区分“文件已配置”
“机械校验通过”和“知识视图待审核/已接受”。

缺少 Git、Node 或基线时，只请求所需操作；在授权后补跑校验。检查受阻时不能宣称全部
完成。新对话可让 Agent 先说明已读取的 Accord 入口、项目配置、相关路由和已有项目
上下文；这仍不构成所有 Agent 行为都可靠的保证。
