#!/usr/bin/env node
// Current graph and content-observation regression suite.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtime = path.resolve(process.argv[2] || path.join(root, 'payload/.agents/skills/accord/scripts'));
const { captureObservation } = await import(pathToFileURL(path.join(runtime, 'accord-scope.mjs')).href);
const { moduleClosure } = await import(pathToFileURL(path.join(runtime, 'accord-project.mjs')).href);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'accord-impact-'));
let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log('PASS ' + name); };
const entry = (id, depends_on = []) => ({ id, parent: null, depends_on });
const graph = () => ({ modules: [entry('orders', ['payments']), entry('payments', ['gateway']), entry('gateway'), entry('portal', ['orders']), entry('unrelated')] });
const write = (file, content) => { const p = path.join(temporary, file); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); };
const git = (...args) => { const r = spawnSync('git', args, { cwd: temporary, encoding: 'utf8', windowsHide: true }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
const cli = (...args) => spawnSync(process.execPath, [path.join(runtime, 'accord-scope.mjs'), '--project', temporary, ...args], { encoding: 'utf8' });
try {
  check('provider changes include transitive consumers and dependency context', () => {
    assert.deepEqual(moduleClosure(graph(), ['payments'], true), { affected: ['orders', 'payments', 'portal'], context: ['gateway', 'orders', 'payments', 'portal'] });
  });
  check('ordinary context does not silently expand to reverse consumers', () => {
    assert.deepEqual(moduleClosure(graph(), ['payments']).context, ['gateway', 'payments']);
  });
  check('cycles terminate without mutating the registry', () => {
    const m = graph(); m.modules[2].depends_on = ['orders']; const before = JSON.stringify(m);
    assert.equal(moduleClosure(m, ['payments'], true).context.length, 4); assert.equal(JSON.stringify(m), before);
  });
  check('unknown and duplicate module selections fail', () => {
    assert.throws(() => moduleClosure(graph(), ['missing'])); assert.throws(() => moduleClosure(graph(), ['orders', 'orders']));
  });
  check('long dependency chains traverse without recursive overflow', () => {
    const m = { modules: Array.from({ length: 600 }, (_, i) => entry('m' + i, i ? ['m' + (i - 1)] : [])) };
    assert.equal(moduleClosure(m, ['m0'], true).affected.length, 600);
  });
  git('init'); git('config', 'user.name', 'Accord fixture'); git('config', 'user.email', 'fixture@example.invalid'); git('config', 'core.autocrlf', 'false');
  write('src/a.txt', 'A\n'); write('other/b.txt', 'B\n'); git('add', '.'); git('commit', '-m', 'fixture'); const base = git('rev-parse', 'HEAD');
  const initial = captureObservation(temporary, ['src']);
  check('worktree and matching committed content have the same digest', () => {
    assert.equal(captureObservation(temporary, ['src'], { revision: base }).digest, initial.digest);
  });
  check('unrelated commits preserve relevant observations', () => {
    write('other/b.txt', 'changed\n'); git('add', '.'); git('commit', '-m', 'unrelated'); assert.equal(captureObservation(temporary, ['src']).digest, initial.digest);
  });
  check('new, renamed and deleted files invalidate current observations', () => {
    write('src/new.txt', 'new\n'); const added = captureObservation(temporary, ['src']).digest; assert.notEqual(added, initial.digest);
    fs.renameSync(path.join(temporary, 'src/new.txt'), path.join(temporary, 'src/renamed.txt')); const renamed = captureObservation(temporary, ['src']).digest; assert.notEqual(renamed, added);
    fs.unlinkSync(path.join(temporary, 'src/renamed.txt')); assert.equal(captureObservation(temporary, ['src']).digest, initial.digest);
  });
  check('CLI emits actual observations and rejects obsolete or escaping options', () => {
    const r = cli('--paths', 'src'); assert.equal(r.status, 0, r.stderr); assert.equal(JSON.parse(r.stdout).digest, initial.digest);
    assert.notEqual(cli('--impact-modules', 'orders').status, 0); assert.notEqual(cli('--paths', '../outside').status, 0); assert.notEqual(cli('--paths', 'src', '--paths', 'other').status, 0);
  });
  console.log(JSON.stringify({ passed, boundary: 'Current declared graph and observed inputs; not semantic compatibility proof.' }));
} finally {
  const resolved = fs.realpathSync(temporary);
  if (path.dirname(resolved) !== fs.realpathSync(os.tmpdir()) || !path.basename(resolved).startsWith('accord-impact-')) throw new Error('Unsafe cleanup path.');
  fs.rmSync(resolved, { recursive: true, force: true });
}
