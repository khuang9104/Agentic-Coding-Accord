#!/usr/bin/env node
// Pure scope/authority policy plus an explicit read-only GitHub adapter.
// Local declarations are never upgraded into authenticated remote approvals.
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { parseExactJson } from './accord-contracts.mjs';
import { ID, SHA, object, strings, readJson, digest, relativePath, owns } from './accord-project.mjs';

const PRINCIPAL = /^(?:github:[a-zA-Z0-9][a-zA-Z0-9-]{0,38}|local:[A-Za-z0-9][A-Za-z0-9._-]{0,127})$/;
const principalKey = value => value.startsWith('github:') ? value.toLowerCase() : value;
export const POLICY_PATH = '.accord/governance.yaml';
export function validateGovernancePolicy(policy) {
  const errors = [];
  if (!object(policy) || policy.schema_version !== '1.0' || !['delegated', 'federated'].includes(policy.mode) ||
      !strings(policy.project_owners) || !policy.project_owners.length || !Array.isArray(policy.domains) || policy.domains.length > 1000 ||
      policy.review_binding !== 'explicit-head-marker') return ['Unsupported governance policy/mode/review binding.'];
  const ids = new Set(), modules = new Set();
  for (const p of policy.project_owners) if (!PRINCIPAL.test(p)) errors.push('Invalid project principal: ' + p);
  for (const d of policy.domains) {
    if (!object(d) || !ID.test(d.id || '') || ids.has(d.id) || !strings(d.members) || !d.members.length ||
        d.members.some(p => !PRINCIPAL.test(p)) || !strings(d.modules) || !d.modules.length ||
        d.modules.some(m => m !== '$system' && !ID.test(m))) { errors.push('Invalid authority domain: ' + d?.id); continue; }
    ids.add(d.id);
    for (const m of d.modules) {
      if (modules.has(m)) errors.push('A module has competing authority owners: ' + m);
      modules.add(m);
    }
  }
  if (policy.mode === 'federated' && !modules.has('$system')) errors.push('Federated mode requires an explicit $system domain for shared constraints and unmapped paths.');
  return errors;
}

// Return requirements, not a decision. Every affected independent domain is required.
export function authorityRequirements(policy, { modules, action = 'implementation', policyChange = false }) {
  const errors = validateGovernancePolicy(policy);
  if (!strings(modules) || !modules.length || !['requirements', 'implementation', 'acceptance', 'execution'].includes(action)) errors.push('Authority evaluation needs explicit affected modules and a known action.');
  if (errors.length) return { errors, groups: [] };
  if (policy.mode === 'delegated' && (policyChange || modules.includes('$system') || action === 'execution')) return { errors, groups: [{ id: '$project', any_of: policy.project_owners, modules }] };
  const domains = policy.mode === 'federated' && policyChange ? policy.domains : policy.domains.filter(d => d.modules.some(m => modules.includes(m)));
  const uncovered = modules.filter(m => !domains.some(d => d.modules.includes(m)));
  if (policy.mode === 'federated' && uncovered.length) errors.push('Independent authority is not assigned: ' + uncovered.join(', '));
  const groups = domains.map(d => ({ id: d.id, any_of: policy.mode === 'delegated' ? [...new Set([...d.members, ...policy.project_owners])] : d.members, modules: policyChange ? modules : modules.filter(m => d.modules.includes(m)) }));
  if (policy.mode === 'delegated' && uncovered.length) groups.push({ id: '$project', any_of: policy.project_owners, modules: uncovered });
  return { errors, groups };
}

// Evidence is supplied by a trusted adapter, separately from author-controlled work metadata.
export function evaluateAuthority(policy, request, evidence = []) {
  const requirements = authorityRequirements(policy, request);
  const errors = [...requirements.errors];
  if (!SHA.test(request.head || '') || !SHA.test(request.target || '') || typeof request.policyDigest !== 'string') errors.push('Authority evidence requires exact head, target and policy digest.');
  const valid = evidence.filter(e => e?.verified === true && typeof e.principal === 'string' && e.head === request.head && e.target === request.target &&
    e.policy_digest === request.policyDigest && e.action === request.action && e.state === 'approved' && e.modules?.every(m => typeof m === 'string'));
  const groups = requirements.groups.map(group => ({ ...group, satisfied_by: valid.filter(e =>
    group.any_of.map(principalKey).includes(principalKey(e.principal)) && group.modules.every(m => e.modules.includes(m))).map(e => ({ principal: e.principal, source: e.source })) }));
  return { status: errors.length ? 'invalid' : groups.length && groups.every(g => g.satisfied_by.length) ? 'satisfied' : 'approval-required',
    errors, mode: policy.mode, groups, head: request.head, target: request.target,
    limitation: 'Only the requested action and immutable diff are covered. This is not merge permission, deployment acceptance or proof of test sufficiency.' };
}

