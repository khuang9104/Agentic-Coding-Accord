#!/usr/bin/env node
// Small adapters over project runners. Planning/validation never execute commands.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { digest, readBytes, readJson, gitRead, relativePath, strings, object, ID, SHA, owns, moduleClosure, loadProjectModel } from './accord-project.mjs';

const text = x => typeof x === 'string' && Boolean(x.trim());
const list = (x, max = 256) => strings(x) && x.length <= max;
const purposes = new Set(['verification', 'validation']);
const results = new Set(['passed', 'failed', 'unavailable', 'not-run']);
const safe = p => { relativePath(p); if (p.split('/').some(s => s.toLowerCase() === '.git')) throw new Error('Git internals are not V&V inputs.'); return p; };
const ordered = value => Array.isArray(value) ? value.map(ordered) : object(value)
  ? Object.fromEntries(Object.keys(value).sort().map(k => [k, ordered(value[k])])) : value;
const hash = value => digest(JSON.stringify(ordered(value)));

export function validateVvPolicy(vv) {
  const errors = [];
  if (!object(vv) || vv.schema_version !== '1.0' ||
      !Array.isArray(vv.checks) || vv.checks.length > 256 || !Array.isArray(vv.layout_exceptions) || vv.layout_exceptions.length > 64) return ['V&V needs policy schema 1.0, test_root, layout_exceptions and checks.'];
  try { safe(vv.test_root); if (/^(?:\.accord|\.agents|vendor)(?:\/|$)/.test(vv.test_root)) throw new Error(); }
  catch { errors.push('test_root must be a contained project test directory.'); }
  for (const e of vv.layout_exceptions) {
    try { safe(e.path); if (!text(e.reason)) throw new Error(); }
    catch { errors.push('Test layout exceptions require an exact path and technical reason.'); }
  }
  const ids = new Set();
  for (const c of vv.checks) {
    if (!object(c) || !ID.test(c.id || '') || ids.has(c.id) || !list(c.modules) || !list(c.purposes, 2) ||
        !c.purposes.length || c.purposes.some(p => !purposes.has(p)) || !list(c.inputs) || !c.inputs.length ||
        !list(c.assets) || !list(c.environment_keys, 64) || c.environment_keys.some(k => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) ||
        !Array.isArray(c.command) || !c.command.length || c.command.length > 128 || c.command.some(a => !text(a) || a.includes('\0')) ||
        !['node-test', 'exit-code'].includes(c.adapter) || (c.adapter === 'exit-code' && c.method !== 'analysis') ||
        !Number.isInteger(c.timeout_ms) || c.timeout_ms < 1 || c.timeout_ms > 60000) { errors.push('Invalid check registration: ' + c?.id); continue; }
    ids.add(c.id);
    if (c.adapter === 'node-test' && (c.command[0] !== 'node' || c.command[1] !== '--test' || c.command.some(a => a.startsWith('--test-reporter')) || !c.assets.some(a => c.command.slice(2).includes(a)))) errors.push('node-test uses [node, --test, registered-file, ...] without reporter overrides: ' + c.id);
    for (const p of [...c.inputs, ...c.assets]) {
      try { safe(p); if (owns(vv.test_root + '/.artifacts', p)) throw new Error(); }
      catch { errors.push('Invalid test input/asset: ' + p); }
    }
    for (const a of c.assets) {
      if (!owns(vv.test_root, a) && !vv.layout_exceptions.some(e => e?.path === a && text(e.reason))) errors.push('Test asset outside test_root without exact exception: ' + a);
      if (!c.inputs.some(p => owns(p, a))) errors.push('Test assets must be observed inputs: ' + a);
    }
  }
  return errors;
}

