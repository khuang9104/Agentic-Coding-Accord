#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { readAndVerifyCapabilityBundle } from './accord-capability-bundle.mjs';
import { validateRouteConfig, inspectRouteMethods, readRouteMethods } from './accord-route.mjs';
import { inspectInstallation } from './accord-adoption.mjs';
import { parseExactJson, safeContractPath } from './accord-contracts.mjs';
import { CAPABILITY_POLICY } from './accord-methods.mjs';
import { loadProjectModel, validateProjectKnowledge, readJson, relativePath } from './accord-project.mjs';
import { validateGovernancePolicy, POLICY_PATH } from './accord-governance.mjs';
import { validateWorkItem, indexLocalWork } from './accord-work.mjs';
import { CONFIG_SCHEMA, PROTOCOL_VERSION, RISK_LEVELS, MATERIAL_RISKS, VALIDATION_SCOPES, BUDGET_KEYS } from './accord-protocol.mjs';

const ACCORD_SCHEMA_VERSION = CONFIG_SCHEMA;
const ACCORD_VERSION = PROTOCOL_VERSION;
const KNOWLEDGE_ROOT = 'docs';
const KNOWLEDGE_MANIFEST = 'docs/manifest.yaml';
const CAPABILITY_CATALOG_INDEX = '.accord/capabilities/catalog/index.yaml';
const CAPABILITY_CATALOG_EXPORT = '.accord/capabilities/catalog.yaml';
const CAPABILITY_REGISTRY = '.accord/capabilities/registry.yaml';
const CAPABILITY_ROUTES = '.accord/capabilities/routes.yaml';

function runGit(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.error) {
    return { ok: false, stdout: '', stderr: result.error.message };
  }

  return {
    ok: result.status === 0,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim()
  };
}

function readText(filePath, errors, label) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    errors.push('Missing ' + label + ': ' + filePath);
    return '';
  }
}

function managedBlock(text, begin, end) {
  const start = text.indexOf(begin);
  if (start < 0 || text.indexOf(begin, start + begin.length) >= 0) {
    return '';
  }
  const finish = text.indexOf(end, start + begin.length);
  if (finish < 0 || text.indexOf(end, finish + end.length) >= 0) {
    return '';
  }
  return text.slice(start, finish + end.length);
}

function verifyManagedEntryBlock(text, options, errors) {
  const starts = text.match(options.startPattern) || [];
  if (starts.length !== 1 || starts[0] !== options.begin) {
    errors.push(options.label + ' must use exactly one Accord 0.8 start marker and no legacy block.');
    return '';
  }
  const block = managedBlock(text, options.begin, options.end);
  if (!block) {
    errors.push(options.label + ' must contain exactly one complete Accord 0.8 managed block.');
    return '';
  }
  for (const required of [
    '.agents/skills/accord/SKILL.md',
    '.accord/accord.yaml',
    'human',
    'Design Input',
    'Git'
  ]) {
    if (!block.toLowerCase().includes(required.toLowerCase())) {
      errors.push(options.label + ' managed block is missing required routing semantics: ' + required + '.');
    }
  }
  if (block.length > 1200) {
    errors.push(options.label + ' Accord managed block exceeds the 1200-character context budget.');
  }
  return block;
}

function loadConfiguration(projectRoot, errors) {
  const configPath = path.join(projectRoot, '.accord', 'accord.yaml');
  const text = readText(configPath, errors, 'Accord configuration');
  if (!text) {
    return null;
  }

  try {
    return parseExactJson(text);
  } catch (error) {
    errors.push(
      'Accord configuration must be JSON-compatible YAML so the vendored validator can read it: ' +
      error.message
    );
    return null;
  }
}

