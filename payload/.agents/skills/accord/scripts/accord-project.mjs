#!/usr/bin/env node
// Versioned project metadata and bounded navigation. Never executes document content.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { parseExactJson, readProjectContract, compareContracts } from './accord-contracts.mjs';
import { captureObservation } from './accord-scope.mjs';

export const digest = value => crypto.createHash('sha256').update(value).digest('hex');
export const ID = /^[A-Za-z][A-Za-z0-9._-]{0,127}$/;
export const SHA = /^[a-f0-9]{40,64}$/;
export const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
export const strings = x => Array.isArray(x) && x.length <= 10000 && x.every(y => typeof y === 'string' && y.trim()) && new Set(x).size === x.length;
export function relativePath(value) {
  if (typeof value !== 'string' || !value || value.length > 512 || /[\\:\x00-\x1f*?\[\]]/.test(value) ||
      value.split('/').some(p => !p || p === '.' || p === '..' || /[. ]$/.test(p) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p))) {
    throw new Error('Expected a literal, normalized project-relative path: ' + String(value));
  }
  return value;
}
export function readBytes(root, relative, limit = 2 * 1024 * 1024) {
  relativePath(relative);
  let file = fs.realpathSync(root);
  for (const part of relative.split('/')) {
    file = path.join(file, part);
    if (fs.lstatSync(file).isSymbolicLink()) throw new Error('Symbolic link is not a metadata/source owner: ' + relative);
  }
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size > limit) throw new Error('File exceeds type/size limit: ' + relative);
  return fs.readFileSync(file);
}
export const readJson = (root, file) => parseExactJson(readBytes(root, file).toString('utf8'));
export function gitRead(root, args) {
  const r = spawnSync('git', ['--literal-pathspecs', ...args], { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
  if (r.status !== 0 || r.error) throw new Error('Git inspection failed: ' + args[0]);
  return r.stdout;
}
export const owns = (prefix, file) => file === prefix || file.startsWith(prefix + '/');

export function validateDocumentationPolicy(policy) {
  const errors = [];
  if (!object(policy) || policy.schema_version !== '1.0' || policy.coverage !== 'all-maintained-files' ||
      policy.detail !== 'importance-based' || !Array.isArray(policy.rules) || policy.rules.length > 1000 ||
      !Array.isArray(policy.excludes) || policy.excludes.length > 1000) return ['Unsupported documentation policy.'];
  const keys = new Set();
  for (const rule of policy.rules) {
    if (!object(rule) || !ID.test(rule.id || '') || keys.has(rule.id) || !strings(rule.kinds) || !rule.kinds.length ||
        !strings(rule.topics) || !rule.topics.length || !['combined-or-split', 'separate-topics'].includes(rule.layout) ||
        (rule.modules !== undefined && !strings(rule.modules)) ||
        (rule.min_files !== undefined && (!Number.isInteger(rule.min_files) || rule.min_files < 1 || rule.min_files > 1000)) ||
        (rule.max_files !== undefined && (!Number.isInteger(rule.max_files) || rule.max_files < (rule.min_files || 1) || rule.max_files > 1000))) errors.push('Invalid documentation rule: ' + rule?.id);
    keys.add(rule?.id);
  }
  for (const entry of policy.excludes) {
    try { relativePath(entry.path); if (!entry.reason?.trim()) throw new Error('Missing reason'); }
    catch { errors.push('Excluded file group requires a literal path and reason.'); }
  }
  return errors;
}

// Documents are declared once, at system level or inside their owning module.
// Index is derived in memory; no global mutable task pointer or duplicated authoring registry.
export function loadProjectModel(root, config = readJson(root, '.accord/accord.yaml'), manifest = readJson(root, 'docs/manifest.yaml')) {
  if (config.schema_version !== '0.9' || config.knowledge_base?.structure_version !== '2.0') throw new Error('Migrate configuration and knowledge together before using current project tools.');
  if (manifest.schema_version !== '2.0' || manifest.structure !== 'accord-project-knowledge' || manifest.knowledge_root !== 'docs' ||
      !['draft', 'current'].includes(manifest.status) || !strings(manifest.module_files) || !Array.isArray(manifest.documents)) throw new Error('Expected knowledge 2.0 registry.');
  const policyPath = config.documentation?.policy;
  const policy = readJson(root, policyPath);
  const errors = validateDocumentationPolicy(policy);
  const modules = manifest.module_files.map(file => ({ ...readJson(root, file), metadata_path: file }));
  const byId = new Map(); const ownership = new Map();
  for (const m of modules) {
    if (!ID.test(m.id || '') || byId.has(m.id) || !strings(m.kinds) || !m.kinds.length ||
        !strings(m.source_paths) || !strings(m.depends_on) || !Array.isArray(m.documents) ||
        !(m.parent === null || ID.test(m.parent || '')) || !['draft', 'current'].includes(m.status) || !strings(m.gaps) ||
        (m.not_applicable !== undefined && (!Array.isArray(m.not_applicable) || m.not_applicable.some(e => !object(e) || !e.topic?.trim() || !e.reason?.trim())))) {
      errors.push('Invalid or duplicate module declaration: ' + m.id); continue;
    }
    byId.set(m.id, m);
    for (const source of m.source_paths) {
      try { relativePath(source); } catch (e) { errors.push(e.message); }
      const key = source.toLowerCase();
      if (ownership.has(key)) errors.push('Ambiguous source ownership: ' + source);
      ownership.set(key, m.id);
    }
  }
  for (const m of byId.values()) {
    if (m.depends_on.some(id => !byId.has(id)) || (m.parent !== null && !byId.has(m.parent))) errors.push('Unresolved module relationship: ' + m.id);
    const seen = new Set([m.id]); let p = m.parent;
    while (p && byId.has(p)) {
      if (seen.has(p)) { errors.push('Module hierarchy cycle: ' + m.id); break; }
      seen.add(p); p = byId.get(p).parent;
    }
  }
  const documents = [...manifest.documents.map(d => ({ ...d, module: null })),
    ...modules.flatMap(m => (m.documents || []).map(d => ({ ...d, module: m.id })))];
  // Existing engineering owners can be registered in the new registry; do not maintain both.
  if (config.sources?.engineering !== undefined) errors.push('Knowledge 2.0 owns the unified document registry; migrate sources.engineering owners into it, without duplicating facts.');
  const docIds = new Set(), docPaths = new Set();
  for (const d of documents) {
    try { relativePath(d.path); } catch (e) { errors.push(e.message); }
    if (!ID.test(d.id || '') || docIds.has(d.id) || docPaths.has(d.path?.toLowerCase()) ||
        !strings(d.topics) || !d.topics.length || !strings(d.refs) || !strings(d.audience) || !d.audience.length ||
        !['draft', 'approved-target', 'observed', 'gap', 'retired'].includes(d.status) ||
        !['public', 'internal', 'restricted'].includes(d.sensitivity) || !strings(d.requirements) ||
        (d.review !== undefined && (!object(d.review) || !/^[a-f0-9]{64}$/.test(d.review.sha256 || '') || !d.review.basis?.trim()))) errors.push('Invalid or duplicate document owner: ' + d.id);
    docIds.add(d.id); docPaths.add(d.path?.toLowerCase());
  }
  for (const d of documents) if (d.refs?.some(id => !docIds.has(id))) errors.push('Unresolved document reference: ' + d.id);
  if (manifest.exact_contracts !== undefined && (!Array.isArray(manifest.exact_contracts) || manifest.exact_contracts.length > 10000)) errors.push('Exact contracts must be a bounded list.');
  if (errors.length) throw new Error(errors.join('\n'));
  return { root, config, manifest, policy, modules, documents,
    metadata_paths: ['docs/manifest.yaml', policyPath, ...manifest.module_files],
    fingerprint: digest(JSON.stringify({ manifest, policy, modules })) };
}

export function moduleClosure(model, seeds, impact = false) {
  if (!strings(seeds) || seeds.some(id => !model.modules.some(m => m.id === id))) throw new Error('Select distinct registered modules.');
  const selected = new Set(seeds);
  if (impact) {
    for (let changed = true; changed;) {
      changed = false;
      for (const m of model.modules) if (!selected.has(m.id) && m.depends_on.some(id => selected.has(id))) { selected.add(m.id); changed = true; }
    }
  }
  const affected = [...selected];
  const queue = [...selected];
  for (let i = 0; i < queue.length; i++) {
    const m = model.modules.find(m => m.id === queue[i]);
    for (const id of [...m.depends_on, ...(m.parent ? [m.parent] : [])]) if (!selected.has(id)) { selected.add(id); queue.push(id); }
  }
  return { affected: affected.sort(), context: [...selected].sort() };
}

// Follow document references without loading bodies or resurrecting retired owners.
function documentClosure(model, initial) {
  const byId = new Map(model.documents.map(d => [d.id, d]));
  const documents = initial.filter(d => d.status !== 'retired');
  const chosen = new Set(documents.map(d => d.id)), gaps = [];
  for (let i = 0; i < documents.length; i++) for (const id of documents[i].refs) {
    const target = byId.get(id);
    if (!target || target.status === 'retired') {
      gaps.push({ document: documents[i].id, reference: id, reason: 'referenced owner missing or retired' });
    } else if (!chosen.has(id)) { chosen.add(id); documents.push(target); }
  }
  return { documents, gaps };
}

export function selectProjectContext(model, { modules = [], query = '', impact = false, documents = [] } = {}) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = d => terms.length && terms.some(t => [d.id, d.path, ...d.topics, ...d.requirements].join(' ').toLowerCase().includes(t));
  if (!strings(documents) || documents.some(id => !model.documents.some(d => d.id === id))) throw new Error('Unknown document ID.');
  const seeds = [...new Set([...modules, ...model.documents.filter(d => (documents.includes(d.id) || matches(d)) && d.module).map(d => d.module)])];
  const scope = moduleClosure(model, seeds, impact);
  const selected = documentClosure(model, model.documents.filter(d =>
    documents.includes(d.id) || matches(d) || scope.context.includes(d.module) ||
    (!d.module && d.topics.some(t => ['architecture', 'system-constraints'].includes(t)))));
  const contextualModules = new Set([...scope.context, ...selected.documents.map(d => d.module)]);
  const gaps = [...selected.gaps, ...model.modules.filter(m => contextualModules.has(m.id) && (m.status !== 'current' || m.gaps.length))
    .map(m => ({ module: m.id, reasons: m.gaps, status: m.status }))];
  return { schema_version: '1.0', status: seeds.length || documents.length || model.documents.some(matches) ? 'selected' : 'needs-scope',
    scope, metadata_fingerprint: model.fingerprint,
    documents: selected.documents.map(d => ({ id: d.id, path: d.path, module: d.module, topics: d.topics, status: d.status, reason: documents.includes(d.id) ? 'explicit' : 'scope-or-reference' })),
    gaps, required_probes: impact ? ['actual consumers and imports', 'shared data and configuration', 'dynamic registration and deployment', 'actual diff versus selected scope'] : [],
    limitation: 'Metadata candidates, not semantic completeness or permission. Read selected owners, expand from independent boundary evidence, and stop only when material unknowns are resolved or disclosed.' };
}

export function sourceOwner(model, file) {
  return model.modules.flatMap(m => m.source_paths.filter(p => owns(p, file)).map(p => ({ id: m.id, length: p.length })))
    .sort((a, b) => b.length - a.length)[0]?.id || model.documents.find(d => d.path === file)?.module || null;
}

export function validateProjectKnowledge(model, { modules = null, inventory = true } = {}) {
  const errors = [], gaps = [], inspected = [];
  const scope = modules?.length ? moduleClosure(model, modules).context : model.modules.map(m => m.id);
  const selected = documentClosure(model, model.documents.filter(d => !d.module || scope.includes(d.module)));
  const docs = selected.documents; gaps.push(...selected.gaps);
  for (const d of docs.filter(d => d.status !== 'retired')) {
    try {
      const bytes = readBytes(model.root, d.path); inspected.push(d.path);
      if (d.review && digest(bytes) !== d.review.sha256) gaps.push({ document: d.id, reason: 'reviewed content changed' });
      if (!d.review || ['draft', 'gap'].includes(d.status)) gaps.push({ document: d.id, reason: 'semantic coverage not reviewed' });
    } catch (e) { errors.push(e.message); }
  }
  for (const entity of [{ id: null, kinds: ['system'] }, ...model.modules.filter(m => scope.includes(m.id))]) {
    const owned = docs.filter(d => d.module === entity.id && d.status !== 'retired');
    // All matching requirements combine; projects edit applicability to narrow a global rule.
    const applicable = model.policy.rules.filter(r => r.kinds.some(k => entity.kinds.includes(k)) && (!r.modules || r.modules.includes(entity.id)));
    for (const r of applicable) {
      for (const topic of r.topics) if (!owned.some(d => d.topics.includes(topic)) && !entity.not_applicable?.some(e => e.topic === topic && e.reason?.trim())) gaps.push({ module: entity.id, rule: r.id, reason: 'missing topic: ' + topic });
      if (r.layout === 'separate-topics' && owned.some(d => d.topics.filter(t => r.topics.includes(t)).length > 1)) gaps.push({ module: entity.id, rule: r.id, reason: 'topics require separate document owners' });
      const count = owned.filter(d => d.topics.some(t => r.topics.includes(t))).length;
      if (count < (r.min_files || 0) || count > (r.max_files || Infinity)) gaps.push({ module: entity.id, rule: r.id, reason: 'file count outside configured bounds' });
    }
  }
  for (const m of model.modules.filter(m => scope.includes(m.id))) {
    if (m.status !== 'current' || m.gaps.length) gaps.push({ module: m.id, reason: 'module has draft relationships or declared gaps' });
    if (m.source_paths.length) {
      try {
        const observed = captureObservation(model.root, m.source_paths);
        if (!m.observation || m.observation.digest !== observed.digest) gaps.push({ module: m.id, reason: 'source observation missing or stale', observation: observed });
      } catch (e) { gaps.push({ module: m.id, reason: e.message }); }
    }
  }
  const contractIds = new Set(), artifacts = new Set();
  for (const contract of model.manifest.exact_contracts || []) {
    if (!ID.test(contract.id || '') || contractIds.has(contract.id) || artifacts.has(contract.artifact) ||
        !model.modules.some(m => m.id === contract.module) || !['json-schema', 'openapi-json'].includes(contract.format) ||
        !model.documents.some(d => d.path === contract.artifact) || !model.documents.some(d => d.path === contract.explanation) ||
        model.documents.some(d => d.path === contract.source) || contract.source === contract.artifact) {
      errors.push('Invalid exact contract identity or canonical owners: ' + contract.id); continue;
    }
    contractIds.add(contract.id); artifacts.add(contract.artifact);
    if (!scope.includes(contract.module) && !docs.some(d => d.path === contract.artifact || d.path === contract.explanation)) continue;
    try {
      const result = compareContracts(readProjectContract(model.root, contract.source, contract.format), readProjectContract(model.root, contract.artifact, contract.format));
      if (result.status === 'mismatch') errors.push('Exact contract drift: ' + contract.id);
      if (result.status === 'partial') gaps.push({ contract: contract.id, reason: 'unresolved exact contract references' });
    } catch (e) { errors.push(e.message); }
  }
  const files = [];
  if (inventory) {
    const names = [...new Set(gitRead(model.root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean))];
    if (names.length > 100000) throw new Error('Inventory budget exceeded; cannot claim full coverage.');
    for (const file of names) {
      if (!fs.existsSync(path.join(model.root, file))) continue;
      const module = sourceOwner(model, file);
      const excluded = model.policy.excludes.find(e => owns(e.path, file));
      const registered = model.metadata_paths.includes(file) || model.documents.some(d => d.path === file);
      if (!module && !excluded && !registered) gaps.push({ path: file, reason: 'unmapped maintained file' });
      if (!modules || !module || scope.includes(module)) files.push({ path: file, module, ...(excluded ? { excluded: excluded.reason } : {}) });
    }
  }
  return { errors, gaps, scope, inspected, files, coverage: gaps.length ? 'partial' : 'declared',
    semantic_assurance: 'not-proven-by-mechanical-check', symbol_analysis: 'not-performed; document important components explicitly', inventory_complete: inventory };
}

export function createPublicationManifest(model, { modules = null, audience = null, sensitivities = ['public', 'internal'], previous = null, release = null } = {}) {
  if (!strings(sensitivities) || sensitivities.some(s => !['public', 'internal', 'restricted'].includes(s))) throw new Error('Unknown sensitivity selection.');
  const scope = modules?.length ? moduleClosure(model, modules).context : model.modules.map(m => m.id);
  const allowed = d => d.status !== 'retired' && (!audience || d.audience.includes(audience)) && sensitivities.includes(d.sensitivity);
  const selected = model.documents.filter(d => allowed(d) && (!d.module || scope.includes(d.module)));
  const ids = new Set(selected.map(d => d.id));
  for (let i = 0; i < selected.length; i++) for (const id of selected[i].refs) {
    const d = model.documents.find(d => d.id === id);
    if (!ids.has(id) && allowed(d)) { selected.push(d); ids.add(id); }
  }
  const files = selected.map(d => {
    const sha256 = digest(readBytes(model.root, d.path));
    return { ...d, sha256, review_matches: d.review ? d.review.sha256 === sha256 : null, unresolved_context: d.refs.filter(id => !ids.has(id)) };
  });
  const contextualModules = new Set([...scope, ...selected.map(d => d.module).filter(Boolean)]);
  const key = { project: model.config.project.id, scope: modules?.length ? [...modules].sort() : null, audience, sensitivities: [...sensitivities].sort(), release };
  // Release is a version label, not a publication-stream identity. An explicit
  // previous manifest permits version-to-version updates in the same audience/scope.
  const selectionIdentity = selection => object(selection) && typeof selection.project === 'string' &&
    (selection.scope === null || strings(selection.scope)) && strings(selection.sensitivities)
    ? JSON.stringify({ project: selection.project, scope: selection.scope === null ? null : [...selection.scope].sort(),
      audience: selection.audience, sensitivities: [...selection.sensitivities].sort() }) : null;
  if (previous && (previous.schema_version !== '1.0' || previous.structure !== 'accord-publication-manifest' ||
      selectionIdentity(previous.selection) !== selectionIdentity(key) || !Array.isArray(previous.documents))) {
    throw new Error('Previous publication selection differs; do not infer deletions across different projects/audiences/scopes.');
  }
  return { schema_version: '1.0', structure: 'accord-publication-manifest', selection: key,
    selected_modules: scope, modules: model.modules.filter(m => contextualModules.has(m.id)).map(m => ({ id: m.id, parent: m.parent, depends_on: m.depends_on, status: m.status, gaps: m.gaps, observation: m.observation || null })),
    observed_revision: gitRead(model.root, ['rev-parse', 'HEAD']).trim(), metadata_fingerprint: model.fingerprint,
    documents: files, removed: previous ? previous.documents.filter(d => !ids.has(d.id)).map(d => ({ id: d.id, path: d.path })) : [],
    omitted: model.documents.filter(d => !ids.has(d.id)).map(d => ({ id: d.id, path: d.path, reason: 'retired, outside scope, audience or sensitivity' })),
    limitation: 'Pipeline must enforce permissions, propagate removals, preserve context and bind deployment versions. Metadata/review declarations are not human approval or semantic completeness.' };
}


function main() {
  const opts = { project: '.', modules: [], documents: [] };
  try {
    for (let i = 2; i < process.argv.length; i++) {
      const a = process.argv[i];
      if (a === '--help') { console.log('accord-project.mjs --project DIR [--modules ID,ID] [--documents ID,ID] [--query TEXT] [--impact|--validate|--publish] [--audience NAME] [--previous FILE] [--release ID]'); return; }
      if (['--impact', '--validate', '--publish'].includes(a)) opts[a.slice(2)] = true;
      else if (['--project', '--modules', '--documents', '--query', '--audience', '--previous', '--release'].includes(a)) {
        const value = process.argv[++i]; if (!value || value.startsWith('--')) throw new Error('Missing value: ' + a);
        opts[a.slice(2)] = ['--modules', '--documents'].includes(a) ? value.split(',') : value;
      } else throw new Error('Unknown option: ' + a);
    }
    const model = loadProjectModel(opts.project);
    const result = opts.publish ? createPublicationManifest(model, { ...opts, previous: opts.previous ? readJson(opts.project, opts.previous) : null }) : opts.validate ? validateProjectKnowledge(model, opts) : selectProjectContext(model, opts);
    console.log(JSON.stringify(result, null, 2));
    if (result.errors?.length) process.exitCode = 1;
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
