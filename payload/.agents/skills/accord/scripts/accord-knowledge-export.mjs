#!/usr/bin/env node
// Build an explicit, source-free Accord knowledge delivery set.
// The delivery is a bounded copy of reviewed documents; it never copies source,
// Git history or Accord control-plane files.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { KNOWLEDGE_DOCUMENTS as STANDARD_DOCUMENTS, KNOWLEDGE_SCHEMAS } from './accord-protocol.mjs';
import { selectModuleScope } from './accord-scope.mjs';

const BLOCKED_TOP_LEVEL = new Set([
  '.git', '.accord', '.agents', 'vendor', 'node_modules',
  'dist', 'build', 'out', 'target', 'coverage'
].map(value => value.toLowerCase()));
const SOURCE_EXTENSIONS = new Set([
  '.c', '.cc', '.cpp', '.cs', '.ex', '.exs', '.go', '.h', '.hpp', '.java',
  '.js', '.jsx', '.kt', '.mjs', '.mts', '.php', '.py', '.rb', '.rs', '.scala',
  '.sql', '.swift', '.ts', '.tsx', '.vue'
]);
const TEXT_EXTENSIONS = new Set([
  '.csv', '.json', '.md', '.mdx', '.rst', '.text', '.toml', '.txt', '.yaml', '.yml'
]);
const BLOCKED_FILENAMES = new Set(['Dockerfile', 'Makefile', 'CMakeLists.txt'].map(value => value.toLowerCase()));
const SENSITIVE_BASENAME = /^(?:\.env(?:\..*)?|credentials(?:\..*)?|id_(?:rsa|dsa|ecdsa|ed25519))$/iu;
const MODES = new Set(['query', 'reconstruction']);

function normalizeRelative(relative) {
  if (typeof relative !== 'string' || !relative.trim()) {
    throw new Error('Delivery paths must be non-empty project-relative strings.');
  }
  const value = relative.replaceAll('\\', '/');
  if (value.startsWith('/') || /^[A-Za-z]:\//.test(value) || value.includes('\0')) {
    throw new Error('Delivery paths must be project-relative: ' + relative);
  }
  const parts = value.split('/');
  if (parts.some(part => !part || part === '.' || part === '..')) {
    throw new Error('Delivery paths cannot contain traversal or empty segments: ' + relative);
  }
  return parts.join('/');
}

function pathInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
}

function nearestExistingParent(candidate) {
  let current = candidate;
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return current;
    current = parent;
  }
  return current;
}

function assertNoSymlinkPath(root, relative) {
  let current = root;
  for (const part of normalizeRelative(relative).split('/')) {
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) {
      throw new Error('Delivery source path cannot traverse a symbolic link: ' + relative);
    }
  }
}

export function sourceFreePathViolation(relative) {
  let normalized;
  try { normalized = normalizeRelative(relative); }
  catch (error) { return error.message; }
  const parts = normalized.split('/');
  if (parts.some(part => BLOCKED_TOP_LEVEL.has(part.toLowerCase()))) {
    return 'control-plane or dependency path is not source-free: ' + normalized;
  }
  const basename = parts.at(-1);
  if (SENSITIVE_BASENAME.test(basename)) return 'sensitive configuration path is not source-free: ' + normalized;
  if (BLOCKED_FILENAMES.has(basename.toLowerCase())) return 'runtime/build source file is not source-free: ' + normalized;
  const extension = path.posix.extname(basename).toLowerCase();
  if (SOURCE_EXTENSIONS.has(extension)) return 'source-code file is not source-free: ' + normalized;
  if (!TEXT_EXTENSIONS.has(extension) && extension !== '') {
    return 'undocumented binary or non-text file is not source-free: ' + normalized;
  }
  return null;
}