export function checkPolicyTransition(previous, proposed, request, evidence) {
  const errors = validateGovernancePolicy(proposed);
  const result = evaluateAuthority(previous, { ...request, policyChange: true }, evidence);
  return { ...result, errors: [...result.errors, ...errors], status: errors.length ? 'invalid' : result.status,
    effective_policy: 'target-before-change', proposed_mode: proposed?.mode,
    active_work: 'Recompute affected approval requirements at the policy effective commit; preserve historical decisions under their original policy.' };
}

export function githubApi(endpoint, { paginate = false } = {}) {
  // Explicit CLI invocation only. No automatic authentication, installation, fetching or writes.
  if (!endpoint.startsWith('repos/') || endpoint.includes('..')) throw new Error('Invalid GitHub read endpoint.');
  const args = ['api', '--method', 'GET', endpoint, ...(paginate ? ['--paginate', '--slurp'] : [])];
  const r = spawnSync('gh', args, { encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024, timeout: 30000 });
  if (r.error || r.status !== 0) throw new Error('GitHub read unavailable; authentication, permissions, connectivity or rate limits must be resolved. No empty result inferred.');
  const result = parseExactJson(r.stdout);
  return paginate ? result.flat() : result;
}

export function inspectGithubAuthority(repository, number, { action = 'implementation', api = githubApi } = {}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !Number.isSafeInteger(number) || number < 1) throw new Error('Expected repository owner/name and positive PR number.');
  const prefix = 'repos/' + repository;
  const pr = api(prefix + '/pulls/' + number);
  if (!SHA.test(pr.head?.sha || '') || !SHA.test(pr.base?.sha || '') || pr.base.repo.full_name.toLowerCase() !== repository.toLowerCase()) throw new Error('PR repository or immutable revisions do not match.');
  const head = pr.head.sha, target = pr.base.sha;
  const readAt = (file, ref) => {
    relativePath(file);
    const response = api(prefix + '/contents/' + file.split('/').map(encodeURIComponent).join('/') + '?ref=' + ref);
    if (response.type !== 'file' || response.encoding !== 'base64' || response.size > 2 * 1024 * 1024) throw new Error('Unsupported remote policy/metadata owner: ' + file);
    return Buffer.from(response.content, 'base64').toString('utf8');
  };
  const policyText = readAt(POLICY_PATH, target);
  const policy = parseExactJson(policyText);
  const errors = validateGovernancePolicy(policy);
  if (errors.length) throw new Error(errors.join('\n'));
  const manifest = parseExactJson(readAt('docs/manifest.yaml', target));
  if (manifest.schema_version !== '2.0' || !strings(manifest.module_files)) throw new Error('GitHub authority adapter requires a knowledge 2.0 baseline.');
  const modules = manifest.module_files.map(file => ({ ...parseExactJson(readAt(file, target)), metadata_path: file }));
  if (modules.some(m => !ID.test(m.id || '') || !strings(m.source_paths) || !strings(m.depends_on) || !Array.isArray(m.documents) || m.status !== 'current' || !strings(m.gaps) || m.gaps.length)) throw new Error('Trusted module impact mappings are incomplete; resolve gaps before automated authority checks.');
  if (new Set(modules.map(m => m.id)).size !== modules.length || modules.some(m => m.depends_on.some(id => !modules.some(n => n.id === id)))) throw new Error('Duplicate or unresolved trusted modules.');
  modules.forEach(m => m.source_paths.forEach(relativePath));
  const files = api(prefix + '/pulls/' + number + '/files?per_page=100', { paginate: true });
  if (files.length !== pr.changed_files || files.length >= 3000) throw new Error('PR file coverage is incomplete; cannot determine all affected domains.');
  const changed = [...new Set(files.flatMap(f => [f.filename, ...(f.previous_filename ? [f.previous_filename] : [])]))];
  changed.forEach(relativePath);
  // Use trusted base ownership, including previous rename paths; unknown paths are system changes.
  const affected = new Set();
  for (const file of changed) {
    const candidates = modules.flatMap(m => [
      ...m.source_paths.filter(p => owns(p, file)).map(p => ({ module: m.id, specificity: p.length })),
      ...(m.metadata_path === file || m.documents.some(d => d.path === file) ? [{ module: m.id, specificity: 10000 }] : [])
    ]).sort((a, b) => b.specificity - a.specificity);
    if (candidates.length > 1 && candidates[0].specificity === candidates[1].specificity) throw new Error('Ambiguous trusted source ownership.');
    affected.add(candidates[0]?.module || '$system');
  }
  // Metadata cannot prove absence of consumers. Include declared reverse consumers conservatively.
  for (let changedGraph = true; changedGraph;) {
    changedGraph = false;
    for (const m of modules) if (!affected.has(m.id) && m.depends_on?.some(id => affected.has(id))) { affected.add(m.id); changedGraph = true; }
  }
  const policyChange = changed.includes(POLICY_PATH);
  const ownership = m => ({ id: m.id, parent: m.parent, source_paths: m.source_paths, depends_on: m.depends_on, documents: m.documents.map(d => d.path).sort() });
  const removed = file => files.some(f => f.filename === file && f.status === 'removed');
  let authorityChange = policyChange;
  if (changed.includes('docs/manifest.yaml')) {
    if (removed('docs/manifest.yaml')) throw new Error('A PR cannot remove its project registry.');
    const next = parseExactJson(readAt('docs/manifest.yaml', head));
    authorityChange ||= JSON.stringify([...manifest.module_files].sort()) !== JSON.stringify([...next.module_files].sort());
  }
  for (const m of modules.filter(m => changed.includes(m.metadata_path))) {
    authorityChange ||= removed(m.metadata_path) || JSON.stringify(ownership(m)) !== JSON.stringify(ownership(parseExactJson(readAt(m.metadata_path, head))));
  }
  const request = { modules: [...affected].sort(), head, target, action, policyChange: authorityChange, policyDigest: digest(policyText) };
  const reviews = api(prefix + '/pulls/' + number + '/reviews?per_page=100', { paginate: true });
  const latest = new Map();
  for (const r of [...reviews].sort((a, b) => a.id - b.id)) {
    if (r.user?.type !== 'User' || !r.submitted_at || r.state === 'PENDING' || r.state === 'COMMENTED') continue;
    latest.set(r.user.login.toLowerCase(), r);
  }
  // Bind scope and policy too; do not re-label old head-only approvals under new policy.
  const approvalContext = digest(JSON.stringify({ target, policy: request.policyDigest,
    modules: request.modules, paths: [...changed].sort(), groups: authorityRequirements(policy, request).groups }));
  const marker = 'Accord-Approve-' + action + ': ' + head + ' ' + approvalContext;
  const evidence = [...latest.values()].filter(r => r.state === 'APPROVED' && r.commit_id === head &&
    r.body?.split(/\r?\n/).some(line => line.trim() === marker)).map(r => ({ verified: true,
      principal: 'github:' + r.user.login.toLowerCase(), state: 'approved', head, target,
      policy_digest: request.policyDigest, action, modules: request.modules, source: r.html_url }));
  // Re-read to reject a race between file enumeration, review retrieval and result construction.
  const final = api(prefix + '/pulls/' + number);
  if (final.head.sha !== head || final.base.sha !== target || final.changed_files !== pr.changed_files) throw new Error('PR changed during inspection; retry against a stable snapshot.');
  const result = policyChange ? checkPolicyTransition(policy, parseExactJson(readAt(POLICY_PATH, head)), request, evidence) : evaluateAuthority(policy, request, evidence);
  return { ...result, repository, number, affected_modules: request.modules, policy_change: policyChange,
    required_review_marker: marker, approval_context: approvalContext, trust: 'live-github-read-target-policy',
    authority_mapping_change: authorityChange,
    not_checked: ['dynamic/undeclared dependencies', 'required CI checks', 'merge eligibility', 'deployment authorization outside requested action'] };
}