export function verifyConfiguration(config, errors) {
  if (!config) {
    return;
  }

  if (config.schema_version !== ACCORD_SCHEMA_VERSION) errors.push('Migrate configuration to schema ' + ACCORD_SCHEMA_VERSION + ' before use.');
  if (config.accord?.version !== ACCORD_VERSION) errors.push('Expected accord.version ' + ACCORD_VERSION + '.');

  if (config.accord?.release !== undefined && !/^\d+\.\d+\.\d+$/.test(config.accord.release)) {
    errors.push('Expected accord.release to be a semantic release version.');
  }

  if (config.schema_version === '0.9') {
    try { relativePath(config.documentation?.policy); relativePath(config.work?.local_directory); }
    catch (e) { errors.push(e.message); }
    if (config.governance?.policy !== POLICY_PATH || !['github-preferred', 'local'].includes(config.work?.carrier)) errors.push('Configuration 0.9 requires versioned governance and an explicit work carrier.');
  }

  if (!['compact', 'standard', 'assurance'].includes(config.information?.profile)) {
    errors.push('information.profile must be compact, standard, or assurance.');
  }

  if (config.repository?.vcs !== 'git') {
    errors.push('repository.vcs must be git.');
  }

  if (config.version_control?.required !== true) {
    errors.push('version_control.required must be true.');
  }

  if (config.version_control?.initialization !== 'user-approved') {
    errors.push('version_control.initialization must be user-approved.');
  }

  if (!['manual', 'propose'].includes(config.version_control?.commit_mode)) {
    errors.push('version_control.commit_mode must be manual or propose; automatic commits are not defined by Accord.');
  }

  if (config.version_control?.push_mode !== 'explicit') {
    errors.push('version_control.push_mode must be explicit.');
  }

  if (config.version_control?.baseline_commit_required !== true) {
    errors.push('version_control.baseline_commit_required must be true.');
  }

  if (config.version_control?.l3_l4_checkpoint_required !== true) {
    errors.push('version_control.l3_l4_checkpoint_required must be true.');
  }

  if (!['none', 'optional', 'required'].includes(config.repository?.remote?.mode)) {
    errors.push('repository.remote.mode must be none, optional, or required.');
  }

  const expectedKnowledgeConfiguration = {
    required: true,
    root: KNOWLEDGE_ROOT,
    manifest: KNOWLEDGE_MANIFEST,
    source_content_included: false,
    generation_mode: 'agent-derived',
    refresh_policy: 'change-impact'
  };
  for (const [key, expected] of Object.entries(expectedKnowledgeConfiguration)) {
    if (config.knowledge_base?.[key] !== expected) {
      errors.push('knowledge_base.' + key + ' must be ' + JSON.stringify(expected) + '.');
    }
  }
  if (config.knowledge_base?.structure_version !== '2.0') errors.push('Migrate knowledge to 2.0 before use.');
  if (config.sources?.engineering !== undefined || config.changes !== undefined || config.records !== undefined) errors.push('Remove retired engineering/Change/Record configuration after migration.');
  if (config.clarification?.mode !== 'intent-aligned') {
    errors.push('clarification.mode must be intent-aligned; assumptions do not grant approval.');
  }
  const inventory = config.knowledge_base?.inventory;
  if (inventory?.respect_gitignore !== true) {
    errors.push('knowledge_base.inventory.respect_gitignore must be true.');
  }
  for (const [key, [minimum, maximum]] of Object.entries({
    max_depth: [1, 20],
    max_tree_entries: [50, 2000],
    max_category_entries: [10, 500],
    max_files_visited: [100, 100000],
    max_directories_visited: [10, 20000],
    max_duration_ms: [1000, 60000]
  })) {
    if (!Number.isInteger(inventory?.[key]) ||
        inventory[key] < minimum || inventory[key] > maximum) {
      errors.push(
        'knowledge_base.inventory.' + key + ' must be an integer from ' +
        minimum + ' through ' + maximum + '.'
      );
    }
  }
  if (!Array.isArray(config.knowledge_base?.excludes) ||
      config.knowledge_base.excludes.some((value) => typeof value !== 'string')) {
    errors.push('knowledge_base.excludes must be an array of project-relative paths.');
  }
  for (const key of BUDGET_KEYS) {
    const budget = config.knowledge_base?.size_budgets?.[key];
    if (!Number.isInteger(budget) || budget < 1000 || budget > 100000) {
      errors.push('knowledge_base.size_budgets.' + key + ' must be an integer from 1000 through 100000.');
    }
  }
  const questionBudget = config.clarification?.question_budget;
  if (!Number.isInteger(questionBudget?.default_batch_size) || questionBudget.default_batch_size < 1 || questionBudget.default_batch_size > 3 || questionBudget.ask_only_blocking_questions !== true) {
    errors.push('clarification.question_budget must be 1–3 blocking questions per batch.');
  }
  for (const [actual, expected, label] of [
    [config.risk?.levels, [...RISK_LEVELS], 'risk.levels'],
    [config.risk?.approval_policy?.pre_implementation_required, [...MATERIAL_RISKS], 'risk.approval_policy.pre_implementation_required'],
    [config.risk?.approval_policy?.design_review_required, ['L3', 'L4'], 'risk.approval_policy.design_review_required'],
    [config.risk?.approval_policy?.explicit_execution_gate, ['L4'], 'risk.approval_policy.explicit_execution_gate'],
    [config.gates?.design_input_ready?.applies_to, [...MATERIAL_RISKS], 'gates.design_input_ready.applies_to']
  ]) if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push(label + ' is fixed protocol policy, not a configurable approval bypass.');
  if (config.gates?.design_input_ready?.human_confirms_material_baseline !== true) errors.push('Human decision basis is required; a clear direct instruction can provide it.');

  const expectedCapabilityConfiguration = {
    catalog: CAPABILITY_CATALOG_INDEX,
    catalog_export: CAPABILITY_CATALOG_EXPORT,
    registry: CAPABILITY_REGISTRY,
    routes: CAPABILITY_ROUTES,
    install_root: '.agents/skills',
    snapshot_root: '.accord/capabilities/snapshots',
    snapshot_mode: 'compressed-non-discoverable',
    snapshot_integrity: 'bundle-file-and-pinned-tree-sha',
    discovery: 'need-driven-user-choice',
    installation: 'explicit-human-approval',
    dependency_installation: 'separate-explicit-human-approval',
    updates: 'explicit-human-approval',
    removal: 'explicit-human-approval',
    unmanaged_use: 'allowed-record-material-use',
    unmanaged_lifecycle: 'user-controlled'
  };
  for (const [key, expected] of Object.entries(expectedCapabilityConfiguration)) {
    if (config.capabilities?.[key] !== expected) {
      errors.push('capabilities.' + key + ' must be ' + JSON.stringify(expected) + '.');
    }
  }
}

