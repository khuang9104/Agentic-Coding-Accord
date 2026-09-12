#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { readAndVerifyCapabilityBundle } from './accord-capability-bundle.mjs';
import { validateRouteConfig, inspectRouteMethods, readRouteMethods } from './accord-route.mjs';
import { validateEngineeringManifest, validateEngineeringSources } from './accord-engineering.mjs';
import { inspectInstallation } from './accord-adoption.mjs';
import { parseExactJson, safeContractPath } from './accord-contracts.mjs';
import { CAPABILITY_POLICY } from './accord-methods.mjs';
import { selectModuleScope } from './accord-scope.mjs';
import { CONFIG_SCHEMA, PROTOCOL_VERSION, CHANGE_SCHEMA, RECORD_SCHEMAS, KNOWLEDGE_SCHEMAS,
  RISK_LEVELS, MATERIAL_RISKS, CHANGE_STATUSES, AUTHORIZED_STAGES, EXECUTING_STAGES,
  DELIVERY_STAGES, VALIDATION_SCOPES, KNOWLEDGE_DOCUMENTS, BUDGET_KEYS, validateMethodUse } from './accord-protocol.mjs';

const ACCORD_SCHEMA_VERSION = CONFIG_SCHEMA;
const ACCORD_VERSION = PROTOCOL_VERSION;
const KNOWLEDGE_ROOT = 'docs';
const KNOWLEDGE_MANIFEST = 'docs/manifest.yaml';
const CAPABILITY_CATALOG_INDEX = '.accord/capabilities/catalog/index.yaml';
const CAPABILITY_CATALOG_EXPORT = '.accord/capabilities/catalog.yaml';
const CAPABILITY_REGISTRY = '.accord/capabilities/registry.yaml';
const CAPABILITY_ROUTES = '.accord/capabilities/routes.yaml';
const REQUIRED_KNOWLEDGE_DOCUMENTS = KNOWLEDGE_DOCUMENTS;
const POST_DESIGN_STATUSES = new Set(['design-input-ready', ...AUTHORIZED_STAGES]);

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

  if (config.schema_version !== ACCORD_SCHEMA_VERSION) {
    if (['0.6', '0.7'].includes(config.schema_version)) {
      errors.push(
        'Accord ' + config.schema_version +
        ' configuration requires reviewed migration to ' + ACCORD_SCHEMA_VERSION +
        '; it was not rewritten automatically.'
      );
    } else {
      errors.push('Expected schema_version ' + ACCORD_SCHEMA_VERSION + '.');
    }
  }

  if (config.accord?.version !== ACCORD_VERSION) {
    errors.push('Expected accord.version ' + ACCORD_VERSION + '.');
  }

  if (config.accord?.release !== undefined && !/^\d+\.\d+\.\d+$/.test(config.accord.release)) {
    errors.push('Expected accord.release to be a semantic release version.');
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
    errors.push('version_control.commit_mode must be manual or propose; automatic commits are not defined by Accord 0.8.');
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
  if (!KNOWLEDGE_SCHEMAS.has(config.knowledge_base?.structure_version)) {
    errors.push('knowledge_base.structure_version must be a supported 1.2–1.4 version after reviewed migration.');
  }
  if (!['assumption-first', 'intent-aligned'].includes(config.clarification?.mode)) {
    errors.push('clarification.mode must be intent-aligned (or legacy assumption-first); neither approves assumptions.');
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
  if (!['1.0', '1.1'].includes(registry.schema_version) || registry.registry !== 'accord-project-capabilities') {
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

function knowledgeProvenancePaths(contents) {
  const provenance = contents.split('## Provenance')[1] || '';
  return [...provenance.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function hasTemplateProvenancePlaceholder(contents) {
  return contents.includes('replace/with/project/path');
}

const FIXED_KNOWLEDGE_SECTIONS = {
  'README.md': ['Status and Scope', 'Document Map', 'Answering Rules', 'Knowledge-base Export'],
  'agent-context.md': ['Current project map', 'Working commands', 'Change hotspots', 'Retrieval rules'],
  'system-overview.md': ['Purpose and Intended Use', 'Major Capabilities', 'System Boundary', 'Key Scenarios', 'Current Limitations'],
  'architecture.md': ['System Context', 'Architectural Overview', 'Runtime and Deployment Topology', 'Key Flows', 'Working Commands and Entry Points', 'Architectural Decisions and Constraints', 'Extension and Change Boundaries'],
  'interfaces-and-data.md': ['External Interfaces', 'Internal Interfaces', 'Data Stores and Ownership', 'Data Flows', 'Interface Versions and Consumers'],
  'glossary.md': ['Domain Terms', 'Technical Terms', 'Acronyms and Identifiers', 'Naming Notes'],
  'modules/README.md': ['Module Inventory', 'Selection Basis', 'Dependency Overview']
};

function knowledgeSectionBody(contents, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const start = contents.search(new RegExp('^##\\s+' + escaped + '\\s*$', 'mi'));
  if (start < 0) return null;
  const bodyStart = contents.indexOf('\n', start);
  if (bodyStart < 0) return '';
  const remainder = contents.slice(bodyStart + 1);
  const next = remainder.search(/^##\s+/mi);
  return (next < 0 ? remainder : remainder.slice(0, next)).trim();
}

function verifyFixedKnowledgeShape(relativePath, contents, errors) {
  const relativeDocument = relativePath.replace(/^docs\//, '');
  const required = FIXED_KNOWLEDGE_SECTIONS[relativeDocument];
  if (!required) return;
  for (const heading of required) {
    const body = knowledgeSectionBody(contents, heading);
    if (body === null) {
      errors.push('Current project knowledge document is missing required section "' + heading + '": ' + relativePath);
    } else if (!body.trim()) {
      errors.push('Current project knowledge document has an empty section "' + heading + '": ' + relativePath);
    }
  }
}

function isManagedDocumentationPath(relativePath, modules = [], engineering = null) {
  return relativePath === KNOWLEDGE_MANIFEST ||
    REQUIRED_KNOWLEDGE_DOCUMENTS.some((document) => relativePath === KNOWLEDGE_ROOT + '/' + document) ||
    modules.some((id) => relativePath === KNOWLEDGE_ROOT + '/modules/' + id + '.md') ||
    (Array.isArray(engineering?.documents) && engineering.documents.some(entry => entry?.path === relativePath)) ||
    (Array.isArray(engineering?.contracts) && engineering.contracts.some(entry => entry?.artifact === relativePath));
}

function isControlPlaneEvidence(relativePath) {
  return relativePath === '.git' || relativePath.startsWith('.git/') ||
    relativePath === '.accord' || relativePath.startsWith('.accord/') ||
    relativePath === '.agents' || relativePath.startsWith('.agents/') ||
    relativePath === '.github/skills' || relativePath.startsWith('.github/skills/') ||
    relativePath === 'vendor' || relativePath.startsWith('vendor/');
}

function verifyKnowledgeBase(projectRoot, config, agents, copilot, errors, warnings, requestedModules = null) {
  if (!config || config.knowledge_base?.required !== true) {
    return [];
  }

  const trackedPaths = [KNOWLEDGE_MANIFEST];
  const manifest = loadKnowledgeManifest(projectRoot, errors);
  if (!manifest) return trackedPaths;
  let selected = null;
  if (requestedModules?.length) {
    try { selected = selectModuleScope(manifest, requestedModules); }
    catch (error) { errors.push(error.message); return trackedPaths; }
  }
  const knowledgeContents = new Map();
  const templateProvenancePlaceholders = [];
  for (const relativeDocument of selected ? [] : REQUIRED_KNOWLEDGE_DOCUMENTS) {
    const relativePath = KNOWLEDGE_ROOT + '/' + relativeDocument;
    const absolutePath = path.join(projectRoot, relativePath);
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      errors.push('Missing required project knowledge document: ' + relativePath);
    } else {
      const contents = fs.readFileSync(absolutePath, 'utf8');
      knowledgeContents.set(relativePath, contents);
      if (hasTemplateProvenancePlaceholder(contents)) templateProvenancePlaceholders.push(relativePath);
      if (!contents.includes('## Provenance')) {
        errors.push('Project knowledge document is missing a Provenance section: ' + relativePath);
      }
      const budget = config.knowledge_base?.size_budgets?.[relativeDocument];
      if (Number.isInteger(budget) && contents.length > budget) {
        warnings.push(
          'Project knowledge document exceeds its soft size budget (' +
          contents.length + ' > ' + budget + ' characters): ' + relativePath
        );
      }
    }
    trackedPaths.push(relativePath);
  }

  if (!KNOWLEDGE_SCHEMAS.has(manifest.schema_version)) {
    errors.push('Project knowledge manifest schema_version must be supported (1.2–1.4).');
  }
  if (manifest.schema_version !== config.knowledge_base?.structure_version) {
    errors.push('Knowledge manifest and configured structure versions must match.');
  }
  if (manifest.structure !== 'accord-project-knowledge') {
    errors.push('Project knowledge manifest structure must be accord-project-knowledge.');
  }
  if (manifest.knowledge_root !== KNOWLEDGE_ROOT) {
    errors.push('Project documentation manifest knowledge_root must be docs.');
  }
  if (manifest.source_content_included !== false) {
    errors.push('Project knowledge manifest source_content_included must be false.');
  }
  if (!['draft', 'current'].includes(manifest.status)) {
    errors.push('Project knowledge manifest status must be draft or current.');
  } else if (manifest.status === 'draft') {
    warnings.push(
      'Project knowledge manifest is draft. Report its gaps and do not present it as reviewed project truth.'
    );
  } else {
    if (typeof manifest.last_reviewed_at !== 'string' || !manifest.last_reviewed_at.trim()) {
      errors.push('A current project knowledge manifest requires last_reviewed_at.');
    }
    if (!/^[0-9a-f]{40}$/i.test(manifest.observed_revision || '')) {
      errors.push('A current project knowledge manifest requires a full observed_revision.');
    }
    if (manifest.observed_worktree !== 'clean') {
      errors.push('A current project knowledge manifest requires observed_worktree clean.');
    }
    if (typeof manifest.observed_at !== 'string' || !manifest.observed_at.trim()) {
      errors.push('A current project knowledge manifest requires observed_at.');
    }
  }

  if (!['clean', 'dirty', 'unknown'].includes(manifest.observed_worktree)) {
    errors.push('Project knowledge manifest observed_worktree must be clean, dirty, or unknown.');
  }
  if (manifest.observed_revision !== null &&
      !/^[0-9a-f]{40}$/i.test(manifest.observed_revision || '')) {
    errors.push('Project knowledge manifest observed_revision must be null or a full Git revision.');
  }
  if (manifest.observed_at !== null &&
      (typeof manifest.observed_at !== 'string' || !manifest.observed_at.trim())) {
    errors.push('Project knowledge manifest observed_at must be null or a non-empty timestamp.');
  }

  if (typeof manifest.module_inventory_basis !== 'string' ||
      !manifest.module_inventory_basis.trim()) {
    errors.push('Project knowledge manifest requires a module_inventory_basis.');
  } else if (manifest.status === 'current' && /pending/i.test(manifest.module_inventory_basis)) {
    errors.push('A current project knowledge manifest cannot use a pending module inventory basis.');
  }

  if (!Array.isArray(manifest.known_gaps) ||
      manifest.known_gaps.some((gap) => typeof gap !== 'string' || !gap.trim())) {
    errors.push('Project knowledge manifest known_gaps must be an array of non-empty strings.');
  }

  if (!Array.isArray(manifest.documents) ||
      JSON.stringify(manifest.documents) !== JSON.stringify(REQUIRED_KNOWLEDGE_DOCUMENTS)) {
    errors.push(
      'Project knowledge manifest documents must match the fixed Accord knowledge document list and order.'
    );
  }
  if (manifest.status === 'current') {
    for (const [relativePath, contents] of knowledgeContents) {
      verifyFixedKnowledgeShape(relativePath, contents, errors);
    }
  }

  if (!Array.isArray(manifest.modules)) {
    errors.push('Project knowledge manifest modules must be an array of module IDs.');
    return trackedPaths;
  }

  const seenModules = new Set();
  for (const moduleId of manifest.modules) {
    if (typeof moduleId !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(moduleId)) {
      errors.push('Project knowledge module IDs must use lower-case kebab-case: ' + String(moduleId));
      continue;
    }
    if (seenModules.has(moduleId)) {
      errors.push('Duplicate project knowledge module ID: ' + moduleId);
      continue;
    }
    seenModules.add(moduleId);
    if (selected && !selected.includes(moduleId)) continue;

    const relativePath = KNOWLEDGE_ROOT + '/modules/' + moduleId + '.md';
    const absolutePath = path.join(projectRoot, relativePath);
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      errors.push('Missing project knowledge module document: ' + relativePath);
    } else {
      const contents = fs.readFileSync(absolutePath, 'utf8');
      knowledgeContents.set(relativePath, contents);
      if (hasTemplateProvenancePlaceholder(contents)) templateProvenancePlaceholders.push(relativePath);
      if (!contents.includes('## Provenance')) {
        errors.push('Project knowledge module is missing a Provenance section: ' + relativePath);
      }
      const budget = config.knowledge_base?.size_budgets?.module;
      if (Number.isInteger(budget) && contents.length > budget) {
        warnings.push(
          'Project knowledge module exceeds its soft size budget (' +
          contents.length + ' > ' + budget + ' characters): ' + relativePath
        );
      }
    }
    trackedPaths.push(relativePath);
  }

  const engineering = validateEngineeringManifest(projectRoot, manifest, { modules: selected });
  errors.push(...engineering.errors);
  warnings.push(...engineering.warnings);
  trackedPaths.push(...engineering.trackedPaths);
  for (const detail of Array.isArray(manifest.engineering?.documents) ? manifest.engineering.documents : []) {
    if (engineering.trackedPaths.includes(detail?.path)) {
      const contents = fs.readFileSync(path.join(projectRoot, detail.path), 'utf8');
      knowledgeContents.set(detail.path, contents);
      if (hasTemplateProvenancePlaceholder(contents)) templateProvenancePlaceholders.push(detail.path);
    }
  }

  if (templateProvenancePlaceholders.length) {
    const locations = [...new Set(templateProvenancePlaceholders)].join(', ');
    if (manifest.status === 'current') {
      errors.push('Current project knowledge retains template Provenance placeholders: ' + locations);
    } else {
      warnings.push('Project knowledge retains template Provenance placeholders; discovery is incomplete: ' + locations);
    }
  }

  if (manifest.status === 'current' || manifest.scopes?.some(entry => entry.status === 'current')) {
    const revisionTree = runGit(projectRoot, [
      'ls-tree', '-r', '--name-only', String(manifest.observed_revision)
    ]);
    const revisionFiles = new Set(
      revisionTree.ok ? revisionTree.stdout.split(/\r?\n/).filter(Boolean) : []
    );
    for (const [relativePath, contents] of knowledgeContents) {
      const module = relativePath.match(/^docs\/modules\/([a-z0-9-]+)(?:\.md|\/)/)?.[1];
      const scoped = manifest.schema_version === '1.4' && manifest.scopes?.find(entry => entry.module === module);
      if (scoped ? scoped.status !== 'current' : manifest.status !== 'current') continue;
      if (hasTemplateProvenancePlaceholder(contents)) errors.push('Reviewed document retains template provenance: ' + relativePath);
      const citations = knowledgeProvenancePaths(contents);
      if (citations.length === 0) {
        errors.push(
          'Current project knowledge requires at least one structured Provenance path: ' +
          relativePath
        );
        continue;
      }
      for (const citation of citations) {
        const normalized = citation.replaceAll('\\', '/').replace(/^\.\//, '');
        const derivedCitation = isManagedDocumentationPath(normalized, [...seenModules], manifest.engineering);
        const summaryCitation = relativePath === 'docs/agent-context.md' &&
          knowledgeContents.has(normalized) && normalized !== relativePath;
        if (!isContainedProjectPath(projectRoot, normalized) || isControlPlaneEvidence(normalized) ||
            (derivedCitation && !summaryCitation)) {
          errors.push('Project knowledge has an invalid or control-plane Provenance path: ' + citation);
          continue;
        }
        // The compact view may cite reviewed docs produced after the observed source commit.
        const scopedExists = scoped && (scoped.observation?.kind === 'worktree'
          ? fs.existsSync(path.join(projectRoot, normalized))
          : runGit(projectRoot, ['cat-file', '-e', scoped.observation?.base_revision + ':' + normalized]).ok);
        if (!summaryCitation && (scoped ? !scopedExists : revisionTree.ok && !revisionFiles.has(normalized))) {
          errors.push(
            'Project knowledge Provenance path does not exist at observed_revision: ' + citation
          );
        }
      }
    }
  }

  return trackedPaths;
}

function verifyKnowledgeObservation(projectRoot, head, status, errors, warnings) {
  const manifest = loadKnowledgeManifest(projectRoot, errors);
  if (!manifest || manifest.status !== 'current' || !head.ok) {
    return;
  }
  const revisionExists = runGit(projectRoot, [
    'cat-file', '-e', String(manifest.observed_revision) + '^{commit}'
  ]);
  if (!revisionExists.ok) {
    errors.push('Project knowledge observed_revision does not resolve to a Git commit.');
    return;
  }
  if (manifest.observed_revision !== head.stdout) {
    const changed = runGit(projectRoot, [
      'diff', '--name-only', '--diff-filter=ACDMRTUXB',
      String(manifest.observed_revision) + '..' + head.stdout, '--'
    ]);
    const controlOnly = (relativePath) =>
      relativePath === 'AGENTS.md' ||
      relativePath === '.github/copilot-instructions.md' ||
      relativePath.startsWith('.accord/') ||
      relativePath.startsWith('.agents/') ||
      isManagedDocumentationPath(relativePath, Array.isArray(manifest.modules) ? manifest.modules : [], manifest.engineering);
    const sourceChanges = changed.ok
      ? changed.stdout.split(/\r?\n/).filter(Boolean).filter((file) => !controlOnly(file))
      : [];
    if (!changed.ok) {
      warnings.push('Could not compare project knowledge observed_revision with HEAD.');
    } else if (sourceChanges.length > 0) {
      warnings.push(
        'Project knowledge may be stale: ' + sourceChanges.length +
        ' source or project-document paths changed after observed_revision.'
      );
    }
  }
  if (status.ok && status.stdout) {
    warnings.push(
      'Project knowledge is revision-bound to clean committed files; current uncommitted changes are outside that view.'
    );
  }
}

function parseChangeFrontMatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }

  const values = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([a-z_]+):\s*(.+?)\s*$/i);
    if (pair) {
      values[pair[1]] = pair[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return values;
}

function revisionInVersionRow(text, label) {
  const line = text
    .split(/\r?\n/)
    .find((candidate) => candidate.toLowerCase().includes(label.toLowerCase()));

  if (!line) {
    return null;
  }

  return line.match(/\b[0-9a-f]{40}\b/i)?.[0] || null;
}

function verifyCapabilityLedger(text, file, errors) {
  const section = markdownSection(text, '### Capability Use');
  if (!section || containsPendingMarker(section)) {
    errors.push('Post-design material Change requires a resolved Capability Use ledger: ' + file);
    return;
  }
  const ledgerRows = section.split(/\r?\n/).filter(line => /^\s*\|/.test(line));
  const explicitlyUnused = ledgerRows.some(row =>
    /^\s*\|\s*(?:none|no optional capability|未使用|不适用)\s*\|/i.test(row) ||
    /^\s*\|[^|]*\|\s*(?:not applicable|no optional capability|未使用|不适用)\s*\|/i.test(row)
  );
  const lifecycleStates = ['selected', 'loaded', 'applied', 'verified'];
  const hasLifecycle = lifecycleStates.every(state => new RegExp('\\b' + state + '\\b', 'i').test(section));
  if (!explicitlyUnused && !hasLifecycle) {
    errors.push('Capability Use ledger must distinguish selected, loaded, applied, and verified, or record an explicit no-use basis: ' + file);
  }
  if (hasLifecycle && /\bloaded\b[\s\S]{0,160}\bapplied\b/i.test(section) &&
      !/\b(?:output|evidence|revision|skip|failure|结果|证据|版本|跳过|失败)\b/i.test(section)) {
    errors.push('Capability Use ledger needs output/evidence or a skip/failure basis: ' + file);
  }
}

function requireCommitRevision(projectRoot, text, label, context, errors) {
  const revision = revisionInVersionRow(text, label);
  if (!revision) {
    errors.push(context + ' is missing a full Git ' + label.toLowerCase() + '.');
    return null;
  }
  if (!runGit(projectRoot, ['cat-file', '-e', revision + '^{commit}']).ok) {
    errors.push(context + ' ' + label.toLowerCase() + ' does not resolve to a Git commit.');
  }
  return revision;
}

function containsPendingMarker(text) {
  return /\b(?:replace[- ]with|CHG-XXXX|YYYY-MM-DD|REQ-XXX|UN-XXX)\b/i.test(text) ||
    /(?:^|\|)\s*Pending(?:[^|\r\n]*)?(?=\||$)/im.test(text) ||
    /Design Input Ready:\s*\*\*No\b/i.test(text);
}

function markdownSection(text, heading) {
  const start = text.indexOf(heading);
  if (start < 0) return '';
  const remainder = text.slice(start + heading.length);
  const next = remainder.search(/^##\s+/m);
  return next < 0 ? remainder : remainder.slice(0, next);
}

function validAcceptedAt(value) {
  if (typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)?$/.test(value)) {
    return false;
  }
  const parsed = new Date(value.length === 10 ? value + 'T00:00:00Z' : value);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value.slice(0, 10);
}

function verifyCurrentChange(projectRoot, change, text, file, errors) {
  const headings = ['## Intent and Scope', '## Need and Design Input', '## Context and Impact',
    '## Decisions and Authority', '## Git and Recovery', '## Verification and Validation', '## Acceptance'];
  for (const heading of headings) if (!text.includes(heading)) errors.push('Change is missing ' + heading + ': ' + file);
  if (!['pending', 'ready', 'approved'].includes(change.design_input_status) ||
      !['pending', 'approved'].includes(change.implementation_authority) ||
      !['not-required', 'pending', 'approved'].includes(change.execution_authority)) errors.push('Invalid Change readiness/authority state: ' + file);
  if (!POST_DESIGN_STATUSES.has(change.status)) return;
  if (!['ready', 'approved'].includes(change.design_input_status)) errors.push('Ready Change requires sufficiently specified inputs: ' + file);
  if (AUTHORIZED_STAGES.has(change.status)) {
    if (change.design_input_status !== 'approved' || change.implementation_authority !== 'approved' ||
        !change.authority_basis || containsPendingMarker(change.authority_basis)) errors.push('Authorized Change requires approved inputs and inspectable scoped human authority_basis: ' + file);
    requireCommitRevision(projectRoot, text, 'Base revision', file, errors);
  }
  if (EXECUTING_STAGES.has(change.status) && change.risk === 'L4' && change.execution_authority !== 'approved') errors.push('Executing L4 Change requires explicit execution authority: ' + file);
  if (change.risk !== 'L4' && change.execution_authority !== 'not-required') errors.push('L2/L3 execution_authority must be not-required: ' + file);
  if (AUTHORIZED_STAGES.has(change.status) && ['L3', 'L4'].includes(change.risk)) requireCommitRevision(projectRoot, text, 'Checkpoint', file, errors);
  const ledger = markdownSection(text, '### Capability Use').match(/```json\s*\n([\s\S]*?)\n```/);
  if (!ledger) errors.push('Change requires one JSON method-use array (empty with a no-use basis): ' + file);
  else {
    try {
      const entries = parseExactJson(ledger[1]);
      errors.push(...validateMethodUse(entries, change.status).map(error => error + ': ' + file));
      if (Array.isArray(entries) && !entries.length && !change.method_use_basis) errors.push('Empty method use requires method_use_basis: ' + file);
    } catch (error) { errors.push('Invalid method-use JSON: ' + file + ': ' + error.message); }
  }
  if (DELIVERY_STAGES.has(change.status)) {
    for (const heading of headings.slice(0, -1).filter(h => h !== '## Git and Recovery')) {
      if (containsPendingMarker(markdownSection(text, heading))) errors.push('Delivery retains unresolved engineering markers in ' + heading + ': ' + file);
    }
    if (!change.evidence_basis || containsPendingMarker(change.evidence_basis)) errors.push('Delivery requires revision/worktree-bound evidence_basis: ' + file);
  }
  if (['accepted', 'awaiting-archive'].includes(change.status) && (!change.acceptance_basis || containsPendingMarker(change.acceptance_basis))) errors.push('Human acceptance requires acceptance_basis: ' + file);
  if (change.status === 'accepted') requireCommitRevision(projectRoot, text, 'Result revision', file, errors);
  if (change.status === 'awaiting-archive' && (!change.archive_basis || containsPendingMarker(change.archive_basis))) errors.push('Deferred archive requires archive_basis, not a fabricated result revision: ' + file);
}

function verifyActiveChanges(projectRoot, errors, warnings, selected = null) {
  const changesRoot = path.join(projectRoot, '.accord', 'changes');
  if (!fs.existsSync(changesRoot)) {
    errors.push('Missing active Change directory: ' + changesRoot);
    return;
  }

  const files = fs.readdirSync(changesRoot)
    .filter((file) => file.endsWith('.md') && (!selected || file === selected + '.md'))
    .sort();
  if (selected && !files.length) errors.push('Selected Change does not exist: ' + selected);

  for (const file of files) {
    const filePath = path.join(changesRoot, file);
    const text = fs.readFileSync(filePath, 'utf8');
    const change = parseChangeFrontMatter(text);

    if (!change.id || !change.status || !change.risk || !change.accord_version) {
      errors.push('Active Change has incomplete front matter: ' + file);
      continue;
    }

    if (!/^CHG-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(change.id)) {
      errors.push('Active Change ID must use upper-case CHG-* naming: ' + file);
    } else if (file !== change.id + '.md') {
      errors.push('Active Change filename must match its ID: ' + file);
    }

    if (!RISK_LEVELS.has(change.risk)) {
      errors.push('Active Change risk must be L0, L1, L2, L3, or L4: ' + file);
    }
    if (!CHANGE_STATUSES.has(change.status)) {
      errors.push('Active Change has an invalid status: ' + file);
    }
    if (change.accord_version === '0.8' && change.status === 'awaiting-archive') errors.push('awaiting-archive requires a reviewed Change 0.9 migration: ' + file);
    if (!RECORD_SCHEMAS.has(change.accord_version)) {
      errors.push(
        'Active Change requires reviewed migration to accord_version ' +
        CHANGE_SCHEMA + ': ' + file
      );
    }
    if (change.owner !== 'human-user') {
      errors.push('Active Change owner must be human-user: ' + file);
    }
    if (!RISK_LEVELS.has(change.risk) || !CHANGE_STATUSES.has(change.status) ||
        !RECORD_SCHEMAS.has(change.accord_version)) {
      continue;
    }

    if (!MATERIAL_RISKS.has(change.risk)) {
      continue;
    }

    if (change.accord_version === CHANGE_SCHEMA) {
      verifyCurrentChange(projectRoot, change, text, file, errors);
      continue;
    }

    const requiredHeadings = [
      '## Intent and Scope',
      '## Need and Design Input',
      '### Discovery and Delta',
      '### Scenarios and Acceptance',
      '## Context and Impact',
      '### Change Context and Impact Map',
      '### Project Knowledge Impact',
      '### Capability Use',
      '## Decisions and Authority',
      '## Traceability',
      '## Git and Recovery',
      '## Verification and Validation',
      '## Acceptance'
    ];
    for (const heading of requiredHeadings) {
      if (!text.includes(heading)) {
        errors.push('Material Change is missing ' + heading + ': ' + file);
      }
    }

    if (!POST_DESIGN_STATUSES.has(change.status)) {
      continue;
    }

    if (!['pending', 'approved'].includes(change.design_input_status)) {
      errors.push('Material Change design_input_status must be pending or approved: ' + file);
    }
    if (!['pending', 'approved'].includes(change.implementation_authority)) {
      errors.push('Material Change implementation_authority must be pending or approved: ' + file);
    }
    if (!['not-required', 'pending', 'approved'].includes(change.execution_authority)) {
      errors.push('Material Change execution_authority is invalid: ' + file);
    }

    if (POST_DESIGN_STATUSES.has(change.status) && change.design_input_status !== 'approved') {
      errors.push('Post-design material Change requires approved design_input_status: ' + file);
    }
    if (['approved', 'implementing', 'verifying', 'validating', 'review', 'accepted'].includes(change.status) &&
        change.implementation_authority !== 'approved') {
      errors.push('Approved or executing material Change requires implementation_authority approved: ' + file);
    }
    if (change.risk === 'L4' &&
        ['implementing', 'verifying', 'validating', 'review', 'accepted'].includes(change.status) &&
        change.execution_authority !== 'approved') {
      errors.push('Executing L4 Change requires explicit execution_authority approved: ' + file);
    }
    if (change.risk !== 'L4' && change.execution_authority !== 'not-required') {
      errors.push('L2/L3 Change execution_authority must be not-required: ' + file);
    }

    if (POST_DESIGN_STATUSES.has(change.status)) {
      requireCommitRevision(projectRoot, text, 'Base revision', 'Material Change ' + file, errors);

      const intentSection = markdownSection(text, '## Intent and Scope');
      for (const label of [
        'Direct user request',
        'Current state',
        'Target state',
        'Recommended interpretation'
      ]) {
        if (!new RegExp('\\|\\s*' + label + '\\s*\\|', 'i').test(intentSection)) {
          errors.push('Post-design material Change is missing intent alignment field "' +
            label + '": ' + file);
        }
      }

      const designInputSection = markdownSection(text, '## Need and Design Input');
      if (!/\b(?:preserve|extend|modify|supersede|unresolved|not[ -]applicable)\b/i
        .test(designInputSection)) {
        errors.push('Post-design material Change must classify affected baseline relations: ' + file);
      }
      verifyCapabilityLedger(text, file, errors);
    }

    if (['L3', 'L4'].includes(change.risk) &&
        ['approved', 'implementing', 'verifying', 'validating', 'review', 'accepted'].includes(change.status) &&
        !revisionInVersionRow(text, 'Checkpoint')) {
      errors.push('L3/L4 Change is missing a full Git checkpoint revision: ' + file);
    } else if (['L3', 'L4'].includes(change.risk) &&
        ['approved', 'implementing', 'verifying', 'validating', 'review', 'accepted'].includes(change.status)) {
      requireCommitRevision(projectRoot, text, 'Checkpoint', 'L3/L4 Change ' + file, errors);
    }

    const reviewReadySections = [
      '## Intent and Scope',
      '## Need and Design Input',
      '## Context and Impact',
      '## Decisions and Authority',
      '## Traceability',
      '## Verification and Validation',
      '## Limitations and Residual Risk'
    ].map((heading) => markdownSection(text, heading)).join('\n');
    if (change.status === 'review' && containsPendingMarker(reviewReadySections)) {
      errors.push('Review Change still contains unresolved engineering or V&V markers: ' + file);
    }
    if (change.status === 'accepted' && containsPendingMarker(text)) {
      errors.push('Accepted Change still contains unresolved template markers: ' + file);
    }
    if (change.status === 'accepted') {
      requireCommitRevision(projectRoot, text, 'Result revision', 'Accepted Change ' + file, errors);
      if (/^- \[ \]/m.test(text)) {
        errors.push('Accepted Change has unchecked acceptance items: ' + file);
      }
    }
  }
}

function verifyRecords(projectRoot, errors, selected = null) {
  const recordsRoot = path.join(projectRoot, '.accord', 'records');
  if (!fs.existsSync(recordsRoot)) {
    return;
  }

  const files = fs.readdirSync(recordsRoot)
    .filter((file) => file.endsWith('.yaml') && (!selected || file === selected + '.yaml'))
    .sort();

  for (const file of files) {
    const text = fs.readFileSync(path.join(recordsRoot, file), 'utf8');
    let record;
    try {
      record = parseExactJson(text);
    } catch (error) {
      errors.push('Accord 0.8 Record must be JSON-compatible YAML: ' + file + ': ' + error.message);
      continue;
    }
    const id = record?.id;
    if (!RECORD_SCHEMAS.has(record?.schema_version)) {
      errors.push('Unsupported Record schema; historical 0.8 and current 0.9 are readable: ' + file);
    }
    if (!id || !/^CHG-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(id)) {
      errors.push('Accord Record ID must use upper-case CHG-* naming: ' + file);
    } else if (file !== id + '.yaml') {
      errors.push('Accord Record filename must match its ID: ' + file);
    }
    if (typeof record?.title !== 'string' || !record.title.trim() || containsPendingMarker(record.title)) {
      errors.push('Accord Record requires a final non-placeholder title: ' + file);
    }
    if (!RISK_LEVELS.has(record?.risk)) {
      errors.push('Accord Record risk must be L0, L1, L2, L3, or L4: ' + file);
    }
    if (record?.result !== 'accepted') {
      errors.push('Accord Record result must be accepted: ' + file);
    }
    if (!validAcceptedAt(record?.accepted_at)) {
      errors.push('Accord Record accepted_at must be an ISO date or UTC timestamp: ' + file);
    }

    const versionControl = record?.version_control;
    if (!versionControl || versionControl.system !== 'git') {
      errors.push('Accord Record version_control.system must be git: ' + file);
    } else {
      for (const key of ['base_revision', 'result_revision']) {
        const revision = versionControl[key];
        if (!/^[0-9a-f]{40}$/i.test(revision || '')) {
          errors.push('Accord Record requires a full ' + key + ': ' + file);
        } else if (!runGit(projectRoot, ['cat-file', '-e', revision + '^{commit}']).ok) {
          errors.push('Accord Record ' + key + ' does not resolve to a Git commit: ' + file);
        }
      }
      if (['L3', 'L4'].includes(record.risk)) {
        if (!/^[0-9a-f]{40}$/i.test(versionControl.checkpoint_revision || '')) {
          errors.push('L3/L4 Accord Record requires a full checkpoint_revision: ' + file);
        } else if (!runGit(projectRoot, [
          'cat-file', '-e', versionControl.checkpoint_revision + '^{commit}'
        ]).ok) {
          errors.push('Accord Record checkpoint_revision does not resolve to a Git commit: ' + file);
        }
      } else if (versionControl.checkpoint_revision !== null &&
          !/^[0-9a-f]{40}$/i.test(versionControl.checkpoint_revision || '')) {
        errors.push('Accord Record checkpoint_revision must be null or a full Git revision: ' + file);
      }
      if (!['clean', 'dirty-with-disclosed-limitations'].includes(versionControl.worktree)) {
        errors.push('Accord Record version_control.worktree is invalid: ' + file);
      }
      if (!['local-only', 'remote-not-pushed', 'remote-pushed'].includes(versionControl.remote_status)) {
        errors.push('Accord Record version_control.remote_status is invalid: ' + file);
      }
    }

    const requireArray = (container, key, { nonEmpty = false } = {}) => {
      const value = container?.[key];
      if (!Array.isArray(value) ||
          value.some((entry) => typeof entry !== 'string' || !entry.trim() || containsPendingMarker(entry)) ||
          (nonEmpty && value.length === 0)) {
        errors.push('Accord Record ' + key + ' must be ' +
          (nonEmpty ? 'a non-empty array' : 'an array') + ' of non-empty references: ' + file);
      }
      return Array.isArray(value) ? value : [];
    };
    if (record.schema_version === '0.9') {
      for (const key of ['input_refs', 'decision_refs', 'verification_refs', 'validation_refs', 'review_refs']) {
        for (const reference of requireArray(record, key, { nonEmpty: true })) {
          if (typeof reference !== 'string') continue;
          try {
            const historical = reference.match(/^git:([a-f0-9]{40}):([^#]+)(?:#.*)?$/);
            if (historical) {
              const [, revision, relativePath] = historical;
              if (!isContainedProjectPath(projectRoot, relativePath) || !runGit(projectRoot, ['cat-file', '-e', revision + ':' + relativePath]).ok) throw new Error('Historical evidence path does not resolve.');
            } else safeContractPath(projectRoot, reference.split('#')[0]);
          } catch (error) { errors.push('Record evidence reference ' + reference + ': ' + error.message); }
        }
      }
      requireArray(record, 'updated_owners');
      if (typeof record.disposition !== 'string' || !record.disposition.trim() || containsPendingMarker(record.disposition)) {
        errors.push('Record requires a disposition covering document changes/no-update, methods, limitations and residual risk: ' + file);
      }
      continue;
    }
    for (const [key, basisKey] of [
      ['canonical_updates', 'canonical_update_basis'],
      ['project_knowledge_updates', 'project_knowledge_update_basis'],
      ['capabilities_used', 'capabilities_use_basis']
    ]) {
      const values = requireArray(record, key);
      if (values.length === 0 &&
          (typeof record?.[basisKey] !== 'string' || !record[basisKey].trim())) {
        errors.push('Accord Record requires ' + basisKey + ' when ' + key + ' is empty: ' + file);
      }
    }
    requireArray(record?.engineering_inputs, 'user_needs', { nonEmpty: true });
    requireArray(record?.engineering_inputs, 'requirements', { nonEmpty: true });
    requireArray(record?.engineering_inputs, 'interfaces_data_risks_operations');
    requireArray(record?.traceability, 'verified', { nonEmpty: true });
    requireArray(record?.traceability, 'validated', { nonEmpty: true });
    requireArray(record?.traceability, 'known_gaps');
    requireArray(record?.evidence, 'verification', { nonEmpty: true });
    requireArray(record?.evidence, 'validation', { nonEmpty: true });
    requireArray(record?.evidence, 'review', { nonEmpty: true });
    for (const [key, basisKey] of [
      ['limitations', 'limitations_basis'],
      ['residual_risk', 'residual_risk_basis']
    ]) {
      const values = requireArray(record?.evidence, key);
      if (values.length === 0 &&
          (typeof record?.evidence?.[basisKey] !== 'string' || !record.evidence[basisKey].trim())) {
        errors.push('Accord Record evidence requires ' + basisKey + ' when ' + key + ' is empty: ' + file);
      }
    }
  }
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
    '.agents/skills/accord/references/change-lifecycle.md',
    '.agents/skills/accord/references/knowledge-acquisition.md',
    '.agents/skills/accord/references/knowledge-query-and-refresh.md',
    '.agents/skills/accord/references/capability-lifecycle.md',
    '.agents/skills/accord/references/presentation-output.md',
    '.agents/skills/accord/scripts/accord-capability-bundle.mjs',
    '.agents/skills/accord/scripts/accord-inventory.mjs',
    '.agents/skills/accord/scripts/accord-route.mjs',
    '.agents/skills/accord/scripts/accord-methods.mjs',
    '.agents/skills/accord/scripts/accord-validate.mjs',
    '.agents/skills/accord/scripts/accord-engineering.mjs',
    '.agents/skills/accord/scripts/accord-contracts.mjs',
    '.agents/skills/accord/scripts/accord-adoption.mjs',
    '.agents/skills/accord/scripts/accord-protocol.mjs',
    '.agents/skills/accord/scripts/accord-scope.mjs',
    '.accord/accord.yaml'
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

  for (const relativeDirectory of ['.accord/changes', '.accord/records']) {
    if (![...trackedFiles].some((file) => file.startsWith(relativeDirectory + '/'))) {
      errors.push('Accord state directory has no tracked retention file: ' + relativeDirectory);
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
    } else if (['--scope', '--change', '--modules', '--routes'].includes(argument)) {
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
  console.log('Usage: node accord-validate.mjs --project <path> [--scope installation|task|delivery|audit] [--change CHG-ID] [--modules id,id] [--routes id,id] [--require-clean]');
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
  const scope = options.scope || 'audit';
  const checked = ['protocol', 'installation-integrity', 'Git-state'];
  const notChecked = [];
  if (!VALIDATION_SCOPES.has(scope) || (options.change && !/^CHG-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(options.change)) ||
      (['task', 'delivery'].includes(scope) && !options.change && !options.modules?.length) ||
      (['audit', 'installation'].includes(scope) && (options.change || options.modules || options.routes))) {
    return { projectRoot, errors: ['Invalid scope/Change ID; task or delivery requires --change or --modules.'], warnings, checked: [], notChecked: ['all'] };
  }

  if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
    return { errors: ['Project directory does not exist: ' + projectRoot], warnings, projectRoot };
  }

  for (const relativePath of [
    'AGENTS.md',
    '.github/copilot-instructions.md',
    '.agents/skills/accord/SKILL.md',
    '.accord/records'
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
  const installation = inspectInstallation(projectRoot, config);
  errors.push(...installation.errors);
  warnings.push(...installation.warnings);
  const codingPracticesPath = verifyCodingPractices(projectRoot, config, agents, copilot, errors);
  let moduleSelection = options.modules;
  if (moduleSelection?.length) {
    try { moduleSelection = selectModuleScope(loadKnowledgeManifest(projectRoot, errors), moduleSelection); }
    catch (error) { errors.push(error.message); return { errors, warnings, projectRoot, scope, checked, notChecked: ['selected-knowledge-incomplete'] }; }
  }
  const inspectKnowledge = scope === 'audit' || (scope !== 'installation' && options.modules?.length > 0);
  const sourceOwners = inspectKnowledge && moduleSelection?.length
    ? config?.sources?.engineering?.filter(source => !source.modules?.length || source.modules.some(id => moduleSelection.includes(id)))
    : scope === 'audit' ? config?.sources?.engineering : [];
  const engineeringSources = validateEngineeringSources(projectRoot, sourceOwners);
  errors.push(...engineeringSources.errors);
  const knowledgePaths = inspectKnowledge ? verifyKnowledgeBase(
    projectRoot,
    config,
    agents,
    copilot,
    errors,
    warnings,
    moduleSelection
  ) : [];
  if (inspectKnowledge) checked.push(options.modules?.length ? 'knowledge:' + options.modules.join(',') + '+dependencies' : 'all-knowledge');
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
  knowledgePaths.push(...engineeringSources.paths);
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
    warnings.push('Working tree has changes. Confirm they belong to the active Change before staging.');
    if (options.requireClean) {
      errors.push('Working tree is not clean.');
    }
  }
  if (inspectKnowledge && !options.modules?.length) verifyKnowledgeObservation(projectRoot, head, status, errors, warnings);

  if (config?.repository?.remote?.mode === 'required') {
    const remotes = runGit(projectRoot, ['remote']);
    if (!remotes.ok || !remotes.stdout) {
      errors.push('repository.remote.mode is required but no Git remote is configured.');
    }
  }

  if (scope === 'audit' || options.change) {
    verifyActiveChanges(projectRoot, errors, warnings, scope === 'audit' ? null : options.change);
    checked.push(scope === 'audit' ? 'all-active-changes' : 'change:' + options.change);
  } else notChecked.push('active-changes');
  if (scope === 'audit' || (scope === 'delivery' && options.change)) {
    verifyRecords(projectRoot, errors, scope === 'audit' ? null : options.change);
    checked.push(scope === 'audit' ? 'all-records' : 'matching-record-if-present');
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
