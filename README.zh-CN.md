# Agentic Coding Accord

[English](README.md) · [简体中文](README.zh-CN.md)

**面向人机协作开发的仓库级软件工程协议与 Agent Harness。**

Accord 将**需求与设计输入、模块契约、项目知识、验证与确认（V&V）以及决策权限**
纳入同一套版本化工程流程。人类负责目标、关键取舍与验收；Coding Agent 在授权范围内
执行分析、实现和验证，并维护可追溯的工程证据。

适用于 **Codex 和 VS Code 中的 GitHub Copilot**。协议以共享指令、可配置文档政策和
本地校验工具保存在 Git 仓库中，支持跨会话协作、本地离线开发及可选的 GitHub 集成。

[核心能力](#核心能力) · [快速开始](#快速开始) · [工程流程](#工程流程) · [项目知识](#项目文档与知识库) · [协作治理](#协作治理) · [方法扩展](#方法与扩展)

## 核心能力

| 能力模块 | 工程机制 | 作用 |
| --- | --- | --- |
| **需求与设计输入** | 明确目标行为、质量约束、接口契约和验收条件，关联需求、实现与证据 | 为 Agent 实施和人工评审提供一致的依据 |
| **上下文与知识管理** | 按任务路由，登记层级模块与文档来源，结合依赖分析定位受影响范围 | 按需加载上下文，持续维护开发与运维知识 |
| **验证与确认** | 对照设计输入执行 Verification，对照使用场景执行 Validation；证据关联 Git 版本与输入摘要 | 区分实现符合性、需求满足情况和未验证范围 |
| **协作与决策治理** | 以 Issue/PR 或本地工作项承载变更，配置委托式或联邦式治理 | 明确模块权限、跨域批准要求与集成责任 |

这些能力围绕当前任务组合使用。普通问答读取相关来源；局部修改检查受影响边界；
跨模块或高风险工作补充相应的设计、影响分析与验证。已有决定和证据在适用条件不变时复用。

## 快速开始

前提：Git、Node.js，以及具备项目文件和命令访问能力的 Coding Agent。
可使用官方仓库或预先获取的本地来源副本；目标项目可以仅使用本地 Git。

### 1. 安装或更新项目配置

在 Codex 或 GitHub Copilot Agent 模式中打开**目标项目**，提交以下请求：

```text
请从以下官方仓库为当前项目安装或更新 Accord：
https://github.com/khuang9104/Agentic-Coding-Accord

获取独立来源副本，记录完整 commit，并遵循同一副本中的
CONFIGURE_WITH_AGENT.md。保留现有项目文档、配置、Skills 和
Agent 指令中的非 Accord 内容。执行已授权且无冲突的合并；
汇总尚未解决的实质冲突或授权缺口。
使用该来源副本的工具验证发布包及安装结果，报告版本、来源、
变更、校验结果和未完成事项。
```

Agent 将合并入口指令、配置工程政策并关联已有项目资料。首次接入建立项目知识视图；
后续更新按差异迁移。Git 初始化、提交及依赖安装遵循适用授权，已授权事项无需再次确认。
离线接入时，将 URL 替换为已获取的来源副本路径。

[安装与更新指南](CONFIGURE_WITH_AGENT.md#中文)提供完整的配置、迁移和来源验证步骤。
当前副本的版本见[发布元数据](RELEASE.json)。

**可选 Copilot 插件：** [Accord 项目配置入口](plugins/agentic-coding-accord/README.md)
提供安装、版本检查和更新入口，并锁定已测试的分发版本。插件升级与目标项目升级相互独立；
插件锁定版本也可能落后于默认分支。上述提示词方式同时适用于 Codex 和 Copilot。

### 2. 提交工程任务

直接描述预期行为、约束和工作范围：

```text
增加发货前取消订单的功能，保持已完成订单的行为不变。
明确退款与库存恢复规则，形成设计输入和验收场景；
仅对尚未确定且影响行为的选择向我提问，再完成实现与验证。
```

已有项目也可以先建立知识基础：

```text
整理项目文档和知识库，覆盖系统架构、模块职责、API 契约、
数据字段、枚举和运行维护流程。复用已有权威来源，
区分已确认需求与代码实际行为，报告缺失或无法验证的内容。
```

## 工程流程

Accord 将需求工程、契约设计与 V&V 组织为可迭代流程：

| 阶段 | 输入与输出 |
| --- | --- |
| 需求分析 | 明确利益相关方、使用场景、目标行为、范围及关键取舍 |
| 设计输入 | 将已确认需求转化为行为、接口、数据、质量约束及可判定的验收条件 |
| 实现 | 在授权边界内修改代码与相关工程资料，由现有工作项记录差异和决策依据 |
| Verification（验证） | 检查实现是否符合需求与设计输入，记录测试或分析证据 |
| Validation（确认） | 在代表性使用场景中评估集成结果是否满足用户需求 |
| 验收 | 由具备相应权限的负责人评审结果、证据及剩余缺口，关联实际版本 |

该流程借鉴 V 模型中需求、设计与验证活动的对应关系，并支持增量实施与反馈。
需求变化只重新评估受影响的决定；现有文档、代码和测试构成可修订的基线。
验收、提交、合并和部署是独立事件。

测试采用三个检查点：明确可观察的验收条件、检查每个有意义的增量、交付前评审范围内的证据。
可独立存放的测试资产集中到可配置的 `tests/` 目录。按影响范围选测并复用有效证据，
同一次结果可同时支撑 Verification 和 Validation；必要证据缺失或过期时，明确保留交付缺口。

[V&V 流程与证据契约](payload/.agents/skills/accord/references/vv-contract.md)

## Agent 运行机制

Accord 通过简短入口将 Agent 路由到当前任务所需的流程、知识来源和方法。
Agent 执行推理与工程操作；本地工具检查声明结构、引用、内容完整性和证据状态。

```text
目标项目
├── AGENTS.md + .github/copilot-instructions.md   Agent 入口
├── .agents/skills/accord/                       共享协议、流程与本地工具
├── .accord/                                    项目配置、治理政策与可选本地工作项
└── docs/                                       项目知识登记、文档与编码实践
```

**上下文管理。** 根据需求、模块或文档引用选择相关来源，再沿父级、依赖和文档引用扩展。
涉及契约变化时，同时检查消费者、共享数据、配置和动态注册边界。已完成工作与无关历史
不作为默认上下文；声明图之外的关系通过代码检查和测试确认，未知部分保持显式缺口。

**模块化设计。** 模块契约描述前置条件、输出保证、错误行为、状态转换及副作用。
等价内部实现由 Agent 自主选择；影响外部可观察行为的决定按治理政策处理。
Schema、类型和测试保留精确的可执行事实，文档说明职责、约束与设计依据。

[上下文与影响分析](payload/.agents/skills/accord/references/project-knowledge.md#route-and-inspect)

## 项目文档与知识库

开发文档和运维知识使用统一登记，每项事实保留一个权威维护位置。
文档范围覆盖系统、模块、子模块及重要组件，按工程重要性确定描述深度。

### 文档组织与覆盖

| 来源 | 内容 |
| --- | --- |
| 项目知识登记 | 文档与模块的稳定标识、路径、引用、状态、受众和覆盖缺口 |
| 系统级文档 | 用户需求、设计输入、架构、系统约束、接口与数据归属 |
| 模块／组件文档 | 职责、契约、状态与错误行为、依赖、源码映射、测试及运维信息 |
| 可执行契约与证据 | Schema、类型、测试，以及与实际版本关联的 V&V 结果 |
| 编码上下文导航 | 可选的常用命令、关键路径和检索入口 |

`.accord/documentation-policy.yaml` 定义按模块类型适用的主题、合并或拆分方式，
以及可选的文件数量约束。`docs/manifest.yaml` 登记系统文档与层级模块元数据；
已有文档可以继续使用原路径，重要类可登记为组件，普通内部实现可通过文件索引覆盖。

目标是提供足以重现约定架构、模块、功能和文件组织的工程信息。内容随受影响的实现与
需求更新，历史由 Git 保存。内容新鲜度、语义覆盖和重建验证分别评估。

### 运维检索与发布

在目标项目中导出不含源码的知识集合：

```sh
node .agents/skills/accord/scripts/accord-knowledge-export.mjs --project . --mode query --output ../project-knowledge
```

导出包含选定文档与完整性收据。面向 SharePoint、Copilot Studio 或自建检索 Agent 的
下游 pipeline，可以进一步获取发布清单：

```sh
node .agents/skills/accord/scripts/accord-project.mjs --project . --publish --audience operations
```

清单包含稳定 ID、内容哈希、必要引用、审核状态和遗漏；提供同一选择范围的
`--previous` 清单可识别删除项。下游 pipeline 负责格式转换、索引、访问控制和部署版本绑定。
Accord 不直接向 SharePoint 发布。

[文档政策与格式](payload/.agents/skills/accord/references/project-knowledge.md) · [查询与导出](payload/.agents/skills/accord/references/knowledge-query-and-refresh.md)

## 协作治理

工作过程优先使用 Issue/PR，离线场景使用本地工作项。需求与设计输入作为持久工程资产
保存在各自来源中；工作项记录本次变更的目标、范围、决定和证据引用。
活动工作索引按需查询，已关闭工作的讨论正文不进入默认上下文。

`.accord/governance.yaml` 支持两种决策权限模型：

| 模式 | 权限模型 | 跨模块变更 |
| --- | --- | --- |
| **委托式治理** `delegated` | 项目负责人保留项目级决策权限，模块成员在受委托范围内行使权限 | 由项目负责人批准，或由各受影响域的授权成员分别批准 |
| **联邦式治理** `federated` | 各模块域具有独立决策权限，共享约束通过显式系统域管理 | 每个受影响域分别批准；项目负责人不具有隐含的跨域覆盖权限 |

委托式模式下，政策或归属变更、共享系统范围及显式执行授权要求项目级权限；
联邦式模式下，政策或归属变更要求所有现有域批准。两者均使用变更前的可信政策审核。
并行开发需明确写入范围、共同基线、
依赖及集成责任，按需使用分支或 worktree。任务基线由 Git commit 和相关输入版本组成，
无关提交不自动使需求决定失效。

GitHub 适配器读取目标分支政策，检查绑定 PR head、target 和批准范围的审查证据。
当前远程检查在 target 变化后要求新的批准标记；CI、分支保护和合并资格仍由目标仓库管理。

[工作项、基线与治理契约](payload/.agents/skills/accord/references/team-work.md)

## 方法与扩展

Accord 按任务适配七种来自
[GitHub Awesome Copilot](https://github.com/github/awesome-copilot/tree/7b1ebe6333397841ca918dec904d24d4695fe953)
的方法。已审核源码固定在 commit `7b1ebe633339`，随包保留 MIT 许可与版权声明，
可离线加载；方法所需的执行工具仍由项目环境提供。

| 方法 | 职责 |
| --- | --- |
| `acquire-codebase-knowledge` | 仓库发现与知识来源整理 |
| `arch` | 基于源码证据的架构分析 |
| `context-engineering` | 任务上下文与影响范围分析 |
| `documentation-writer` | 面向读者任务的技术文档写作 |
| `bug-reproduction-brief` | 最小、可重复的缺陷证据 |
| `refactor-plan` | 依赖顺序、行为保持与恢复方案 |
| `webapp-testing` | 基于已具备且获授权工具的浏览器场景验证 |

方法加载、实际应用和验证具有不同状态。启用新增或替代方法前，需审核适用范围、
效果证据、依赖与权限。项目编码实践独立维护，用户已有 Skills 保持可用。
反复出现的工程问题可以转化为经批准的规则、检查或方法调整。

`code-tour` 提供先检查项目再询问的交互参考；`project-documenter`、`drawio` 和
`md-to-docx` 为默认停用的可选展示能力。Accord 是独立项目，与 GitHub 无隶属或背书关系。

[能力目录](payload/.accord/capabilities/catalog/index.yaml) · [方法扩展](payload/.agents/skills/accord/references/project-methods.md) · [持续改进](payload/.agents/skills/accord/references/project-improvement.md) · [上游许可](vendor/awesome-copilot/7b1ebe633339/LICENSE)

## 校验与边界

在已接入 Accord 的项目中查看安装状态：

```sh
node .agents/skills/accord/scripts/accord-adoption.mjs --mode status --project .
```

安装、任务和交付使用各自范围的检查；检查结果同时报告已覆盖内容和缺口。
需要包含本地归档工作的全量审计时运行：

```sh
node .agents/skills/accord/scripts/accord-validate.mjs --project . --scope audit
```

Accord 是基于指令与工具的工程 Harness。Agent 的执行权限与沙箱由宿主环境提供；
机械校验能够发现结构、引用、版本或证据状态问题，需求理解、语义完整性与最终验收仍需评审。
Accord 使用本地脚本，不运行常驻服务或执行自主升级。

## 许可证

[MIT](LICENSE)。随包提供的第三方源码保留其上游许可声明。