function loadJsonCompatible(projectRoot, relativePath, label, errors) {
  const text = readText(path.join(projectRoot, relativePath), errors, label);
  if (!text) {
    return null;
  }

  try {
    return parseExactJson(text);
  } catch (error) {
    errors.push(label + ' must be JSON-compatible YAML: ' + error.message);
    return null;
  }
}

function projectSkillPaths(projectRoot) {
  const found = [];
  for (const relativeRoot of ['.agents/skills', '.github/skills']) {
    const absoluteRoot = path.join(projectRoot, relativeRoot);
    if (!fs.existsSync(absoluteRoot)) {
      continue;
    }
    for (const entry of fs.readdirSync(absoluteRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'accord') {
        continue;
      }
      const relativePath = relativeRoot + '/' + entry.name;
      if (fs.existsSync(path.join(projectRoot, relativePath, 'SKILL.md'))) {
        found.push(relativePath);
      }
    }
  }
  return found.sort();
}

function isContainedProjectPath(projectRoot, relativePath) {
  if (typeof relativePath !== 'string' || !relativePath.trim()) {
    return false;
  }
  const normalized = path.normalize(relativePath.trim());
  if (path.isAbsolute(normalized)) {
    return false;
  }
  const resolved = path.resolve(projectRoot, normalized);
  const relation = path.relative(path.resolve(projectRoot), resolved);
  return relation !== '' && relation !== '..' && !relation.startsWith('..' + path.sep) &&
    !path.isAbsolute(relation);
}

function isRealPathContained(projectRoot, candidatePath) {
  try {
    const realRoot = fs.realpathSync(projectRoot);
    const realCandidate = fs.realpathSync(candidatePath);
    const relation = path.relative(realRoot, realCandidate);
    return relation !== '' && relation !== '..' &&
      !relation.startsWith('..' + path.sep) && !path.isAbsolute(relation);
  } catch {
    return false;
  }
}

