// Declarative, project-reviewed method bindings. Reads only; never imports or
// executes a method, probes a tool, installs dependencies or contacts a source.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseExactJson } from './accord-contracts.mjs';

export const CAPABILITY_POLICY = Object.freeze({
  discovery: 'need-driven-user-choice', installation: 'explicit-human-approval',
  dependency_installation: 'separate-explicit-human-approval', updates: 'explicit-human-approval',
  removal: 'explicit-human-approval', unmanaged_use: 'allowed-record-material-use', unmanaged_lifecycle: 'user-controlled'
});
const REGISTRY = '.accord/capabilities/registry.yaml';
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HASH = /^[a-f0-9]{64}$/;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 2000;
const strings = (value, min = 0) => Array.isArray(value) && value.length >= min && value.length <= 64 &&
  value.every(text) && new Set(value).size === value.length;
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
function keys(value, allowed, label) {
  if (!object(value)) throw new Error(label + ' must be an object.');
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error('Unknown method field ' + label + '.' + key);
}
function relative(file) {
  if (typeof file !== 'string' || !file || file.length > 1000 || path.posix.normalize(file) !== file ||
      path.posix.isAbsolute(file) || file === '.' || file === '..' || file.startsWith('../') || /[\\:\x00-\x1f]/.test(file) ||
      file.split('/').some(part => /[. ]$/.test(part) || ['.git', '.codex'].includes(part.toLowerCase()) ||
        /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) throw new Error('Unsafe method path: ' + String(file));
  return file;
}
function contained(root, file) {
  relative(file);
  let current = fs.realpathSync(root);
  for (const part of file.split('/')) {
    current = path.join(current, part);
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink() || (stat.isFile() && stat.nlink > 1)) throw new Error('Method path aliases require review: ' + file);
  }
  const stat = fs.statSync(current);
  if (!stat.isFile()) throw new Error('Method path is not a regular file: ' + file);
  return { file: current, stat };
}
function readText(root, file, limit = 1024 * 1024) {
  const target = contained(root, file);
  if (target.stat.size > limit) throw new Error('Method file byte budget exceeded: ' + file);
  const bytes = fs.readFileSync(target.file);
  const value = bytes.toString('utf8');
  if (bytes.includes(0) || !Buffer.from(value, 'utf8').equals(bytes)) throw new Error('Method reference must be UTF-8 text: ' + file);
  return value.replace(/\r\n/g, '\n');
}
function fileRecord(value, label, prefix) {
  keys(value, ['path', 'sha256'], label);
  relative(value.path);
  if (!HASH.test(value.sha256 || '') || (prefix && !value.path.startsWith(prefix))) throw new Error('Invalid method path or hash: ' + label);
}
function validateEntry(entry, tasks, reserved) {
  keys(entry, ['id', 'status', 'tasks', 'source', 'instruction', 'review', 'applicability',
    'prerequisites', 'invocation', 'inputs', 'output_policy', 'permissions'], 'entry');
  if (!text(entry.id) || entry.id.length > 64 || !ID.test(entry.id) || reserved.includes(entry.id) || entry.id === 'accord') {
    throw new Error('Invalid or reserved method identity: ' + entry.id);
  }
  if (!['approved-enabled', 'disabled', 'retired'].includes(entry.status)) throw new Error('Invalid method status: ' + entry.id);
  if (!strings(entry.tasks, 1) || entry.tasks.some(task => !tasks.includes(task))) throw new Error('Method tasks must name standard task contracts: ' + entry.id);
  const base = '.accord/capabilities/methods/' + entry.id + '/';
  keys(entry.source, ['repository', 'ref', 'license', 'files'], 'source');
  if (!text(entry.source.repository) || !/^[a-f0-9]{40}$/.test(entry.source.ref || '') || !text(entry.source.license) ||
      !Array.isArray(entry.source.files) || !entry.source.files.length || entry.source.files.length > 32) throw new Error('Method needs pinned source, license and reviewed source files.');
  const seen = new Set();
  for (const file of entry.source.files) {
    fileRecord(file, 'source.files', base);
    if (seen.has(file.path.toLowerCase())) throw new Error('Duplicate method source file.');
    seen.add(file.path.toLowerCase());
  }
  fileRecord(entry.instruction, 'instruction', base);
  if (entry.instruction.path !== base + 'method.md') throw new Error('Method instruction must use its canonical methods/<id>/method.md path.');
  keys(entry.review, ['approved_at', 'approval_basis', 'evaluation'], 'review');
  if (typeof entry.review.approved_at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.review.approved_at) ||
      !Number.isFinite(Date.parse(entry.review.approved_at)) || new Date(entry.review.approved_at).toISOString().slice(0, 10) !== entry.review.approved_at ||
      !text(entry.review.approval_basis)) throw new Error('Method needs an inspectable approval basis and date.');
  relative(entry.review.approval_basis.split('#')[0]);
  fileRecord(entry.review.evaluation, 'review.evaluation');
  if (!strings(entry.inputs, 1) || entry.output_policy !== 'route-and-user-scope') throw new Error('Method inputs and output policy must preserve the task contract.');
  keys(entry.applicability, ['languages', 'platforms'], 'applicability');
  if (!strings(entry.applicability.languages, 1) || !strings(entry.applicability.platforms, 1) ||
      entry.applicability.platforms.some(platform => !['any', 'win32', 'linux', 'darwin'].includes(platform))) throw new Error('Method applicability needs explicit languages and supported platforms.');
  for (const values of Object.values(entry.applicability)) if (values.includes('any') && values.length !== 1) throw new Error('Method applicability cannot combine any with narrower values.');
  keys(entry.prerequisites, ['files', 'tools'], 'prerequisites');
  if (!strings(entry.prerequisites.files) || !strings(entry.prerequisites.tools)) throw new Error('Method prerequisites must be declarative file and tool lists.');
  entry.prerequisites.files.forEach(relative);
  if (!['task-match', 'ask-each-use'].includes(entry.invocation)) throw new Error('Invalid method invocation policy.');
  keys(entry.permissions, ['writes', 'network', 'dependencies', 'git'], 'permissions');
  if (entry.permissions.writes !== 'task-scope' || !['none', 'ask-each-use'].includes(entry.permissions.network) ||
      entry.permissions.dependencies !== 'explicit-human-approval' || entry.permissions.git !== 'explicit-human-approval') throw new Error('Method permissions cannot expand task, dependency or Git authority.');
  if (entry.permissions.network !== 'none' && entry.invocation !== 'ask-each-use') throw new Error('Networked methods require ask-each-use.');
}