// Refuse only high-confidence credential material. Ordinary field names such
// as "password" or "token" are not enough; the value must match a known
// secret format or a private-key block so normal documentation remains usable.
export function sensitiveContentViolation(relative, contents) {
  const text = Buffer.isBuffer(contents) ? contents.toString('utf8') : String(contents ?? '');
  const patterns = [
    /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]+?-----END [A-Z0-9 ]*PRIVATE KEY-----/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\b(?:ghp|gho|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}\b/,
    /\bsk-[A-Za-z0-9]{20,}\b/,
    /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/
  ];
  return patterns.some(pattern => pattern.test(text))
    ? 'high-confidence credential pattern detected in delivery content: ' + relative
    : null;
}

function documentPath(value) {
  const normalized = normalizeRelative(value);
  return normalized.startsWith('docs/') ? normalized : 'docs/' + normalized;
}

function registeredEngineeringPaths(manifest) {
  const engineering = manifest?.engineering;
  if (!engineering || typeof engineering !== 'object') return [];
  const details = Array.isArray(engineering.documents) ? engineering.documents : [];
  const contracts = Array.isArray(engineering.contracts) ? engineering.contracts : [];
  return [
    ...details.map(item => item?.path),
    ...contracts.map(item => item?.artifact)
  ].filter(value => typeof value === 'string' && value.trim());
}

function sourceOwners(config) {
  const sources = config?.sources || {};
  const owners = [];
  if (typeof sources.coding_practices === 'string' && sources.coding_practices.trim()) {
    owners.push({ path: sources.coding_practices, role: 'coding-practices' });
  }
  if (Array.isArray(sources.engineering)) {
    for (const source of sources.engineering) {
      if (typeof source?.path === 'string' && source.path.trim()) {
        owners.push({ path: source.path, role: 'engineering-source', id: source.id || null });
      }
    }
  }
  return owners;
}

/**
 * Select files for a delivery without reading or copying their contents.
 * Query mode contains the derived knowledge view and registered exact details.
 * Reconstruction mode additionally considers registered, text-only engineering
 * inputs and coding practices; source files are reported as omitted.
 */
export function selectKnowledgeFiles({ manifest, config = {}, mode = 'query', modules = null }) {
  if (!MODES.has(mode)) throw new Error('Unknown delivery mode: ' + mode);
  if (!manifest || manifest.structure !== 'accord-project-knowledge' ||
      !KNOWLEDGE_SCHEMAS.has(manifest.schema_version) || manifest.knowledge_root !== 'docs') {
    throw new Error('A valid Accord project knowledge manifest is required.');
  }
  if (!Array.isArray(manifest.documents) || !Array.isArray(manifest.modules)) {
    throw new Error('Knowledge manifest documents and modules must be arrays.');
  }
  if (JSON.stringify(manifest.documents) !== JSON.stringify(STANDARD_DOCUMENTS)) {
    throw new Error('Knowledge manifest documents must use the fixed Accord document spine.');
  }
  const scope = modules?.length ? selectModuleScope(manifest, modules) : null;
  const allManifest = manifest;
  if (scope) {
    manifest = { ...manifest, modules: scope, engineering: { ...manifest.engineering,
      documents: manifest.engineering?.documents?.filter(e => scope.includes(e.module)),
      contracts: manifest.engineering?.contracts?.filter(e => scope.includes(e.module)) } };
    config = { ...config, sources: { ...config.sources, engineering: config.sources?.engineering?.filter(e => !e.modules?.length || e.modules.some(id => scope.includes(id))) } };
  }
  const selected = [];
  const selectedPaths = new Set();
  const omitted = [];
  if (scope) for (const id of allManifest.modules.filter(id => !scope.includes(id))) omitted.push({ path: 'docs/modules/' + id + '.md', role: 'module-document', reason: 'Outside selected dependency closure.' });
  const add = (rawPath, role, required = true) => {
    let normalized;
    try { normalized = normalizeRelative(rawPath); }
    catch (error) {
      if (required) throw error;
      omitted.push({ path: String(rawPath), role, reason: error.message });
      return;
    }
    const violation = sourceFreePathViolation(normalized);
    if (violation) {
      if (required) throw new Error('Required delivery path is not source-free: ' + violation);
      omitted.push({ path: normalized, role, reason: violation });
      return;
    }
    if (!selectedPaths.has(normalized)) {
      selectedPaths.add(normalized);
      selected.push({ path: normalized, role });
    }
  };

  add('docs/manifest.yaml', 'knowledge-metadata');
  for (const document of manifest.documents.filter(file => file !== 'agent-context.md')) add(documentPath(document), 'knowledge-document');
  for (const moduleId of manifest.modules) {
    if (typeof moduleId !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(moduleId)) {
      throw new Error('Invalid module ID in knowledge manifest: ' + String(moduleId));
    }
    add('docs/modules/' + moduleId + '.md', 'module-document');
  }
  for (const registered of registeredEngineeringPaths(manifest)) {
    add(registered, 'engineering-detail');
  }
  if (mode === 'reconstruction') {
    for (const owner of sourceOwners(config)) add(owner.path, owner.role, false);
  }
  return { mode, scope, selected, omitted };
}

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function gitRevision(projectRoot) {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: projectRoot, encoding: 'utf8', windowsHide: true
  });
  return result.status === 0 ? (result.stdout || '').trim() || null : null;
}