function main() {
  const options = { project: '.', action: 'implementation' };
  try {
    for (let i = 2; i < process.argv.length; i++) {
      const a = process.argv[i];
      if (a === '--help') { console.log('accord-governance.mjs --project DIR [--modules ID,ID] [--action requirements|implementation|acceptance|execution]\nLive read: --github OWNER/REPO --pr NUMBER [--action ACTION]'); return; }
      if (!['--project', '--modules', '--action', '--github', '--pr'].includes(a)) throw new Error('Unknown option: ' + a);
      const value = process.argv[++i]; if (!value || value.startsWith('--')) throw new Error('Missing value: ' + a);
      options[a.slice(2)] = a === '--modules' ? value.split(',') : a === '--pr' ? Number(value) : value;
    }
    const result = options.github ? inspectGithubAuthority(options.github, options.pr, options) :
      { ...authorityRequirements(readJson(options.project, POLICY_PATH), { modules: options.modules || ['$system'], action: options.action }),
        status: 'human-verification-required', trust: 'local-policy-declaration',
        instruction: 'Verify the actual human decision and scope in the current task. File labels and digests cannot authenticate local human approval.' };
    console.log(JSON.stringify(result, null, 2));
    if (result.errors.length || (options.github && result.status !== 'satisfied')) process.exitCode = 1;
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
