# Accord for Copilot

Set up, inspect or update the repository-local Accord workflow from Copilot.
The plugin provides one `accord-project` skill. After setup, the project retains
its own requirements, design inputs, V&V, documentation and Accord runtime for
use across sessions, machines, Codex and Copilot.

## Install and use

```sh
copilot plugin marketplace add khuang9104/Agentic-Coding-Accord
copilot plugin install agentic-coding-accord@agentic-coding-accord
```

Then open your target project and ask:

```text
Use accord-project to set up or update Accord in this project with the plugin's
tested distribution. Preserve existing project content and custom rules, resolve
only material conflicts with me, and verify the complete installation.
```

For an inspection without updates:

```text
Use accord-project to report this project's Accord version and installation state.
```

Git and Node.js are needed for project adoption. Fetching the pinned distribution
needs network access; an existing matching local checkout works offline. The
plugin does not bundle these prerequisites or install them automatically.

## Updates and boundaries

The plugin has its own version. `skills/accord-project/references/distribution.json`
pins the tested framework release, full commit and package digest. Project
provenance lives in `.accord/installation.json` after adoption.

```sh
copilot plugin marketplace update agentic-coding-accord
copilot plugin update agentic-coding-accord
```

This updates only the plugin. Repeat the project setup/update request to merge
the selected release into a project and verify every managed file. There is no
background migration. A newer project is never silently downgraded to the lock.
Users can explicitly select another official release; the Agent reports the
difference from the tested lock.

The plugin contains no hooks, MCP servers or copied third-party skills. It uses
the official distribution's shared procedure and its reviewed method snapshots.
Uninstalling the plugin leaves adopted projects intact. Instruction adherence
and successful checks do not prove requirement understanding or acceptance.

The marketplace above is maintained in the Accord repository. It is not an
Awesome Copilot listing or a claim of upstream approval.

MIT. Independent project; not affiliated with or endorsed by GitHub.
