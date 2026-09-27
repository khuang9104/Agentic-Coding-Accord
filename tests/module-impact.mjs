#!/usr/bin/env node
// Deterministic impact/observation regressions; all fixtures live in OS temp.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtime = path.resolve(process.argv[2] || path.join(root, 'payload/.agents/skills/accord/scripts'));
const { selectChangeImpact, selectModuleScope, captureObservation, validateObservations } =
  await import(pathToFileURL(path.join(runtime, 'accord-scope.mjs')).href);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'accord-impact-'));
let passed = 0;
const check = (name, run) => { run(); passed++; console.log('PASS ' + name); };
const entry = (module, depends_on = []) => ({ module, depends_on, status: 'current',
  dependency_basis: 'Fixture relationships, not production evidence.', gaps: [] });
const graph = () => ({ schema_version: '1.4', modules: ['orders', 'payments', 'gateway', 'portal', 'unrelated'],
  scopes: [entry('orders', ['payments']), entry('payments', ['gateway']), entry('gateway'),
    entry('portal', ['orders']), entry('unrelated')] });
const write = (file, content) => {
  const absolute = path.join(temporary, file);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, typeof content === 'string' ? content : JSON.stringify(content));
};
const cli = (...args) => spawnSync(process.execPath, [path.join(runtime, 'accord-scope.mjs'), '--project', temporary, ...args], { encoding: 'utf8' });
const git = (...args) => {
  const result = spawnSync('git', args, { cwd: temporary, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr); return result.stdout.trim();
};
try {
  check('provider changes select direct and transitive consumers, not unrelated modules', () => {
    const result = selectChangeImpact(graph(), ['payments']);
    assert.deepEqual(result.direct_consumers, ['orders']);
    assert.deepEqual(result.candidate_modules, ['orders', 'payments', 'portal']);
    assert.deepEqual(result.context_modules, ['gateway', 'orders', 'payments', 'portal']);
    assert.equal(result.status, 'declared');
  });
  check('knowledge export dependency direction stays unchanged', () => {
    assert.deepEqual(selectModuleScope(graph(), ['payments']), ['gateway', 'payments']);
  });
  check('cycles terminate and fan-in is deduplicated', () => {
    const m = graph(); m.scopes[2].depends_on = ['payments']; m.scopes[3].depends_on.push('payments');
    assert.deepEqual(selectChangeImpact(m, ['payments', 'orders']).candidate_modules, ['gateway', 'orders', 'payments', 'portal']);
  });
  check('input order is immaterial and the manifest is not mutated', () => {
    const m = graph(), before = JSON.stringify(m);
    const a = selectChangeImpact(m, ['payments', 'orders']); assert.equal(JSON.stringify(m), before);
    m.scopes.reverse(); m.modules.reverse();
    assert.deepEqual(selectChangeImpact(m, ['orders', 'payments']), a);
  });
  check('missing mapping elsewhere cannot mean no consumer', () => {
    const m = graph(); m.scopes.pop();
    const result = selectChangeImpact(m, ['payments']);
    assert.equal(result.status, 'partial'); assert.equal(result.gaps[0].module, 'unrelated');
  });
  check('draft and external consumer gaps remain visible', () => {
    const m = graph(); m.scopes[0].status = 'draft'; m.scopes[1].gaps = ['External webhook consumers unknown.'];
    const result = selectChangeImpact(m, ['payments']);
    assert.equal(result.status, 'partial'); assert.equal(result.gaps.length, 2);
  });
  check('project inventory gaps are preserved even with current module mappings', () => {
    const m = graph(); m.known_gaps = ['Plugin inventory is incomplete.'];
    const result = selectChangeImpact(m, ['payments']);
    assert.equal(result.status, 'partial');
    assert.deepEqual(result.gaps, [{ module: null, reason: m.known_gaps[0] }]);
    m.known_gaps = 'invalid'; assert.throws(() => selectChangeImpact(m, ['payments']));
  });
  for (const [name, mutate] of [
    ['duplicate module', m => m.modules.push('orders')],
    ['duplicate mapping', m => m.scopes.push(m.scopes[0])],
    ['unknown dependency', m => m.scopes[0].depends_on.push('missing')],
    ['duplicate dependency', m => m.scopes[0].depends_on.push('payments')],
    ['invalid gaps', m => m.scopes[0].gaps = 'unknown'],
    ['legacy metadata', m => m.schema_version = '1.3'],
    ['empty dependency basis', m => m.scopes[0].dependency_basis = ''],
  ]) check('rejects ' + name, () => { const m = graph(); mutate(m); assert.throws(() => selectChangeImpact(m, ['payments'])); });
  check('unknown, duplicate and empty selectors are rejected', () => {
    for (const ids of [[], ['missing'], ['payments', 'payments']]) assert.throws(() => selectChangeImpact(graph(), ids));
  });
  check('bounded graph handles a long chain without recursive overflow', () => {
    const modules = Array.from({ length: 1000 }, (_, i) => 'm' + i);
    const m = { schema_version: '1.4', modules, scopes: modules.map((id, i) => entry(id, i ? [modules[i - 1]] : [])) };
    assert.equal(selectChangeImpact(m, ['m0']).candidate_modules.length, 1000);
    m.modules.push('overflow'); assert.throws(() => selectChangeImpact(m, ['m0']));
  });
  write('docs/manifest.yaml', graph());
  check('CLI reports declared candidates without writing documents', () => {
    const before = fs.readFileSync(path.join(temporary, 'docs/manifest.yaml'));
    for (let i = 0; i < 2; i++) {
      const result = cli('--impact-modules', 'payments', '--manifest', 'docs/manifest.yaml');
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(JSON.parse(result.stdout).candidate_modules, ['orders', 'payments', 'portal']);
    }
    assert.deepEqual(fs.readFileSync(path.join(temporary, 'docs/manifest.yaml')), before);
    assert.deepEqual(fs.readdirSync(path.join(temporary, 'docs')), ['manifest.yaml']);
  });
  check('CLI partial graph uses exit 2 rather than claiming complete', () => {
    const m = graph(); m.scopes.pop(); write('docs/manifest.yaml', m);
    assert.equal(cli('--impact-modules', 'payments', '--manifest', 'docs/manifest.yaml').status, 2);
  });
  check('CLI rejects mixed modes, duplicate flags and escaping paths', () => {
    for (const args of [
      ['--impact-modules', 'payments', '--manifest', '../outside.json'],
      ['--impact-modules', 'payments', '--manifest', 'docs/manifest.yaml', '--paths', 'src'],
      ['--impact-modules', 'payments', '--manifest', 'docs/manifest.yaml', '--revision', 'a'.repeat(40)],
      ['--paths', 'src', '--paths', 'docs'], ['--manifest', 'docs/manifest.yaml'], ['--paths', '--revision'],
    ]) assert.equal(cli(...args).status, 1);
  });
  check('CLI rejects malformed JSON', () => {
    write('docs/broken.json', '{'); assert.equal(cli('--impact-modules', 'payments', '--manifest', 'docs/broken.json').status, 1);
  });
  git('init'); git('config', 'user.name', 'Accord fixture'); git('config', 'user.email', 'fixture@example.invalid');
  git('config', 'core.autocrlf', 'false');
  write('src/a/value.txt', 'A\n'); write('src/b/value.txt', 'B\n'); write('shared/config.json', '{}\n');
  git('add', '.'); git('commit', '-m', 'fixture baseline');
  const base = git('rev-parse', 'HEAD');
  const paths = ['src/a', 'shared/config.json'];
  const observed = captureObservation(temporary, paths);
  const m = { schema_version: '1.4', modules: ['a', 'alias'], scopes: ['a', 'alias'].map(id => ({ ...entry(id),
    sources: paths, review_basis: 'Fixture only.', observed_at: '2026-09-20T00:00:00Z', observation: observed })) };
  check('worktree and matching committed observations agree', () => {
    assert.equal(captureObservation(temporary, paths, { revision: base }).digest, observed.digest);
    assert(validateObservations(temporary, m).results.every(r => r.fresh));
  });
  check('identical scope snapshots are read once per call, never cached across calls', () => {
    const original = fs.readFileSync;
    let reads = 0;
    fs.readFileSync = function(file, ...args) {
      if (typeof file === 'string' && path.resolve(file) === path.join(temporary, 'src/a/value.txt')) reads++;
      return original.call(this, file, ...args);
    };
    try {
      assert(validateObservations(temporary, m).results.every(r => r.fresh));
      assert.equal(reads, 1);
      write('src/a/value.txt', 'changed\n');
      assert(validateObservations(temporary, m).results.every(r => !r.fresh));
      assert.equal(reads, 2);
    } finally {
      fs.readFileSync = original;
      write('src/a/value.txt', 'A\n');
    }
  });
  check('unrelated commit does not invalidate observed content', () => {
    write('src/b/value.txt', 'B2\n'); git('add', 'src/b/value.txt'); git('commit', '-m', 'unrelated fixture');
    assert(validateObservations(temporary, m).results.every(r => r.fresh));
  });
  check('shared configuration invalidates all mapped consumers', () => {
    write('shared/config.json', '{"new":true}\n');
    assert(validateObservations(temporary, m).results.every(r => !r.fresh));
    write('shared/config.json', '{}\n');
    assert(validateObservations(temporary, m).results.every(r => r.fresh));
  });
  check('new, renamed and deleted files invalidate observations', () => {
    write('src/a/new.txt', 'new\n'); assert.notEqual(captureObservation(temporary, paths).digest, observed.digest);
    fs.unlinkSync(path.join(temporary, 'src/a/new.txt'));
    fs.renameSync(path.join(temporary, 'src/a/value.txt'), path.join(temporary, 'src/a/renamed.txt'));
    assert.notEqual(captureObservation(temporary, paths).digest, observed.digest);
    fs.unlinkSync(path.join(temporary, 'src/a/renamed.txt'));
    assert.notEqual(captureObservation(temporary, paths).digest, observed.digest);
    write('src/a/value.txt', 'A\n');
    assert.equal(captureObservation(temporary, paths).digest, observed.digest);
  });
  check('CLI observation mode remains compatible', () => {
    const result = cli('--paths', paths.join(',')); assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).digest, observed.digest);
  });
  console.log(JSON.stringify({ passed, boundary: 'Deterministic graph, CLI and observation tests; not semantic compatibility or Agent behavior proof.' }));
} finally {
  const absolute = fs.realpathSync(temporary);
  if (path.dirname(absolute) !== fs.realpathSync(os.tmpdir()) || !path.basename(absolute).startsWith('accord-impact-')) throw new Error('Unsafe fixture cleanup.');
  fs.rmSync(absolute, { recursive: true, force: true });
}