function verifyCapabilities(projectRoot, config, agents, copilot, errors, warnings) {
  const trackedPaths = [
    CAPABILITY_CATALOG_INDEX,
    CAPABILITY_CATALOG_EXPORT,
    CAPABILITY_REGISTRY,
    CAPABILITY_ROUTES
  ];

  const index = loadJsonCompatible(
    projectRoot,
    CAPABILITY_CATALOG_INDEX,
    'Accord capability catalog index',
    errors
  );
  if (index) {
    let bundle = null;
    if (index.schema_version !== '1.0' || index.catalog !== 'accord-reviewed-capabilities') {
      errors.push('Accord capability catalog index identity or schema_version is invalid.');
    }
    const configuredSnapshotRoot = config?.capabilities?.snapshot_root;
    const snapshotRootPath = index.snapshot?.root;
    if (!isContainedProjectPath(projectRoot, snapshotRootPath) ||
        snapshotRootPath === configuredSnapshotRoot ||
        !snapshotRootPath.startsWith(configuredSnapshotRoot + '/')) {
      errors.push('Accord capability catalog snapshot.root must be below capabilities.snapshot_root.');
    } else {
      const snapshotRoot = path.resolve(projectRoot, snapshotRootPath);
      if (!fs.existsSync(snapshotRoot) || !fs.statSync(snapshotRoot).isDirectory()) {
        errors.push('Missing reviewed capability bundle: ' + snapshotRootPath);
      } else if (!isRealPathContained(projectRoot, snapshotRoot)) {
        errors.push('Reviewed capability bundle must not escape the project through a symbolic link.');
      } else {
        try {
          bundle = readAndVerifyCapabilityBundle(snapshotRoot);
        } catch (error) {
          errors.push('Capability bundle integrity failed: ' + error.message);
        }
        trackedPaths.push(
          snapshotRootPath + '/capabilities.bundle.json.gz',
          snapshotRootPath + '/BUNDLE.sha256',
          snapshotRootPath + '/MANIFEST.sha256',
          snapshotRootPath + '/SNAPSHOT.json',
          snapshotRootPath + '/LICENSE'
        );
      }
    }
    const expectedSnapshotFiles = {
      bundle: snapshotRootPath + '/capabilities.bundle.json.gz',
      bundle_digest: snapshotRootPath + '/BUNDLE.sha256',
      manifest: snapshotRootPath + '/MANIFEST.sha256'
    };
    for (const [key, expected] of Object.entries(expectedSnapshotFiles)) {
      if (index.snapshot?.[key] !== expected) {
        errors.push('Accord capability catalog snapshot.' + key + ' must be ' + expected + '.');
      }
    }
    if (!Array.isArray(index.entries)) {
      errors.push('Accord capability catalog index entries must be an array.');
    } else {
      const snapshotItems = new Map(
        Array.isArray(bundle?.snapshot?.items)
          ? bundle.snapshot.items.map((item) => [item?.id, item])
          : []
      );
      const catalogIds = new Set();
      const exportedEntries = [];
      for (const summary of index.entries) {
        if (typeof summary?.id !== 'string' ||
            !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(summary.id)) {
          errors.push('Every capability catalog entry must have a lower-case kebab-case ID.');
          continue;
        }
        if (catalogIds.has(summary.id)) {
          errors.push('Duplicate capability catalog ID: ' + summary.id);
        }
        catalogIds.add(summary.id);
        const entryFile = 'catalog/' + summary.file;
        if (!/^catalog\/entries\/[a-z0-9]+(?:-[a-z0-9]+)*\.yaml$/.test(entryFile) ||
            !isContainedProjectPath(projectRoot, '.accord/capabilities/' + entryFile)) {
          errors.push('Capability catalog entry file is invalid: ' + summary.id);
          continue;
        }
        const entryPath = '.accord/capabilities/' + entryFile;
        const entryAbsolutePath = path.join(projectRoot, entryPath);
        if ((fs.existsSync(entryAbsolutePath) && fs.lstatSync(entryAbsolutePath).isSymbolicLink()) ||
            (fs.existsSync(entryAbsolutePath) && !isRealPathContained(projectRoot, entryAbsolutePath))) {
          errors.push('Capability catalog entry must not be a symbolic link: ' + summary.id);
          continue;
        }
        trackedPaths.push(entryPath);
        const entry = loadJsonCompatible(projectRoot, entryPath, 'Capability catalog entry ' + summary.id, errors);
        if (!entry) continue;
        if (entry.schema_version !== '1.0' || entry.id !== summary.id ||
            entry.kind !== summary.kind || entry.category !== summary.category) {
          errors.push('Capability catalog entry does not match its index summary: ' + summary.id);
        }
        if (!['skill', 'plugin'].includes(entry.kind)) {
          errors.push('Capability catalog entry kind must be skill or plugin: ' + entry.id);
        }
        const expectedPrefix = entry.kind === 'plugin' ? 'plugins/' : 'skills/';
        if (entry.upstream_path !== expectedPrefix + entry.id) {
          errors.push('Capability catalog upstream_path must match its ID: ' + entry.id);
        }
        if (entry.snapshot_member !== entry.upstream_path) {
          errors.push('Capability catalog snapshot_member must match upstream_path: ' + entry.id);
        }
        const snapshotItem = snapshotItems.get(entry.id);
        const primaryComponent = Array.isArray(snapshotItem?.components)
          ? snapshotItem.components.find((component) => component.path === entry.upstream_path)
          : null;
        if (!snapshotItem || snapshotItem.kind !== entry.kind ||
            snapshotItem.path !== entry.upstream_path ||
            primaryComponent?.tree_sha !== entry.tree_sha) {
          errors.push('Capability catalog entry does not match SNAPSHOT.json: ' + entry.id);
        }
        if (bundle && ![...bundle.files.keys()].some(
          (file) => file.startsWith(entry.snapshot_member.replace(/\/$/, '') + '/')
        )) {
          errors.push('Capability catalog entry has no files in the compressed bundle: ' + entry.id);
        }
        if (!/^[0-9a-f]{40}$/i.test(entry?.tree_sha || '')) {
          errors.push('Capability catalog entry must pin a 40-character tree SHA: ' + entry.id);
        }
        if (typeof entry.category !== 'string' || !entry.category.trim()) {
          errors.push('Capability catalog entry is missing category: ' + entry.id);
        }
        if (!['integrated-adapter', 'conditional', 'conditional-with-override'].includes(entry.assessment)) {
          errors.push('Capability catalog entry has an invalid assessment: ' + entry.id);
        }
        for (const key of ['fit', 'constraint']) {
          if (typeof entry[key] !== 'string' || !entry[key].trim()) {
            errors.push('Capability catalog entry is missing ' + key + ': ' + entry.id);
          }
        }
        if (entry.source_components !== undefined) {
          if (!Array.isArray(entry.source_components) || entry.source_components.length === 0) {
            errors.push('Capability catalog source_components must be a non-empty array: ' + entry.id);
          } else {
            for (const component of entry.source_components) {
              if (typeof component?.path !== 'string' || !component.path.trim() ||
                  !(/^[0-9a-f]{40}$/i.test(component.tree_sha || '') ||
                    /^[0-9a-f]{40}$/i.test(component.blob_sha || ''))) {
                errors.push('Capability catalog source component is invalid: ' + entry.id);
              }
            }
          }
          if (snapshotItem &&
              JSON.stringify(entry.source_components) !== JSON.stringify(snapshotItem.components)) {
            errors.push('Capability catalog source_components do not match SNAPSHOT.json: ' + entry.id);
          }
        }
        const { schema_version: _schemaVersion, ...exported } = entry;
        exportedEntries.push(exported);
      }
      if (bundle && (snapshotItems.size !== catalogIds.size ||
          [...snapshotItems.keys()].some((id) => !catalogIds.has(id)))) {
        errors.push('Capability catalog entries must exactly match SNAPSHOT.json items.');
      }

      const catalogExport = loadJsonCompatible(
        projectRoot,
        CAPABILITY_CATALOG_EXPORT,
        'Generated Accord capability catalog export',
        errors
      );
      const expectedExport = {
        schema_version: '1.2',
        catalog: index.catalog,
        catalog_revision: index.catalog_revision,
        snapshot_root: index.snapshot?.root,
        snapshot_bundle: index.snapshot?.bundle,
        snapshot_bundle_digest: index.snapshot?.bundle_digest,
        snapshot_manifest: index.snapshot?.manifest,
        source_review: index.source_review,
        entries: exportedEntries
      };
      if (catalogExport && JSON.stringify(catalogExport) !== JSON.stringify(expectedExport)) {
        errors.push('Generated capability catalog export is stale; rebuild it from catalog/index.yaml.');
      }
    }
    if (!/^[0-9a-f]{40}$/i.test(index.source_review?.ref || '')) {
      errors.push('Accord capability catalog source_review.ref must be an immutable commit SHA.');
    }
    if (bundle?.snapshot &&
        (bundle.snapshot.ref !== index.source_review?.ref ||
         bundle.snapshot.license !== index.source_review?.license)) {
      errors.push('Capability catalog provenance does not match SNAPSHOT.json.');
    }
  }

  const routes = loadJsonCompatible(
    projectRoot,
    CAPABILITY_ROUTES,
    'Accord capability route configuration',
    errors
  );
  if (routes) errors.push(...validateRouteConfig(routes));

  const registry = loadJsonCompatible(
    projectRoot,
    CAPABILITY_REGISTRY,
    'Accord capability registry',
    errors
  );
  if (!registry) {
    return trackedPaths;
  }
  if (registry.schema_version !== '1.1' || registry.registry !== 'accord-project-capabilities') {
    errors.push('Accord capability registry identity or schema_version is invalid.');
  }

  const methods = inspectRouteMethods(projectRoot, routes, registry);
  errors.push(...methods.errors);
  trackedPaths.push(...methods.trackedPaths);

  for (const [key, expected] of Object.entries(CAPABILITY_POLICY)) {
    if (registry.policy?.[key] !== expected) {
      errors.push('Capability registry policy.' + key + ' must be ' + JSON.stringify(expected) + '.');
    }
  }

  if (!Array.isArray(registry.installed)) {
    errors.push('Accord capability registry installed must be an array.');
    return trackedPaths;
  }

  const registeredPaths = new Set();
  const registeredIds = new Set();
  for (const capability of registry.installed) {
    if (!capability || typeof capability !== 'object') {
      errors.push('Every installed capability registry entry must be an object.');
      continue;
    }
    if (typeof capability.id !== 'string' ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(capability.id)) {
      errors.push('Installed capability IDs must use lower-case kebab-case.');
      continue;
    }
    if (registeredIds.has(capability.id)) {
      errors.push('Duplicate installed capability ID: ' + capability.id);
    }
    registeredIds.add(capability.id);

    const allowedPaths = [
      '.agents/skills/' + capability.id,
      '.github/skills/' + capability.id
    ];
    if (!allowedPaths.includes(capability.path)) {
      errors.push('Installed capability path must be a direct project Skill directory: ' + capability.id);
      continue;
    }
    registeredPaths.add(capability.path);
    trackedPaths.push(capability.path + '/SKILL.md');

    if (capability.status !== 'approved-enabled') {
      errors.push('Installed capability status must be approved-enabled: ' + capability.id);
    }
    if (!['task-match', 'ask-each-use'].includes(capability.invocation)) {
      errors.push('Installed capability invocation must be task-match or ask-each-use: ' + capability.id);
    }
    for (const key of ['reviewed_at', 'approved_at', 'approved_use']) {
      if (typeof capability[key] !== 'string' || !capability[key].trim()) {
        errors.push('Installed capability is missing ' + key + ': ' + capability.id);
      }
    }
    for (const key of ['outputs', 'dependencies', 'constraints']) {
      if (!Array.isArray(capability[key])) {
        errors.push('Installed capability ' + key + ' must be an array: ' + capability.id);
      }
    }
    for (const key of ['repository', 'ref', 'tree_sha', 'license']) {
      if (typeof capability.source?.[key] !== 'string' || !capability.source[key].trim()) {
        errors.push('Installed capability source is missing ' + key + ': ' + capability.id);
      }
    }
    if (!/^[0-9a-f]{40}$/i.test(capability.source?.ref || '')) {
      errors.push('Installed capability source.ref must be a 40-character commit SHA: ' + capability.id);
    }
    if (!/^[0-9a-f]{40}$/i.test(capability.source?.tree_sha || '')) {
      errors.push('Installed capability source.tree_sha must be a 40-character tree SHA: ' + capability.id);
    }

    const skillPath = path.join(projectRoot, capability.path, 'SKILL.md');
    if (!fs.existsSync(skillPath) || !fs.statSync(skillPath).isFile()) {
      errors.push('Registered capability has no SKILL.md: ' + capability.path);
    }
  }

  for (const skillPath of projectSkillPaths(projectRoot)) {
    if (!registeredPaths.has(skillPath)) {
      warnings.push(
        'Project-local Skill is outside Accord management and remains usable: ' +
        skillPath +
        '. Record material use in the active Change, or obtain approval before adopting and pinning it.'
      );
    }
  }

  return trackedPaths;
}