export function validateMethodRegistry(registry, { tasks, reserved }) {
  const errors = [];
  if (!object(registry) || !['1.0', '1.1'].includes(registry.schema_version) || registry.registry !== 'accord-project-capabilities') return ['Invalid method registry identity or schema.'];
  for (const [key, value] of Object.entries(CAPABILITY_POLICY)) if (registry.policy?.[key] !== value) errors.push('Method registry policy.' + key + ' must preserve ' + value + '.');
  if (registry.schema_version === '1.0') {
    if (registry.methods !== undefined) errors.push('Project methods require registry schema 1.1; legacy registries must not silently enable bindings.');
    return errors;
  }
  if (!Array.isArray(registry.methods) || registry.methods.length > 64) return [...errors, 'Method registry needs a bounded methods array.'];
  const seen = new Set();
  for (const entry of registry.methods) {
    try {
      validateEntry(entry, tasks, reserved);
      if (seen.has(entry.id)) throw new Error('Duplicate registered method ID: ' + entry.id);
      seen.add(entry.id);
    } catch (error) { errors.push(error.message); }
  }
  return errors;
}

export function readMethodRegistry(root, context) {
  const registry = parseExactJson(readText(root, REGISTRY));
  const errors = validateMethodRegistry(registry, context);
  if (errors.length) throw new Error(errors.join('\n'));
  return registry;
}

export function inspectRegisteredMethod(root, entry, task, { checkEnvironment = true, view = 'execution' } = {}) {
  if (!entry || entry.status !== 'approved-enabled') throw new Error('Registered method is absent or not approved-enabled. No automatic fallback.');
  if (task && !entry.tasks.includes(task)) throw new Error('Registered method is not reviewed for task ' + task + '.');
  const references = [...entry.source.files, entry.instruction, entry.review.evaluation];
  const contents = new Map(); let total = 0;
  for (const reference of references) {
    const value = contents.get(reference.path) ?? readText(root, reference.path);
    if (digest(value) !== reference.sha256) throw new Error('Reviewed method digest drift: ' + reference.path);
    if (!contents.has(reference.path)) total += Buffer.byteLength(value);
    if (total > 2 * 1024 * 1024) throw new Error('Method aggregate byte budget exceeded.');
    contents.set(reference.path, value);
  }
  const instruction = contents.get(entry.instruction.path);
  if (!instruction.trim() || instruction.length > 32768) throw new Error('Method instruction is empty or exceeds its context budget.');
  contained(root, entry.review.approval_basis.split('#')[0]);
  if (checkEnvironment) {
    if (!entry.applicability.platforms.includes('any') && !entry.applicability.platforms.includes(process.platform)) throw new Error('Method unavailable on current platform: ' + process.platform);
    for (const file of entry.prerequisites.files) {
      try { contained(root, file); } catch (error) { throw new Error('Missing method prerequisite or unsafe file: ' + file + ': ' + error.message); }
    }
  }
  const requirements = { id: entry.id, invocation: entry.invocation,
    use_gate: entry.invocation === 'ask-each-use' ? 'human-decision-required' : 'approved-scope-only',
    preflight: { status: 'requires-agent-check', applicability: entry.applicability,
      tools: entry.prerequisites.tools, files: entry.prerequisites.files,
      limitation: 'File presence is not tool readiness. Confirm language, versions, services, targets, costs and authority for the actual task; no probes were executed.' },
    permissions: entry.permissions };
  const selected = view === 'audit' ? entry.source.files : [entry.instruction];
  if (view === 'audit' && selected.reduce((sum, item) => sum + Buffer.byteLength(contents.get(item.path)), 0) > 256 * 1024) throw new Error('Method audit output exceeds 256 KiB; inspect the registered source files individually.');
  return { requirements,
    files: selected.map(item => ({ path: item.path, content: contents.get(item.path), selection: view === 'audit' ? 'reviewed source; audit only' : 'project-reviewed adapter' })),
    trackedPaths: [...new Set([...references.map(item => item.path), entry.review.approval_basis.split('#')[0]])] };
}
