# Agentic Coding Accord

[English](README.md) · [简体中文](README.zh-CN.md)

**一个由人类主导的 Agentic Software Engineering 框架。**

Accord 通过项目内的 Harness，连接用户意图、设计输入、实现与验证和确认（V&V）。
你和 Agent 一起明确要做什么：重要决定与最终接受由你负责，Agent 在约定范围内
分析、实现并收集证据。项目文档持续记录这些决定与实际设计细节，
用于后续开发、交接和知识库查询。

适用于 **Codex 和 VS Code 中的 GitHub Copilot**。由指令、模板和本地脚本组成，
不是另一个 Coding Agent，也不需要专用安装器或常驻服务。

> 当前版本主要面向一位负责人主导的人机协作开发，可用于共享 Git 仓库，
> 但尚未提供完整的多人决策与团队治理机制。相关机制正在研究，未来可能作为
> Accord 的扩展或独立项目提供；形式与时间尚未确定。

[快速开始](#快速开始) · [工作方式](#工作方式) · [项目文档与知识库](#项目文档与知识库) · [内置方法](#awesome-copilot-方法)

## 为什么用 Accord？

Agent 可以很快写出代码。但用户要什么、系统实际做了什么、文档是否还准确，
不能只靠聊天记录来维持。

- **共同明确要实现的行为。** 和 Agent 一起梳理需求、依赖与取舍，尚未解决的重要选择留给你决定。
- **让评审有明确依据。** 将用户需求、已确认的设计输入与 V&V 证据关联起来，不只看测试是否通过。
- **留下可用的项目知识。** 记录架构、模块功能、接口和数据约定；系统变更时同步更新受影响内容。
- **让工作方式随项目迁移。** 共享指令、编码实践和已审核方法保存在仓库中，供新会话、新机器继续使用。

## 快速开始

需要 Git、Node.js，以及能读写项目文件和执行命令的 Coding Agent。
从 GitHub 获取 Accord 需要联网，也可以使用提前准备好的本地副本。
你的项目不必托管在 GitHub 上。

### 1. 让 Agent 安装 Accord

在 Codex 或 GitHub Copilot Agent 模式中打开**目标项目**，粘贴：

```text
请从以下仓库为当前项目安装或更新 Accord：
https://github.com/khuang9104/Agentic-Coding-Accord

获取独立的来源副本，记录完整 commit，并遵循同一副本中的
CONFIGURE_WITH_AGENT.md。
保留现有项目文档、配置、Skills、历史记录，以及 Agent 指令中的
非 Accord 内容。直接执行无冲突的合并；遇到未解决的冲突或尚未
授权的操作时再询问。
使用该来源副本中的工具验证发布包和安装结果。
报告更新前后版本、来源 commit、变更、校验结果和剩余事项。
不要把部分更新报告为全部完成。
```

Agent 会合并 Codex 与 Copilot 的入口指令、配置 Accord、检查已有编码实践，
并生成或刷新项目文档。Git 初始化、commit 和依赖安装需要相应授权；
已经授权的步骤不重复询问。生成的项目事实仍需审核。

**以后更新：** 使用同一段提示词。已有项目内容按差异合并，不重置成空白模板。
离线部署时，将网址换成提前下载的来源副本路径。

手动复制、版本追踪、冲突处理和旧版迁移见[安装与更新指南](CONFIGURE_WITH_AGENT.md#中文)。
仅复制 `payload/` 并不代表配置完成。

**可选 Copilot 插件：** 可以从本仓库的插件目录安装
[项目配置入口](plugins/agentic-coding-accord/README.md)，使用固定的已测试发布版本
初始化、检查或更新项目。插件升级不会自动改动项目；请再让 Agent 更新项目并验证合并结果。
上面的 Prompt 安装方式仍适用于 Codex 和 Copilot。

### 2. 用正常的项目请求开始

不需要记忆新的斜杠命令。例如：

```text
增加发货前取消订单的功能，保持已完成订单的行为不变。
先帮我澄清退款和库存恢复规则，再提出设计输入与验收场景。
尚未决定的选择保持待定，不要替我确认。
```

已有项目也可以从文档开始：

```text
整理项目文档和知识库，覆盖架构、模块功能、API 输入输出、
数据库字段和枚举。复用已有文档，区分确认的需求与代码实际行为，
列出还不清楚或缺失的内容。
```

明确指令可以同时表达决定和实施授权。Accord 只追问缺少的重要选择，
不要求用户反复批准同一件事。

## 工作方式

Accord 的人机协作不只是在结尾请用户批准。Agent 参与问题梳理和方案探索，
遇到影响结果的重要不确定性时，请用户参与决策。目标是在明确边界内自主执行，
减少不必要的确认和返工，而不是让人退出工程决策。

流程采用 **V 模型的思路**：先定义结果需要满足什么，再将验证与确认作为
贯穿变更过程的反馈机制。

| 阶段 | 具体做什么 |
| --- | --- |
| 澄清需求 | Agent 和用户梳理目标、受影响模块、使用场景与取舍。 |
| 定义输入 | 将已达成一致的要求转为**设计输入**：行为、约束、接口与数据约定、验收条件。 |
| 实施变更 | Agent 在授权范围内执行；用 **Change** 记录本次差异、决定和证据引用。 |
| Verification（验证） | 检查实现是否符合已批准的需求和设计输入。 |
| Validation（确认） | 在有代表性的整体使用场景中，检查结果是否满足用户需求。 |
| 用户接受 | 用户评审证据与剩余缺口；结果提交后，以精简 Record 关联对应 Git 版本。 |

新增或变更需求时，只重新处理受影响的决定。旧文档和测试是当前基线，
不能否决用户有意改变的方向。小范围、可逆修改采用相应检查，
不必走完整的重大变更流程。

### Harness 如何起作用？

Accord 的 Harness 是建立在现有 Coding Agent 之上的项目级工程层。
Prompt Engineering 用于组织指令，Context Engineering 用于选择相关项目知识，
任务路由、产物规范与本地校验器支持执行和反馈。Agent 负责实际工作，
脚本检查声明的结构、引用和完整性；Accord 不替代 Agent 本身的执行循环、权限或沙箱。

```text
目标项目
├── AGENTS.md + .github/copilot-instructions.md   原位合并的 Agent 入口
├── .agents/skills/accord/                       共享流程与本地工具
├── .accord/                                    配置、Change、Record 与方法
└── docs/                                       项目知识与编码实践
```

短入口将两个 Agent 引向同一套流程。具体步骤、模块细节和方法按需读取，
已完成的历史记录不作为默认上下文。Git 用于版本控制、差异检查和恢复，
不是额外的审批流程。用户接受结果，不意味着必须立刻 commit 或 push。

这套方法将已有的需求工程与 V&V，和当前的人机协作、Harness 设计方向结合起来。
相关阅读：[Agentic Software Engineering 研究路线图](https://arxiv.org/abs/2509.06216)、
[Anthropic 的 Context Engineering 实践](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)、
[OpenAI 的 Harness Engineering 实践](https://openai.com/index/harness-engineering/)。
Accord 是面向实际项目的组合与适配，并非上述工作的参考实现。

## 项目文档与知识库

Accord 引导 Agent 结合已有文档和必要的代码检查，建立统一项目参考，
并在后续变更中持续维护。

| 项目路径 | 用途 |
| --- | --- |
| `docs/README.md`、`docs/manifest.yaml` | 导航、模块清单、审核状态与缺口 |
| `docs/agent-context.md` | 开始编程时使用的精简上下文 |
| `docs/system-overview.md`、`docs/architecture.md` | 系统目标、边界、组件与运行流程 |
| `docs/interfaces-and-data.md` | 接口与数据归属概览 |
| `docs/modules/<module-id>.md` | 模块功能、输入输出、数据与状态规则、依赖 |
| 已登记的细节文档与 `docs/contracts/<module-id>/` | 较大的模块细节，以及适用的机器可读契约 |
| `docs/glossary.md` | 项目术语与别名 |

目标不是只有架构摘要：适用的字段、枚举、默认值、错误处理和状态转换，
都应落在对应模块或契约中。需求、设计输入、决定和 V&V 保留原有权威来源，
通过引用关联，不重复复制。

变更时原位修正过时内容；模块及依赖的观察记录帮助判断哪些文档需要复核，
历史交给 Git。**是否过期、覆盖是否充分、能否脱离源码重建，是不同的评估结论。**

交接或接入外部知识库时，在目标项目中导出明确的、不含源码的文档集合：

```sh
node .agents/skills/accord/scripts/accord-knowledge-export.mjs --project . --mode query --output ../project-knowledge
```

导出包含选定文档和完整性收据，不包含源码或 Agent 的精简上下文缓存。
对外分享前仍需审阅。文档可以支持在约定范围内重建等价行为，
但导出成功本身不代表资料完整，也不代表已经通过重建验证。

[文档契约](payload/.agents/skills/accord/references/engineering-documents.md) · [查询与导出说明](payload/.agents/skills/accord/references/knowledge-query-and-refresh.md)

## Awesome Copilot 方法

Accord 适配了 [GitHub Awesome Copilot](https://github.com/github/awesome-copilot/tree/7b1ebe6333397841ca918dec904d24d4695fe953)
中的七种方法。已审核源码以 MIT 协议随包提供，固定在 commit `7b1ebe633339`，
使用这些内置方法不依赖上游持续在线。

适配由 Accord 维护，保留上游版权与 MIT 许可声明。
Accord 是独立项目，与 GitHub 无隶属关系，也不代表其官方认可或背书。

| 方法 | 在 Accord 中的用途 |
| --- | --- |
| `acquire-codebase-knowledge` | 仓库理解与文档清单整理 |
| `arch` | 带源码引用的架构分析 |
| `context-engineering` | 当前 Change 的必要上下文与影响分析 |
| `documentation-writer` | 面向读者的技术文档写作 |
| `bug-reproduction-brief` | 可重复的缺陷证据 |
| `refactor-plan` | 考虑依赖关系的重构计划 |
| `webapp-testing` | 使用已具备且获授权的工具检查浏览器场景 |

这些是**经过适配的方法，不是自动安装的上游插件**。产物位置和权限仍由 Accord 约束。
选择或加载方法不等于实际应用，Agent 需要说明真实使用情况。
测试沿用项目本身的语言、平台和测试工具。

Accord 还借鉴了 `code-tour` 中先检查项目、再询问用户的交互方式。
`project-documenter`、`drawio` 和 `md-to-docx` 是可选的展示输出能力，默认停用。
详见[能力目录](payload/.accord/capabilities/catalog/index.yaml)与[上游许可](vendor/awesome-copilot/7b1ebe633339/LICENSE)。

## 自定义与改进

编码习惯保存在 `docs/engineering/coding-practices.md` 或配置指定的文件中。
初次配置时，Agent 先检查已有规则，再询问采用哪些内容。
用户自行安装的 Skills 仍然可用，不会自动被 Accord 接管。

你可以让 Agent 评估、增加或替换某个方法；启用前需要审核其范围、效果证据、
依赖与权限。重复出现的问题可以转化为经批准的编码实践、可执行检查或方法调整，
不会自动堆进主指令。

[方法扩展](payload/.agents/skills/accord/references/project-methods.md) · [项目内改进](payload/.agents/skills/accord/references/project-improvement.md)

## 校验与边界

在已部署 Accord 的项目中查看本地版本，或执行全量审计：

```sh
node .agents/skills/accord/scripts/accord-adoption.mjs --mode status --project .
node .agents/skills/accord/scripts/accord-validate.mjs --project . --scope audit
```

日常工作使用更小范围的安装、任务或交付检查；结果区分已检查与未覆盖的范围。

Accord 是基于指令的 Harness，不是运行时安全隔离机制。
校验器不能证明 Agent 已正确理解用户、文档一定完整，或结果应该被接受，
这些仍需要人工评审。安装和 Git 写操作需要相应授权，push 是独立操作。
Accord 不运行后台服务，也不自主升级。

## 许可证

[MIT](LICENSE)。随包提供的第三方源码保留其上游许可声明。