function configuredCodingPractices(config, errors) {
  const configuredPath = config?.sources?.coding_practices;
  if (typeof configuredPath !== 'string' || !configuredPath.trim()) {
    errors.push('sources.coding_practices must name the required user coding-practices file.');
    return null;
  }

  const normalized = path.normalize(configuredPath.trim());
  if (path.isAbsolute(normalized) || normalized === '.' ||
      normalized === '..' || normalized.startsWith('..' + path.sep)) {
    errors.push('sources.coding_practices must be a project-relative file path.');
    return null;
  }

  return normalized.split(path.sep).join('/');
}

function verifyCodingPractices(projectRoot, config, agents, copilot, errors) {
  const relativePath = configuredCodingPractices(config, errors);
  if (!relativePath) {
    return null;
  }

  const absolutePath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    errors.push('Missing required user coding-practices source: ' + relativePath);
  }

  return relativePath;
}

function loadKnowledgeManifest(projectRoot, errors) {
  const manifestPath = path.join(projectRoot, KNOWLEDGE_MANIFEST);
  const text = readText(manifestPath, errors, 'project knowledge manifest');
  if (!text) {
    return null;
  }

  try {
    return parseExactJson(text);
  } catch (error) {
    errors.push(
      'Project knowledge manifest must be JSON-compatible YAML: ' + error.message
    );
    return null;
  }
}

