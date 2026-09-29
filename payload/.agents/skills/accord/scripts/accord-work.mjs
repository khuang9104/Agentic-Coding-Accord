#!/usr/bin/env node
// Work is an adapter over local records or Issue/PR metadata, not a second task database.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { digest, readBytes, readJson, gitRead, relativePath, strings, SHA } from './accord-project.mjs';
import { githubApi } from './accord-governance.mjs';
import { validateObligations } from './accord-vv.mjs';
import { validateMethodUse } from './accord-protocol.mjs';

export function captureBaseline(root, inputPaths = []) {
  if (!strings(inputPaths)) throw new Error('Baseline input owners must be distinct literal paths.');
  return { base_revision: gitRead(root, ['rev-parse', '--verify', 'HEAD']).trim(),
    inputs: inputPaths.map(file => ({ path: file, sha256: digest(readBytes(root, file)) })) };
}
export function compareBaseline(root, baseline) {
  if (!baseline || !SHA.test(baseline.base_revision || '') || !Array.isArray(baseline.inputs) || baseline.inputs.length > 1000) throw new Error('Baseline needs a commit and bounded input versions.');
  gitRead(root, ['cat-file', '-e', baseline.base_revision + '^{commit}']);
  const seen = new Set();
  const changes = [];
  for (const input of baseline.inputs) {
    relativePath(input.path);
    if (seen.has(input.path) || !/^[a-f0-9]{64}$/.test(input.sha256 || '')) throw new Error('Invalid or duplicate baseline input.');
    seen.add(input.path);
    try { if (digest(readBytes(root, input.path)) !== input.sha256) changes.push({ path: input.path, reason: 'changed' }); }
    catch { changes.push({ path: input.path, reason: 'missing-or-unreadable' }); }
  }
  return { status: changes.length ? 'reconcile-inputs' : 'inputs-match', base_revision: baseline.base_revision,
    current_revision: gitRead(root, ['rev-parse', 'HEAD']).trim(), changes,
    limitation: 'Unrelated commits do not invalidate decisions. This does not verify implementation, integration tests, approval or deployment.' };
}

const nonempty = value => typeof value === 'string' && Boolean(value.trim());

