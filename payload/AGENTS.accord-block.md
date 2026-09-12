<!-- accord:begin version="0.8" -->
## Agentic Coding Accord

- Classify answer, diagnose, review, or change; do not expand scope without authority.
- For material work read `.agents/skills/accord/SKILL.md`, `.accord/accord.yaml`, relevant routes, and `docs/agent-context.md`.
- For documentation/knowledge creation or broad refresh, run `node .agents/skills/accord/scripts/accord-route.mjs --project . --intent initial-knowledge` (or `knowledge-refresh`). Satisfy required contributions; load conditional ones only when applicable. Reuse valid evidence; `--methods id,id` batches loading. Ordinary questions read the smallest document.
- Clear user direction can decide and authorize its scoped delta. Reuse it; ask only missing material choices.
- Human authority controls material decisions, installation, Git, external effects, and acceptance. L2-L4 needs approved Design Inputs and Git; L3-L4 also needs a recoverable checkpoint.
- Verify Design Inputs and intended use at the observed revision; report passed, failed, unavailable, or not run. Preserve canonical sources and unmanaged Skills.
<!-- accord:end -->