function verifyKnowledgeBase(projectRoot, config, agents, copilot, errors, warnings, requestedModules = null) {
  try {
    const model = loadProjectModel(projectRoot, config);
    const result = validateProjectKnowledge(model, { modules: requestedModules });
    errors.push(...result.errors);
    const gaps = result.gaps.map(g => 'Knowledge gap: ' + JSON.stringify(g));
    if (model.manifest.status === 'current') errors.push(...gaps); else warnings.push(...gaps);
    return [...new Set([...model.metadata_paths, ...result.inspected])];
  } catch (e) { errors.push(e.message); return []; }
}

function verifyTrackedAdoption(
  projectRoot,
  codingPracticesPath,
  knowledgePaths,
  capabilityPaths,
  errors
) {
  const requiredFiles = [
    'AGENTS.md',
    '.github/copilot-instructions.md',
    '.agents/skills/accord/SKILL.md',
    '.agents/skills/accord/references/git-control.md',
    '.agents/skills/accord/references/adoption-and-update.md',
    '.agents/skills/accord/references/project-methods.md',
    '.agents/skills/accord/references/project-improvement.md',
    '.agents/skills/accord/references/needs-and-design-input.md',
    '.agents/skills/accord/references/risk-and-authority.md',
    '.agents/skills/accord/references/team-work.md',
    '.agents/skills/accord/references/project-knowledge.md',
    '.agents/skills/accord/references/knowledge-acquisition.md',
    '.agents/skills/accord/references/knowledge-query-and-refresh.md',
    '.agents/skills/accord/references/capability-lifecycle.md',
    '.agents/skills/accord/references/presentation-output.md',
    '.agents/skills/accord/scripts/accord-capability-bundle.mjs',
    '.agents/skills/accord/scripts/accord-inventory.mjs',
    '.agents/skills/accord/scripts/accord-route.mjs',
    '.agents/skills/accord/scripts/accord-methods.mjs',
    '.agents/skills/accord/scripts/accord-validate.mjs',
    '.agents/skills/accord/scripts/accord-project.mjs',
    '.agents/skills/accord/scripts/accord-work.mjs',
    '.agents/skills/accord/scripts/accord-governance.mjs',
    '.agents/skills/accord/scripts/accord-contracts.mjs',
    '.agents/skills/accord/scripts/accord-adoption.mjs',
    '.agents/skills/accord/scripts/accord-protocol.mjs',
    '.agents/skills/accord/scripts/accord-scope.mjs',
    '.accord/accord.yaml',
    '.accord/documentation-policy.yaml',
    '.accord/governance.yaml'
  ];
  if (codingPracticesPath) {
    requiredFiles.push(codingPracticesPath);
  }
  requiredFiles.push(...knowledgePaths);
  requiredFiles.push(...capabilityPaths);

  const listed = runGit(projectRoot, ['ls-tree', '-r', '--name-only', 'HEAD']);
  const trackedFiles = new Set(
    listed.ok ? listed.stdout.split(/\r?\n/).filter(Boolean) : []
  );
  for (const relativePath of requiredFiles) {
    const absolutePath = path.join(projectRoot, relativePath);
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      errors.push('Required Accord file is missing from the working tree: ' + relativePath);
      continue;
    }
    if (!trackedFiles.has(relativePath)) {
      errors.push('Required Accord file is not committed to Git: ' + relativePath);
    }
  }

}