export function validateWorkItem(root, work, { delivery = false, config, model } = {}) {
  const errors = [], warnings = [];
  if (!work || work.schema_version !== '1.1' || !/^[A-Za-z0-9][A-Za-z0-9._:#/-]{0,255}$/.test(work.id || '') ||
      !nonempty(work.title) || !['active', 'blocked', 'closed'].includes(work.state) || !strings(work.modules) ||
      !strings(work.requirements) || !['L0', 'L1', 'L2', 'L3', 'L4'].includes(work.risk)) return { errors: ['Invalid work item identity, state, scope or risk.'], warnings };
  let baseline;
  try { baseline = compareBaseline(root, work.baseline); if (baseline.changes.length) warnings.push('Relevant baseline inputs changed; reconcile authorized changes and external drift.'); }
  catch (e) { errors.push(e.message); }
  if (['L2', 'L3', 'L4'].includes(work.risk) && !nonempty(work.decision_basis)) errors.push('Material work requires an inspectable scoped human decision basis.');
  if (['L3', 'L4'].includes(work.risk)) {
    if (!SHA.test(work.checkpoint_revision || '')) errors.push('L3/L4 work requires a recoverable checkpoint.');
    else try { gitRead(root, ['cat-file', '-e', work.checkpoint_revision + '^{commit}']); } catch (e) { errors.push(e.message); }
  }
  if (work.risk === 'L4' && !nonempty(work.execution_basis)) errors.push('L4 execution needs distinct explicit human execution authority.');
  if (work.method_use !== undefined) errors.push(...validateMethodUse(work.method_use, delivery ? 'delivery' : 'task'));
  if (delivery) {
    try { errors.push(...validateObligations(root, work, { config, model }).errors); }
    catch (e) { errors.push(e.message); }
  }

  warnings.push('Recorded decision/evidence fields are inspectable claims, not authenticated human approval or semantic proof.');
  return { errors, warnings, baseline, id: work.id, notChecked: ['human-identity', 'semantic-impact', 'test-sufficiency'] };
}

export function indexLocalWork(root, { modules = [], requirements = [], history = false } = {}) {
  const config = readJson(root, '.accord/accord.yaml');
  if (config.schema_version !== '0.10') throw new Error('Migrate configuration before querying current work.');
  if (!strings(modules) || !strings(requirements)) throw new Error('Invalid work selection.');
  const entries = [], gaps = [], seenIds = new Set();
  const directory = config.work?.local_directory || '.accord/work';
  relativePath(directory);
  for (const dir of [directory, ...(history ? [directory + '/archive'] : [])]) {
    if (!fs.existsSync(path.join(root, dir))) continue;
    if (fs.lstatSync(path.join(root, dir)).isSymbolicLink()) throw new Error('Work directory cannot be a symbolic link.');
    for (const file of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      if (!file.isFile() || !file.name.endsWith('.json')) continue;
      const owner = dir + '/' + file.name;
      try {
        const w = readJson(root, owner);
        if (w.schema_version !== '1.1' || typeof w.id !== 'string' || !w.id || !w.title?.trim() || !['active', 'blocked', 'closed'].includes(w.state) || !strings(w.modules) || !strings(w.requirements)) throw new Error('Invalid work metadata');
        if (seenIds.has(w.id)) throw new Error('Duplicate work identity: ' + w.id);
        seenIds.add(w.id);
        if ((!history && w.state === 'closed') || (modules.length && !w.modules.some(m => modules.includes(m))) || (requirements.length && !w.requirements.some(r => requirements.includes(r)))) continue;
        entries.push({ id: w.id, title: w.title, state: w.state, modules: w.modules, requirements: w.requirements, path: owner });
      } catch (e) { gaps.push({ path: owner, reason: e.message }); }
    }
  }
  return { schema_version: '1.0', carrier: 'local', state: gaps.length ? 'partial' : 'observed', entries, gaps,
    history_included: history, limitation: 'Derived metadata, not human approval. Archive bodies are not default context.' };
}

export function indexGithubWork(repository, { labels = [], api = githubApi } = {}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !strings(labels)) throw new Error('Invalid GitHub work scope.');
  const query = 'state=open&per_page=100' + (labels.length ? '&labels=' + encodeURIComponent(labels.join(',')) : '');
  const items = api('repos/' + repository + '/issues?' + query, { paginate: true });
  if (!Array.isArray(items) || items.length > 10000) throw new Error('Active work query exceeds bounded coverage.');
  return { schema_version: '1.0', carrier: 'github', repository, query, observed_at: new Date().toISOString(),
    state: 'visible-results', entries: items.map(i => ({ id: repository + '#' + i.number, title: i.title, state: i.state,
      kind: i.pull_request ? 'pull-request' : 'issue', url: i.html_url, labels: i.labels.map(l => l.name), updated_at: i.updated_at })),
    limitation: 'Current authenticated visibility only, not all organizational work. No history or discussion bodies returned. Related work in other repositories must be explicitly queried.' };
}

function main() {
  const opts = { project: '.', modules: [], requirements: [] };
  try {
    for (let i = 2; i < process.argv.length; i++) {
      const a = process.argv[i];
      if (a === '--help') { console.log('accord-work.mjs --project DIR [--modules ID,ID] [--requirements ID,ID] [--history]\n[--item FILE --delivery] | [--baseline PATH,PATH] | [--github OWNER/REPO --labels LABEL,LABEL]'); return; }
      if (['--history', '--delivery'].includes(a)) opts[a.slice(2)] = true;
      else if (['--project', '--modules', '--requirements', '--item', '--baseline', '--github', '--labels'].includes(a)) {
        const v = process.argv[++i]; if (!v || v.startsWith('--')) throw new Error('Missing option value.');
        opts[a.slice(2)] = ['--modules', '--requirements', '--baseline', '--labels'].includes(a) ? v.split(',') : v;
      } else throw new Error('Unknown option: ' + a);
    }
    const r = opts.baseline ? captureBaseline(opts.project, opts.baseline) : opts.item ? validateWorkItem(opts.project, readJson(opts.project, opts.item), opts) : opts.github ? indexGithubWork(opts.github, opts) : indexLocalWork(opts.project, opts);
    console.log(JSON.stringify(r, null, 2)); if (r.errors?.length) process.exitCode = 1;
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