function referenceClassification(reference, resolved, projectRoot, selectedPaths) {
  if (selectedPaths.has(resolved)) return null;
  const violation = sourceFreePathViolation(resolved);
  if (violation && /source-code|control-plane|runtime\/build|undocumented binary/i.test(violation)) {
    return {
      classification: 'provenance-only',
      reason: violation,
      exists: fs.existsSync(path.resolve(projectRoot, ...resolved.split('/')))
    };
  }
  const absolute = path.resolve(projectRoot, ...resolved.split('/'));
  const exists = pathInside(projectRoot, absolute) && fs.existsSync(absolute);
  if (!exists) return { classification: 'missing-relative', exists: false };
  if (resolved === 'docs' || resolved.startsWith('docs/')) {
    return { classification: 'omitted-document', exists: true };
  }
  return { classification: 'omitted-file', exists: true };
}

function relativeReferences(file, contents, selectedPaths, projectRoot) {
  const unresolved = [];
  for (const match of contents.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    let reference = match[1].trim().split('#', 1)[0].trim();
    if (!reference) continue;
    try { reference = decodeURIComponent(reference).replaceAll('\\', '/'); }
    catch {
      unresolved.push({ from: file, reference, resolved: null, reason: 'invalid URL encoding' });
      continue;
    }
    // Only resolve local project-relative targets. URI schemes (including
    // data:, ftp:, tel: and custom editor links) are external by definition
    // and are recorded for the delivery audit instead of treated as missing.
    const windowsAbsolute = /^[a-z]:[\\/]/i.test(reference);
    if (reference.startsWith('#')) continue;
    if (!windowsAbsolute && /^[a-z][a-z0-9+.-]*:/i.test(reference)) {
      unresolved.push({ from: file, reference, resolved: null, classification: 'external-reference', exists: null });
      continue;
    }
    const target = reference.split(/[?#]/, 1)[0].trim();
    if (!target) continue;
    let resolved;
    try { resolved = normalizeRelative(path.posix.normalize(path.posix.join(path.posix.dirname(file), target))); }
    catch { resolved = target; }
    const classification = referenceClassification(target, resolved, projectRoot, selectedPaths);
    if (classification) unresolved.push({ from: file, reference, resolved, ...classification });
  }
  return unresolved;
}

export function exportKnowledgeDelivery({ projectRoot: projectInput, outputRoot: outputInput, manifest, config = {}, mode = 'query', dryRun = false, modules = null }) {
  const projectRoot = fs.realpathSync(path.resolve(projectInput || '.'));
  const outputRoot = path.resolve(outputInput || '');
  if (!outputInput) throw new Error('--output is required.');
  const existingOutputParent = fs.realpathSync(nearestExistingParent(outputRoot));
  if (pathInside(projectRoot, outputRoot) || pathInside(projectRoot, existingOutputParent)) {
    throw new Error('Delivery output must be outside the source project.');
  }
  if (fs.existsSync(outputRoot)) throw new Error('Delivery output already exists; choose a new directory.');
  const selection = selectKnowledgeFiles({ manifest, config, mode, modules });
  const files = [];
  const payloads = [];
  const unresolvedReferences = [];
  for (const item of selection.selected) {
    assertNoSymlinkPath(projectRoot, item.path);
    const source = path.resolve(projectRoot, ...item.path.split('/'));
    if (!pathInside(projectRoot, source) || !fs.existsSync(source) || !fs.statSync(source).isFile()) {
      throw new Error('Selected delivery file is missing: ' + item.path);
    }
    if (fs.lstatSync(source).isSymbolicLink()) throw new Error('Selected delivery file cannot be a symbolic link: ' + item.path);
    const destination = path.resolve(outputRoot, ...item.path.split('/'));
    if (!pathInside(outputRoot, destination)) throw new Error('Delivery destination escaped output: ' + item.path);
    const bytes = fs.readFileSync(source);
    const sensitive = sensitiveContentViolation(item.path, bytes);
    if (sensitive) throw new Error(sensitive);
    const entry = { path: item.path, role: item.role, bytes: bytes.length, sha256: hashFile(source) };
    files.push(entry);
    payloads.push({ destination, bytes });
    if (/\.md$/i.test(item.path)) {
      unresolvedReferences.push(...relativeReferences(item.path, bytes.toString('utf8'), new Set(selection.selected.map(file => file.path)), projectRoot));
    }
  }
  const missingReferences = unresolvedReferences.filter(reference => reference.classification === 'missing-relative');
  if (missingReferences.length) {
    throw new Error('Knowledge delivery contains missing relative references: ' +
      missingReferences.map(reference => reference.from + ' -> ' + reference.reference).join(', '));
  }
  const delivery = {
    schema_version: '1.0',
    selected_modules: selection.scope,
    structure: 'accord-knowledge-delivery',
    mode,
    source_free: true,
    source_content_included: false,
    source_project: {
      id: config.project?.id || null,
      name: config.project?.name || null,
      observed_revision: manifest.observed_revision || gitRevision(projectRoot),
      manifest_status: manifest.status || 'unknown'
    },
    files,
    omitted: selection.omitted,
    unresolved_references: unresolvedReferences,
    limitations: [
      'This package selects project documents and text-only registered inputs; their declared review/gap states remain unchanged. It contains no source or Git history.',
      'Source-free question answering or reconstruction still requires an independent Agent run and V&V review.'
    ]
  };
  if (!dryRun) {
    fs.mkdirSync(outputRoot, { recursive: true });
    for (const payload of payloads) {
      fs.mkdirSync(path.dirname(payload.destination), { recursive: true });
      fs.writeFileSync(payload.destination, payload.bytes, { flag: 'wx' });
    }
    fs.writeFileSync(path.join(outputRoot, 'delivery.json'), JSON.stringify(delivery, null, 2) + '\n', { flag: 'wx' });
  }
  return { outputRoot, delivery };
}

function deliveryFiles(root, relative = '') {
  const directory = path.join(root, relative);
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const childRelative = relative ? relative + '/' + entry.name : entry.name;
    const child = path.join(root, ...childRelative.split('/'));
    if (entry.isSymbolicLink()) throw new Error('Delivery cannot contain symbolic links: ' + childRelative);
    if (entry.isDirectory()) files.push(...deliveryFiles(root, childRelative));
    else if (entry.isFile()) files.push(childRelative);
    else throw new Error('Delivery contains an unsupported filesystem entry: ' + childRelative);
  }
  return files.sort();
}

export function verifyKnowledgeDelivery(input) {
  const root = fs.realpathSync(path.resolve(input || ''));
  const receiptPath = path.join(root, 'delivery.json');
  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  if (receipt.schema_version !== '1.0' || receipt.structure !== 'accord-knowledge-delivery' ||
      receipt.source_free !== true || receipt.source_content_included !== false || !Array.isArray(receipt.files)) {
    throw new Error('Delivery receipt has an invalid source-free structure.');
  }
  const listed = new Map();
  for (const entry of receipt.files) {
    const violation = sourceFreePathViolation(entry?.path);
    if (violation) throw new Error('Delivery receipt contains an unsafe file: ' + violation);
    const relative = normalizeRelative(entry.path);
    if (relative === 'delivery.json' || listed.has(relative) || !Number.isInteger(entry.bytes) ||
        !/^[a-f0-9]{64}$/i.test(entry.sha256 || '')) {
      throw new Error('Delivery receipt contains a duplicate or malformed file entry: ' + relative);
    }
    const file = path.resolve(root, ...relative.split('/'));
    if (!pathInside(root, file) || !fs.existsSync(file) || !fs.statSync(file).isFile() || fs.lstatSync(file).isSymbolicLink()) {
      throw new Error('Delivery file is missing or unsafe: ' + relative);
    }
    const actualBytes = fs.statSync(file).size;
    const sensitive = sensitiveContentViolation(relative, fs.readFileSync(file));
    if (sensitive) throw new Error(sensitive);
    const actualSha = hashFile(file);
    if (actualBytes !== entry.bytes || actualSha !== entry.sha256) {
      throw new Error('Delivery file integrity mismatch: ' + relative);
    }
    listed.set(relative, entry);
  }
  const actual = new Set(deliveryFiles(root));
  actual.delete('delivery.json');
  const expected = new Set(listed.keys());
  const unexpected = [...actual].filter(file => !expected.has(file));
  const missing = [...expected].filter(file => !actual.has(file));
  if (unexpected.length || missing.length) {
    throw new Error('Delivery file set mismatch: unexpected=' + unexpected.join(',') + '; missing=' + missing.join(','));
  }
  return { root, files: listed.size, receipt };
}

function parseArgs(argv) {
  const values = { project: '.', mode: null, output: null, dryRun: false, verify: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--project' || arg === '--mode' || arg === '--output' || arg === '--verify' || arg === '--modules') {
      const value = argv[++index];
      if (!value) return { error: arg + ' requires a value.' };
      if (arg === '--project') values.project = value;
      else if (arg === '--mode') values.mode = value;
      else if (arg === '--modules') values.modules = value.split(',');
      else if (arg === '--output') values.output = value;
      else values.verify = value;
    } else if (arg === '--dry-run') values.dryRun = true;
    else return { error: 'Unknown argument: ' + arg };
  }
  if (values.verify) {
    if (values.mode || values.output || values.dryRun || values.project !== '.') {
      return { error: '--verify cannot be combined with project, mode, output or dry-run options.' };
    }
    return values;
  }
  if (!values.mode || !MODES.has(values.mode)) return { error: '--mode must be query or reconstruction.' };
  if (!values.output) return { error: '--output is required.' };
  return values;
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help) {
    console.log('Usage: node accord-knowledge-export.mjs --project <path> --mode <query|reconstruction> --output <directory> [--modules <id,id>] [--dry-run]');
    console.log('  Create a bounded source-free knowledge delivery set outside the project.');
    console.log('Usage: node accord-knowledge-export.mjs --verify <delivery-directory>');
    console.log('  Verify the delivery receipt, hashes, file set and source-free paths.');
    return;
  }
  if (parsed.error) {
    console.error('Argument error: ' + parsed.error);
    process.exitCode = 2;
    return;
  }
  try {
    if (parsed.verify) {
      const result = verifyKnowledgeDelivery(parsed.verify);
      console.log(JSON.stringify({ verified: true, output: result.root, files: result.files }, null, 2));
      return;
    }
    const projectRoot = path.resolve(parsed.project);
    const manifestPath = path.join(projectRoot, 'docs', 'manifest.yaml');
    const configPath = path.join(projectRoot, '.accord', 'accord.yaml');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
    const result = exportKnowledgeDelivery({ projectRoot, outputRoot: parsed.output, manifest, config, mode: parsed.mode, dryRun: parsed.dryRun, modules: parsed.modules });
    console.log(JSON.stringify({ output: result.outputRoot, mode: result.delivery.mode, files: result.delivery.files.length, omitted: result.delivery.omitted.length, unresolved_references: result.delivery.unresolved_references.length, dry_run: parsed.dryRun }, null, 2));
  } catch (error) {
    console.error('Knowledge export failed: ' + error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