function parseArguments(argv) {
  let project = '.';
  let requireClean = false;
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--project') {
      project = argv[index + 1];
      index += 1;
    } else if (['--scope', '--work', '--modules', '--routes'].includes(argument)) {
      const value = argv[++index];
      if (!value || value.startsWith('--')) return { error: argument + ' requires a value.' };
      options[argument.slice(2)] = ['--modules', '--routes'].includes(argument) ? value.split(',') : value;
    } else if (argument === '--require-clean') {
      requireClean = true;
    } else if (argument === '--help' || argument === '-h') {
      return { help: true };
    } else {
      return { error: 'Unknown argument: ' + argument };
    }
  }

  if (!project) {
    return { error: '--project requires a path.' };
  }

  return { project, requireClean, ...options };
}

function printUsage() {
  console.log('Usage: node accord-validate.mjs --project <path> [--scope installation|task|delivery|audit] [--work relative.json] [--modules id,id] [--routes id,id] [--require-clean]');
}

export function validateProject(projectInput, options = {}) {
  try { return validateProjectUnchecked(projectInput, options); }
  catch (error) {
    return { projectRoot: path.resolve(projectInput), scope: options.scope || 'audit',
      errors: ['Validation could not complete: ' + error.message], warnings: [],
      checked: [], notChecked: ['validation-incomplete'], blockerScope: 'protocol-or-selected-scope' };
  }
}

