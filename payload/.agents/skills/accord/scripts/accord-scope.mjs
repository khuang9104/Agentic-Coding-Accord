// Bounded observation and module dependency selection shared by validation/export.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const rev = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const relative = value => typeof value === 'string' && value.length <= 512 &&
  !/[\\:\0*?\[\]]/.test(value) && !path.posix.isAbsolute(value) && value !== '.' &&
  value.split('/').every(part => part && part !== '.' && part !== '..') &&
  !/^(?:\.git|\.accord|\.agents|vendor)(?:\/|$)/.test(value);

function git(root, args) {
  const result = spawnSync('git', ['--literal-pathspecs', ...args], { cwd: root, maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0 || result.error) throw new Error('Cannot inspect scope with Git: ' + args[0]);
  return result.stdout;
}
function noLinks(root, file) {
  let current = root;
  for (const part of file.split('/')) {
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error('Scope cannot traverse a symbolic link: ' + file);
  }
  return current;
}
function normalized(bytes) {
  const text = bytes.toString('utf8');
  return !bytes.includes(0) && Buffer.from(text).equals(bytes) ? text.replace(/\r\n/g, '\n') : bytes;
}

export function captureObservation(rootInput, paths, { revision = null } = {}) {
  const root = fs.realpathSync(rootInput);
  if (!Array.isArray(paths) || !paths.length || paths.length > 256 || new Set(paths).size !== paths.length || !paths.every(relative)) throw new Error('Observation requires 1–256 unique literal contained source paths.');
  if (revision !== null && !rev(revision)) throw new Error('Committed observation requires a full revision.');
  const base = revision || git(root, ['rev-parse', '--verify', 'HEAD']).toString().trim();
  if (!rev(base)) throw new Error('Observation requires an existing Git base.');
  git(root, ['cat-file', '-e', base + '^{commit}']);
  for (const file of paths) noLinks(root, file);
  let names = revision
    ? git(root, ['ls-tree', '-r', '--name-only', '-z', revision, '--', ...paths])
    : git(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', ...paths]);
  names = [...new Set(names.toString('utf8').split('\0').filter(Boolean))].sort();
  if (names.length > 10000) throw new Error('Observation file budget exceeded.');
  const files = [];
  let total = 0;
  for (const file of names) {
    if (!relative(file)) throw new Error('Unsupported observed path.');
    const absolute = noLinks(root, file);
    if (!revision && !fs.existsSync(absolute)) continue; // Deleted files disappear from the snapshot.
    if (!revision && (!fs.statSync(absolute).isFile() || fs.statSync(absolute).size > 16 * 1024 * 1024)) throw new Error('Observation file type/size budget exceeded: ' + file);
    const bytes = revision ? git(root, ['show', revision + ':' + file]) : fs.readFileSync(absolute);
    total += bytes.length;
    if (total > 128 * 1024 * 1024) throw new Error('Observation byte budget exceeded.');
    files.push([file, sha(normalized(bytes))]);
  }
  return { kind: revision ? 'commit' : 'worktree', base_revision: base,
    digest: sha(JSON.stringify({ paths: [...paths].sort(), files })), file_count: files.length };
}

export function selectModuleScope(manifest, requested) {
  if (!Array.isArray(requested) || !requested.length || new Set(requested).size !== requested.length) throw new Error('Select distinct module IDs.');
  const modules = new Set(manifest.modules || []);
  const selected = new Set();
  const entries = manifest.scopes;
  if (manifest.schema_version !== '1.4' || !Array.isArray(entries)) throw new Error('Scoped selection requires reviewed knowledge 1.4 dependency metadata; legacy global observations are not inferred.');
  const map = new Map();
  for (const entry of entries) {
    if (!entry || !modules.has(entry.module) || map.has(entry.module) || !Array.isArray(entry.depends_on) ||
        new Set(entry.depends_on).size !== entry.depends_on.length || entry.depends_on.some(id => !modules.has(id))) throw new Error('Invalid or duplicate module scope/dependency metadata.');
    map.set(entry.module, entry);
  }
  const visit = id => {
    if (!modules.has(id) || !map.has(id)) throw new Error('Missing reviewed scope mapping for module: ' + id);
    if (selected.has(id)) return;
    selected.add(id);
    for (const dependency of map.get(id).depends_on) visit(dependency);
  };
  requested.forEach(visit);
  return [...selected].sort();
}

export function validateObservations(root, manifest, selected = null) {
  const errors = [], warnings = [], results = [];
  if (manifest.schema_version !== '1.4') return { errors, warnings, results };
  if (!Array.isArray(manifest.scopes) || manifest.scopes.length > 1000) return { errors: ['Knowledge 1.4 requires a bounded scopes array.'], warnings, results };
  try { if (manifest.scopes.length) selectModuleScope(manifest, manifest.scopes.map(e => e?.module)); }
  catch (error) { errors.push(error.message); return { errors, warnings, results }; }
  for (const entry of manifest.scopes.filter(e => !selected || selected.includes(e.module))) {
    try {
      if (!['draft', 'current'].includes(entry.status) || !Array.isArray(entry.sources) || !entry.sources.length ||
          !Array.isArray(entry.gaps) || entry.gaps.some(gap => typeof gap !== 'string' || !gap.trim()) ||
          typeof entry.dependency_basis !== 'string' || !entry.dependency_basis.trim()) throw new Error('Scope requires status, sources, gaps and inspected dependency_basis.');
      // Source hashing never grants a review or a completeness claim.
      if (entry.status === 'draft') { warnings.push('Scope ' + entry.module + ' remains draft.'); continue; }
      const observation = entry.observation;
      if (!observation || !['commit', 'worktree'].includes(observation.kind) || !rev(observation.base_revision) ||
          !/^[a-f0-9]{64}$/.test(observation.digest || '') || typeof entry.review_basis !== 'string' || !entry.review_basis.trim() ||
          typeof entry.observed_at !== 'string' || Number.isNaN(Date.parse(entry.observed_at))) throw new Error('Current scope needs a human review basis, observation identity and time.');
      if (observation.kind === 'commit') {
        const committed = captureObservation(root, entry.sources, { revision: observation.base_revision });
        if (committed.digest !== observation.digest) throw new Error('Claimed commit does not match the reviewed scope content.');
      } else git(root, ['cat-file', '-e', observation.base_revision + '^{commit}']);
      const actual = captureObservation(root, entry.sources);
      const fresh = actual.digest === observation.digest;
      results.push({ module: entry.module, fresh, observation: observation.kind, gaps: entry.gaps });
      if (!fresh) warnings.push('Scope ' + entry.module + ' source/dependency content changed; refresh affected claims.');
    } catch (error) { errors.push('Scope ' + entry.module + ': ' + error.message); }
  }
  return { errors, warnings, results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = {};
    for (let i = 2; i < process.argv.length; i += 2) {
      if (!['--project', '--paths', '--revision'].includes(process.argv[i]) || !process.argv[i + 1]) throw new Error('Usage: accord-scope.mjs --project <root> --paths src/module,shared/schema.json [--revision <full-sha>]');
      args[process.argv[i].slice(2)] = process.argv[i + 1];
    }
    console.log(JSON.stringify(captureObservation(args.project || '.', args.paths?.split(','), { revision: args.revision || null }), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