// Includes untracked files and missing literals. No glob expansion or source content in receipt.
export function observeInputs(root, inputs, vv) {
  if (!list(inputs) || !inputs.length) throw new Error('Evidence needs 1–256 input paths.');
  inputs.forEach(safe);
  const artifactRoot = vv.test_root + '/.artifacts';
  const names = new Set(gitRead(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', ...inputs]).split('\0').filter(Boolean));
  for (const p of inputs) if (fs.existsSync(path.join(root, p)) && fs.lstatSync(path.join(root, p)).isFile()) names.add(p);
  if (names.size > 10000) throw new Error('V&V input file budget exceeded.');
  let total = 0;
  const files = [...names].sort().filter(p => !owns(artifactRoot, p)).map(p => {
    safe(p);
    if (!fs.existsSync(path.join(root, p))) return [p, 'missing'];
    const b = readBytes(root, p, 16 * 1024 * 1024); total += b.length;
    if (total > 128 * 1024 * 1024) throw new Error('V&V input byte budget exceeded.');
    return [p, digest(b)];
  });
  return { base_revision: gitRead(root, ['rev-parse', 'HEAD']).trim(), digest: hash({ inputs: [...inputs].sort(), files }), file_count: files.length };
}

export function observeEnvironment(keys = []) {
  if (!list(keys, 64) || keys.some(k => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(k))) throw new Error('Invalid environment key list.');
  const facts = { node: process.version, executable: process.execPath, platform: process.platform, arch: process.arch, os_release: os.release(),
    launch_environment: hash(Object.fromEntries(['PATH', 'NODE_OPTIONS', 'NODE_PATH'].map(k => [k, process.env[k] ?? null]))) };
  return { facts, keys, digest: hash({ facts, values: Object.fromEntries(keys.map(k => [k, process.env[k] ?? null])) }) };
}

export function changedPaths(root, base) {
  if (!SHA.test(base || '')) throw new Error('Selection needs a full base revision.');
  gitRead(root, ['cat-file', '-e', base + '^{commit}']);
  // No rename folding: both old and new ownership must be examined.
  return [...new Set((gitRead(root, ['diff', '--no-renames', '--name-only', '-z', base, '--']) +
    gitRead(root, ['ls-files', '--others', '--exclude-standard', '-z'])).split('\0').filter(Boolean))].sort().map(safe);
}

export function planTests(root, base, { config = readJson(root, '.accord/accord.yaml'), model, modules = [] } = {}) {
  const vv = config.vv, errors = validateVvPolicy(vv);
  if (errors.length) throw new Error(errors.join('\n'));
  model ||= loadProjectModel(root, config);
  if (!list(modules) || modules.some(id => !model.modules.some(m => m.id === id))) throw new Error('Unknown work modules.');
  for (const c of vv.checks) if (c.modules.some(id => !model.modules.some(m => m.id === id))) throw new Error('Unknown check module: ' + c.id);
  // Work carriers hold this review; hashing them would make saving it invalidate itself.
  const paths = changedPaths(root, base).filter(p => !owns(vv.test_root + '/.artifacts', p) && !owns(config.work?.local_directory || '.accord/work', p));
  // A work module is a context boundary, not proof that its runtime changed.
  // With no diff, explicit modules still support a requested test-only task.
  const inferred = new Set(paths.length ? [] : modules), unknown = [];
  for (const p of paths) {
    const owners = model.modules.filter(m => m.source_paths.some(s => owns(s, p)));
    if (owners.length) owners.forEach(m => inferred.add(m.id));
    // Registered prose owners can use document review without forcing runtime suites.
    // Explicit check inputs still select checks for generated/executable documentation.
    else if (!vv.checks.some(c => c.inputs.some(s => owns(s, p))) && !model.documents?.some(d => d.path === p)) unknown.push(p);
  }
  const affected = inferred.size ? moduleClosure(model, [...inferred], true).affected : [];
  const selected = vv.checks.filter(c => unknown.length || c.modules.some(id => affected.includes(id)) || paths.some(p => c.inputs.some(s => owns(s, p))));
  const scope = { base_revision: base, requested_modules: modules, paths, affected, unknown, checks: selected.map(c => c.id) };
  const inputs = [...new Set([...paths, ...model.metadata_paths || [], '.accord/accord.yaml'])];
  const observation = observeInputs(root, inputs, vv);
  return { ...scope, scope_digest: hash({ scope, observation }), status: unknown.length ? 'expanded-needs-review' : 'selected',
    required_probes: ['actual-consumers', 'shared-data-and-config', 'dynamic-and-deployment-boundaries'],
    limitation: 'Candidate selection, not a proof of complete impact. Review probes and uncovered paths before delivery.' };
}

function checkInputs(c) { return [...new Set([...c.inputs, '.accord/accord.yaml'])]; }
function assertPolicy(config) { const errors = validateVvPolicy(config.vv); if (errors.length) throw new Error(errors.join('\n')); }

function nodeCounts(output, c, root) {
  const counts = Object.fromEntries(['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo'].map(k => {
    const hits = [...output.matchAll(new RegExp('^# ' + k + ' (\\d+)\\r?$', 'gm'))];
    return [k, hits.length === 1 ? Number(hits[0][1]) : null];
  }));
  // Node counts a file containing no test() calls as one successful file test.
  const assetNames = new Set(c.assets.flatMap(a => [a, path.resolve(root, a).replaceAll('\\', '/')]));
  counts.file_only = [...output.matchAll(/^# Subtest: (.+)\r?$/gm)].filter(m => assetNames.has(m[1].trim().replaceAll('\\\\', '/').replaceAll('\\', '/'))).length;
  return counts;
}

// Explicit execution only. Uses argv without a shell; the caller authorizes the registered command.
export function runCheck(root, id, { config = readJson(root, '.accord/accord.yaml') } = {}) {
  assertPolicy(config);
  const c = config.vv.checks.find(c => c.id === id);
  if (!c) throw new Error('Unknown check: ' + id);
  const inputs = checkInputs(c), before = observeInputs(root, inputs, config.vv), environment = observeEnvironment(c.environment_keys);
  const revision = gitRead(root, ['rev-parse', 'HEAD']).trim();
  const command = c.adapter === 'node-test' ? [process.execPath, '--test', '--test-reporter=tap', ...c.command.slice(2)] : c.command;
  const environmentVariables = { ...process.env };
  // A runner invoked from a Node test must launch a fresh test coordinator.
  delete environmentVariables.NODE_TEST_CONTEXT;
  const execution = spawnSync(command[0], command.slice(1), { cwd: root, env: environmentVariables, encoding: 'utf8', shell: false, windowsHide: true, timeout: c.timeout_ms, maxBuffer: 8 * 1024 * 1024 });
  const output = (execution.stdout || '') + (execution.stderr || '');
  let status = execution.error ? 'unavailable' : execution.status === 0 ? 'passed' : 'failed';
  let counts = null;
  if (c.adapter === 'node-test') {
    counts = nodeCounts(output, c, root);
    if (status === 'passed' && (counts.tests < 1 || counts.pass !== counts.tests || ['fail', 'cancelled', 'skipped', 'todo', 'file_only'].some(k => counts[k] !== 0))) status = 'failed';
  }
  const after = observeInputs(root, inputs, config.vv), afterEnvironment = observeEnvironment(c.environment_keys);
  if (before.digest !== after.digest || environment.digest !== afterEnvironment.digest) status = 'failed';
  const evidence = { schema_version: '1.0', id: id.slice(0, 64) + '-' + randomUUID(), check: id, method: c.adapter === 'node-test' ? 'test' : 'analysis',
    result: status, revision, inputs, observation: before, after_observation: after, environment,
    after_environment: afterEnvironment, command: c.command, adapter: c.adapter, check_digest: hash(c),
    exit_code: execution.status, counts, log_sha256: digest(output), issue: execution.error?.code || null };
  return { evidence, output };
}

function validateEvidence(root, e, vv) {
  const errors = [];
  if (!object(e) || e.schema_version !== '1.0' || !ID.test(e.id || '') || !results.has(e.result) || !SHA.test(e.revision || '') || !text(e.source)) return ['Invalid evidence identity, result, revision or source.'];
  try {
    gitRead(root, ['cat-file', '-e', e.revision + '^{commit}']);
    if (e.result !== 'passed') errors.push('Evidence has not passed: ' + e.id);
    if (e.observation?.base_revision !== e.revision) errors.push('Evidence revision differs from its observed revision: ' + e.id);
    if (observeInputs(root, e.inputs, vv).digest !== e.observation?.digest || e.observation.digest !== e.after_observation?.digest) errors.push('Evidence inputs missing/stale/changed during execution: ' + e.id);
    if (observeEnvironment(e.environment?.keys).digest !== e.environment?.digest || e.environment.digest !== e.after_environment?.digest) errors.push('Evidence environment missing/stale: ' + e.id);
    if (e.check) {
      const c = vv.checks.find(c => c.id === e.check);
      if (!c || e.check_digest !== hash(c) || hash(e.command) !== hash(c.command) || e.adapter !== c.adapter ||
          hash([...e.inputs].sort()) !== hash(checkInputs(c).sort()) || hash(e.environment.keys) !== hash(c.environment_keys)) errors.push('Evidence does not match registered check: ' + e.id);
      if (e.exit_code !== 0) errors.push('Check did not exit successfully: ' + e.id);
      if (c?.adapter === 'node-test' && (!e.counts || !(e.counts.tests > 0) || e.counts.pass !== e.counts.tests || ['fail', 'cancelled', 'skipped', 'todo', 'file_only'].some(k => e.counts[k] !== 0))) errors.push('Required tests missing, failed or skipped: ' + e.id);
      const log = readBytes(root, e.source, 8 * 1024 * 1024);
      if (digest(log) !== e.log_sha256) errors.push('Missing or changed execution log: ' + e.id);
      if (c?.adapter === 'node-test' && hash(nodeCounts(log.toString('utf8'), c, root)) !== hash(e.counts)) errors.push('Reported counts differ from the actual execution log: ' + e.id);
    } else if (!['review', 'demonstration'].includes(e.method) || !text(e.expected) || !text(e.actual) || !text(e.basis)) errors.push('Manual evidence needs method, expected/actual observations and basis.');
  } catch (err) { errors.push(err.message); }
  return errors;
}

export function validateObligations(root, work, { config = readJson(root, '.accord/accord.yaml'), model } = {}) {
  const errors = validateVvPolicy(config.vv);
  if (errors.length) return { errors };
  if (!Array.isArray(work.obligations) || !work.obligations.length || work.obligations.length > 256 || !Array.isArray(work.evidence) || work.evidence.length > 256) return { errors: ['Delivery needs bounded obligations and evidence arrays.'] };
  let plan;
  try { plan = planTests(root, work.baseline?.base_revision, { config, model, modules: work.modules }); }
  catch (e) { return { errors: [e.message] }; }
  const review = work.scope_review;
  if (!object(review) || review.scope_digest !== plan.scope_digest || !text(review.basis) || !text(review.source) || !list(review.resolved_probes) || plan.required_probes.some(p => !review.resolved_probes.includes(p))) errors.push('Delivery requires current scope review including independent boundary probes.');
  const seen = new Set(), evidence = new Map(), referenced = new Set();
  for (const e of work.evidence) {
    if (!object(e) || !ID.test(e.id || '') || evidence.has(e.id)) errors.push('Invalid/duplicate evidence ID.');
    else evidence.set(e.id, e);
  }
  for (const o of work.obligations) {
    if (!object(o) || !ID.test(o.id || '') || seen.has(o.id) || !purposes.has(o.purpose) || !text(o.target) || !text(o.expected) ||
        !['executed', 'reused', 'no-new-obligation', 'unmet'].includes(o.disposition) || !list(o.evidence)) { errors.push('Invalid/duplicate evidence obligation.'); continue; }
    seen.add(o.id);
    if (o.disposition === 'no-new-obligation') {
      if (o.evidence.length || !text(o.basis) || !text(o.baseline_source) || plan.checks.some(id => config.vv.checks.find(c => c.id === id).purposes.includes(o.purpose))) errors.push('No-new-obligation conflicts with selected checks or lacks baseline/impact basis: ' + o.id);
      continue;
    }
    if (o.disposition === 'unmet' || !o.evidence.length) errors.push('Unmet obligation: ' + o.id);
    for (const id of o.evidence) {
      const e = evidence.get(id);
      if (!e) { errors.push('Missing evidence reference: ' + id); continue; }
      if (e.check && !config.vv.checks.find(c => c.id === e.check)?.purposes.includes(o.purpose)) errors.push('Check cannot support this declared purpose: ' + o.id);
      if (!referenced.has(id)) errors.push(...validateEvidence(root, e, config.vv));
      referenced.add(id);
    }
  }
  if (['L2', 'L3', 'L4'].includes(work.risk)) for (const p of purposes) if (!work.obligations.some(o => o?.purpose === p)) errors.push('Material work must account for both verification and validation obligations.');
  for (const id of work.requirements) if (!work.obligations.some(o => o?.target === id)) errors.push('Unaccounted requirement: ' + id);
  for (const id of plan.checks) if (![...referenced].some(key => evidence.get(key)?.check === id)) errors.push('Selected check lacks evidence: ' + id);
  return { errors, plan, notChecked: ['semantic-impact', 'test-sufficiency', 'human-acceptance', 'external-environment-equivalence'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = {};
    if (process.argv.includes('--help')) { console.log('accord-vv.mjs --project DIR --base FULL_SHA | --run CHECK_ID (explicit execution; prints evidence, stores log)'); process.exit(0); }
    for (let i = 2; i < process.argv.length; i += 2) {
      const key = process.argv[i];
      if (!['--project', '--base', '--run'].includes(key) || !process.argv[i + 1] || args[key]) throw new Error('Invalid arguments.');
      args[key] = process.argv[i + 1];
    }
    const root = path.resolve(args['--project'] || '.');
    if (Boolean(args['--run']) === Boolean(args['--base'])) throw new Error('Choose planning --base OR explicit --run.');
    if (args['--base']) console.log(JSON.stringify(planTests(root, args['--base']), null, 2));
    else {
      const config = readJson(root, '.accord/accord.yaml');
      const { evidence, output } = runCheck(root, args['--run'], { config });
      const relative = config.vv.test_root + '/.artifacts/' + evidence.id + '.log';
      let dir = root;
      for (const part of relative.split('/').slice(0, -1)) {
        dir = path.join(dir, part);
        if (fs.existsSync(dir) && fs.lstatSync(dir).isSymbolicLink()) throw new Error('Artifact directory is a link.');
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(path.join(root, relative), output, { flag: 'wx' });
      evidence.source = relative;
      console.log(JSON.stringify(evidence, null, 2));
      if (evidence.result !== 'passed') process.exitCode = 1;
    }
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