function validateProjectUnchecked(projectInput, options = {}) {
  const errors = [];
  const warnings = [];
  const projectRoot = path.resolve(projectInput);
  const scope = options.scope || ((options.work || options.modules?.length) ? 'task' : 'audit');
  const checked = ['protocol', 'installation-integrity', 'Git-state'];
  const notChecked = [];
  if (!VALIDATION_SCOPES.has(scope) || options.change ||
      (['task', 'delivery'].includes(scope) && !options.work && !options.modules?.length) ||
      (['audit', 'installation'].includes(scope) && (options.work || options.modules || options.routes))) {
    return { projectRoot, errors: ['Invalid scope/carrier; use --work or --modules. Retired Change files must be migrated.'], warnings, checked: [], notChecked: ['all'] };
  }

  if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
    return { errors: ['Project directory does not exist: ' + projectRoot], warnings, projectRoot };
  }

  for (const retired of ['.accord/changes', '.accord/records',
    '.agents/skills/accord/scripts/accord-engineering.mjs',
    '.agents/skills/accord/references/engineering-documents.md',
    '.agents/skills/accord/references/change-lifecycle.md',
    '.agents/skills/accord/assets/templates/change.md',
    '.agents/skills/accord/assets/templates/record.yaml']) {
    if (fs.existsSync(path.join(projectRoot, retired))) errors.push('Retired owner remains; migrate needed facts and remove it: ' + retired);
  }

  for (const relativePath of [
    'AGENTS.md',
    '.github/copilot-instructions.md',
    '.agents/skills/accord/SKILL.md'
  ]) {
    const absolutePath = path.join(projectRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
      errors.push('Missing required adopted file or directory: ' + relativePath);
    }
  }

  const agents = readText(path.join(projectRoot, 'AGENTS.md'), errors, 'AGENTS.md');
  verifyManagedEntryBlock(agents, {
    label: 'AGENTS.md',
    begin: '<!-- accord:begin version="0.8" -->',
    end: '<!-- accord:end -->',
    startPattern: /<!-- accord:begin(?: version="[^"]+")? -->/g
  }, errors);

  const copilot = readText(
    path.join(projectRoot, '.github', 'copilot-instructions.md'),
    errors,
    'Copilot adapter'
  );
  verifyManagedEntryBlock(copilot, {
    label: 'Copilot adapter',
    begin: '<!-- accord:copilot:begin version="0.8" -->',
    end: '<!-- accord:copilot:end -->',
    startPattern: /<!-- accord:copilot:begin(?: version="[^"]+")? -->/g
  }, errors);

  const config = loadConfiguration(projectRoot, errors);
  verifyConfiguration(config, errors);
  if (!options.scope) warnings.push('Inferred validation scope: ' + scope + '. Pass --scope explicitly; unscoped calls perform audit.');
  if (config?.schema_version === '0.9') {
    try { errors.push(...validateGovernancePolicy(readJson(projectRoot, POLICY_PATH))); checked.push('governance-policy-shape'); }
    catch (e) { errors.push(e.message); }
    notChecked.push('human-authority-and-remote-review-authentication');
  }
  let workModules = [];
  if (options.work) {
    try {
      const work = readJson(projectRoot, options.work);
      const result = validateWorkItem(projectRoot, work, { delivery: scope === 'delivery' });
      if (Array.isArray(work.modules)) workModules = work.modules;
      errors.push(...result.errors); warnings.push(...result.warnings); checked.push('work:' + options.work);
    } catch (e) { errors.push(e.message); }
  }
  const installation = inspectInstallation(projectRoot, config);
  errors.push(...installation.errors);
  warnings.push(...installation.warnings);
  const codingPracticesPath = verifyCodingPractices(projectRoot, config, agents, copilot, errors);
  const moduleSelection = [...new Set([...(options.modules || []), ...workModules])];
  const inspectKnowledge = scope === 'audit' || (scope !== 'installation' && moduleSelection.length > 0);
  const knowledgePaths = inspectKnowledge ? verifyKnowledgeBase(
    projectRoot,
    config,
    agents,
    copilot,
    errors,
    warnings,
    moduleSelection
  ) : [];
  if (inspectKnowledge) checked.push(moduleSelection.length ? 'knowledge:' + moduleSelection.join(',') + '+dependencies' : 'all-knowledge');
  else notChecked.push('knowledge-content-and-coverage');
  const capabilityPaths = ['audit', 'installation'].includes(scope) ? verifyCapabilities(
    projectRoot,
    config,
    agents,
    copilot,
    errors,
    warnings
  ) : [];
  if (['audit', 'installation'].includes(scope)) checked.push('all-capabilities');
  else {
    const routes = loadJsonCompatible(projectRoot, CAPABILITY_ROUTES, 'routes', errors);
    errors.push(...validateRouteConfig(routes));
    notChecked.push('unselected-methods-and-installed-skills');
    for (const route of options.routes || []) {
      try { readRouteMethods(projectRoot, route); checked.push('route:' + route); }
      catch (error) { errors.push('Route ' + route + ': ' + error.message); }
    }
  }
  knowledgePaths.push(...installation.paths);

  const gitVersion = runGit(projectRoot, ['--version']);
  if (!gitVersion.ok) {
    errors.push('Git is unavailable: ' + gitVersion.stderr);
    return { errors, warnings, projectRoot };
  }

  const gitRoot = runGit(projectRoot, ['rev-parse', '--show-toplevel']);
  if (!gitRoot.ok) {
    errors.push('Project is not a Git repository. Obtain approval before git init.');
    return { errors, warnings, projectRoot };
  }

  if (path.resolve(gitRoot.stdout) !== projectRoot) {
    errors.push('Project path is not the Git repository root: ' + gitRoot.stdout);
  }

  const head = runGit(projectRoot, ['rev-parse', '--verify', 'HEAD']);
  if (!head.ok) {
    errors.push('Git repository has no baseline commit.');
  }

  if (head.ok && scope !== 'installation') {
    const commitmentErrors = [];
    verifyTrackedAdoption(
      projectRoot,
      codingPracticesPath,
      knowledgePaths,
      capabilityPaths,
      commitmentErrors
    );
    if (scope === 'audit') errors.push(...commitmentErrors);
    else warnings.push(...commitmentErrors.map(message => 'Commit/archive outstanding: ' + message));
  }

  const unstagedWhitespace = runGit(projectRoot, ['diff', '--check']);
  if (!unstagedWhitespace.ok) {
    errors.push('Unstaged diff has whitespace errors: ' + unstagedWhitespace.stderr);
  }

  const stagedWhitespace = runGit(projectRoot, ['diff', '--cached', '--check']);
  if (!stagedWhitespace.ok) {
    errors.push('Staged diff has whitespace errors: ' + stagedWhitespace.stderr);
  }

  const status = runGit(projectRoot, ['status', '--porcelain']);
  if (status.ok && status.stdout) {
    warnings.push('Working tree has changes. Confirm they belong to the selected work before staging.');
    if (options.requireClean) {
      errors.push('Working tree is not clean.');
    }
  }

  if (config?.repository?.remote?.mode === 'required') {
    const remotes = runGit(projectRoot, ['remote']);
    if (!remotes.ok || !remotes.stdout) {
      errors.push('repository.remote.mode is required but no Git remote is configured.');
    }
  }

  if (scope === 'audit') {
    const index = indexLocalWork(projectRoot, { history: true });
    errors.push(...index.gaps.map(g => g.path + ': ' + g.reason));
    for (const item of index.entries) {
      const result = validateWorkItem(projectRoot, readJson(projectRoot, item.path));
      errors.push(...result.errors); warnings.push(...result.warnings);
    }
    checked.push('all-local-work');
  }
  if (scope !== 'audit') notChecked.push('unrelated-history', 'unselected-project-scope');

  return { errors, warnings, projectRoot, scope, checked, notChecked,
    blockerScope: errors.length ? scope : null, head: head.stdout || null };
}

function main() {
  const parsed = parseArguments(process.argv.slice(2));
  if (parsed.help) {
    printUsage();
    return 0;
  }

  if (parsed.error) {
    console.error(parsed.error);
    printUsage();
    return 2;
  }

  const result = validateProject(parsed.project, parsed);
  console.log(JSON.stringify({ scope: result.scope || parsed.scope || 'audit', checked: result.checked || [], notChecked: result.notChecked || ['validation-incomplete'] }));
  for (const warning of result.warnings) {
    console.warn('WARNING: ' + warning);
  }

  if (result.errors.length > 0) {
    for (const error of result.errors) {
      console.error('ERROR: ' + error);
    }
    return 1;
  }

  console.log('Accord ' + result.scope + ' checks passed for ' + result.projectRoot + ' at ' + result.head + '; not a whole-project or human acceptance claim.');
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main();
}
