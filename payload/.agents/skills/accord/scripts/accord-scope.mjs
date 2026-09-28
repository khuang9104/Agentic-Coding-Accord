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

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const usage = 'accord-scope.mjs --project DIR --paths PATH,PATH [--revision FULL_SHA]';
  try {
    if (process.argv.includes('--help')) { console.log(usage); process.exit(0); }
    const args = {};
    for (let i = 2; i < process.argv.length; i += 2) {
      if (!['--project', '--paths', '--revision'].includes(process.argv[i]) || !process.argv[i + 1] || process.argv[i + 1].startsWith('--') || Object.hasOwn(args, process.argv[i].slice(2))) throw new Error(usage);
      args[process.argv[i].slice(2)] = process.argv[i + 1];
    }
    console.log(JSON.stringify(captureObservation(args.project || '.', args.paths?.split(','), { revision: args.revision || null }), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
