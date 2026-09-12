// Versioned, read-only checks for the engineering detail extension of docs/manifest.yaml.
import fs from 'node:fs';
import { compareContracts, readProjectContract, safeContractPath } from './accord-contracts.mjs';
import { selectModuleScope, validateObservations } from './accord-scope.mjs';

const KINDS = new Set(['interfaces', 'data-model', 'behavior']);
const INVENTORY_KINDS = new Set(['interface', 'data', 'state', 'algorithm', 'runtime', 'behavior']);
const ENTRY_STATES = new Set(['unreviewed', 'reviewed', 'gap', 'conflict']);
const ID = /^[A-Za-z][A-Za-z0-9._-]{0,127}$/;
const MODULE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REVISION = /^[0-9a-f]{40}$/;
const MODULE_SECTIONS = [
  'Purpose and Responsibilities',
  'Capabilities',
  'Boundaries and Non-responsibilities',
  'Interfaces',
  'Data and State',
  'Dependencies and Consumers'
];
const DETAIL_TOPICS = {
  interfaces: /interface|api|command|event|file|protocol/i,
  'data-model': /data|field|entity|schema|storage|state/i,
  behavior: /behavior|state|transition|scenario|rule|lifecycle/i
};
const INVENTORY_MARKERS = {
  interface: /input|output|parameter|request|response|api|event|接口|输入|输出|参数|请求|响应/i,
  data: /field|column|property|nullable|default|type|schema|字段|列|属性|空值|默认|类型|结构/i,
  state: /state|transition|status|enum|guard|状态|转换|枚举|守卫/i,
  algorithm: /algorithm|formula|round|sort|dedup|consisten|算法|公式|舍入|排序|去重|一致性/i,
  runtime: /runtime|dependency|version|config|startup|deploy|运行|依赖|版本|配置|启动|部署/i,
  behavior: /behavior|scenario|trigger|precondition|error|cancel|边界|行为|场景|触发|前置|错误|取消/i
};
const text = value => typeof value === 'string' && value.trim().length > 0;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function markdownSection(contents, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const start = contents.search(new RegExp('^##\\s+' + escaped + '\\s*$', 'mi'));
  if (start < 0) return null;
  const bodyStart = contents.indexOf('\n', start);
  if (bodyStart < 0) return '';
  const remainder = contents.slice(bodyStart + 1);
  const next = remainder.search(/^##\s+/mi);
  return (next < 0 ? remainder : remainder.slice(0, next)).trim();
}

function hasSubstantiveSectionBody(body) {
  if (!body) return false;
  const lines = body.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const meaningful = lines.filter(line =>
    !/^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line) &&
    !/^\|\s*(Name|Source path|Contribution|One cohesive responsibility)\b/i.test(line) &&
    !/^replace\/with\/project\/path$/i.test(line) &&
    !/^(?:Use the approved|Explain\b|For each material|Define what|Identify every|Record owned|Split substantial|Describe allowed|Replace this draft)/i.test(line)
  );
  return meaningful.some(line => !/^\s*[-*]\s*$/.test(line));
}

function validateModuleDocumentShape(projectRoot, module, relativePath, contents) {
  const errors = [];
  for (const heading of MODULE_SECTIONS) {
    const body = markdownSection(contents, heading);
    if (body === null) {
      errors.push('Reviewed module ' + module + ' is missing the required section: ' + heading + '.');
      continue;
    }
    if (!hasSubstantiveSectionBody(body)) {
      errors.push('Reviewed module ' + module + ' has no substantive content or scoped gap in section: ' + heading + '.');
    }
  }
  return errors;
}

function validateDetailDocumentShape(module, kind, relativePath, contents) {
  const headings = [...contents.matchAll(/^##\s+(.+?)\s*$/gmi)]
    .map(match => match[1].trim())
    .filter(heading => !/^provenance$/i.test(heading));
  const topic = DETAIL_TOPICS[kind];
  const matching = headings.filter(heading => topic.test(heading));
  if (matching.some(heading => hasSubstantiveSectionBody(markdownSection(contents, heading)))) return [];
  return ['Reviewed ' + kind + ' detail for module ' + module +
    ' needs a substantive topic section (or scoped gap/not-applicable): ' + relativePath + '.'];
}

export function initialEngineeringState(version = '1.0') {
  return {
    schema_version: version, documents: [], contracts: [],
    coverage: { status: 'not-assessed', inventory_complete: false, scope: [], inventory: [], gaps: [], ...(version === '1.1' ? { reviewed_modules: [] } : {}) },
    reconstruction: { status: 'not-run', scope: [], evidence: [], ...(version === '1.1' ? { current_run: null } : {}) }
  };
}

export function validateEngineeringSources(projectRoot, sources) {
  const errors = [];
  const paths = [];
  if (sources === undefined) return { errors, paths };
  if (!Array.isArray(sources) || sources.length > 1000) return { errors: ['sources.engineering must be a bounded owner list.'], paths };
  const ids = new Set();
  const owners = new Set();
  const kinds = new Set(['user-needs', 'design-inputs', 'module-contract', 'decisions', 'issues', 'verification', 'validation']);
  for (const source of sources) {
    if (!record(source) || !ID.test(source.id || '') || ids.has(source.id) || owners.has(source.path) ||
        !Array.isArray(source.kinds) || !source.kinds.length || new Set(source.kinds).size !== source.kinds.length ||
        source.kinds.some(kind => !kinds.has(kind)) || !Array.isArray(source.modules) ||
        new Set(source.modules).size !== source.modules.length || source.modules.some(module => typeof module !== 'string' || !MODULE.test(module))) {
      errors.push('Engineering sources require unique IDs/owners, known kinds and explicit module scope.');
      continue;
    }
    ids.add(source.id);
    owners.add(source.path);
    try { safeContractPath(projectRoot, source.path); paths.push(source.path); }
    catch (error) { errors.push('Engineering source ' + source.id + ': ' + error.message); }
  }
  return { errors, paths };
}

export function validateEngineeringManifest(projectRoot, manifest, options = {}) {
  const errors = [];
  const warnings = [];
  const trackedPaths = [];
  const comparisons = [];
  let engineering = manifest?.engineering;
  const scopedSchema = manifest?.schema_version === '1.4';
  if (manifest?.schema_version === '1.2') {
    if (engineering !== undefined) errors.push('Engineering detail requires knowledge structure 1.3; do not hide new semantics under 1.2.');
    return { errors, warnings, trackedPaths, comparisons };
  }
  if (!['1.3', '1.4'].includes(manifest?.schema_version)) {
    errors.push('Unsupported engineering knowledge structure; expected 1.3 or 1.4.');
    return { errors, warnings, trackedPaths, comparisons };
  }
  if (!record(engineering) || engineering.schema_version !== (scopedSchema ? '1.1' : '1.0')) {
    errors.push('Knowledge structure and engineering schema do not match (1.3/1.0 or 1.4/1.1).');
    return { errors, warnings, trackedPaths, comparisons };
  }
  const modules = new Set(Array.isArray(manifest.modules) ? manifest.modules : []);
  let selected = null;
  if (options.modules?.length) {
    try { selected = selectModuleScope(manifest, options.modules); }
    catch (error) { errors.push(error.message); return { errors, warnings, trackedPaths, comparisons }; }
    engineering = structuredClone(engineering);
    engineering.documents = engineering.documents?.filter(e => selected.includes(e?.module));
    engineering.contracts = engineering.contracts?.filter(e => selected.includes(e?.module));
    if (engineering.coverage) {
      for (const field of ['scope', 'reviewed_modules']) engineering.coverage[field] = engineering.coverage[field]?.filter(id => selected.includes(id));
      for (const field of ['inventory', 'gaps']) engineering.coverage[field] = engineering.coverage[field]?.filter(e => selected.includes(e?.module));
    }
    if (engineering.reconstruction) engineering.reconstruction.scope = engineering.reconstruction.scope?.filter(id => selected.includes(id));
  }
  const observations = validateObservations(projectRoot, manifest, selected);
  errors.push(...observations.errors); warnings.push(...observations.warnings);
  function list(value, label) {
    if (!Array.isArray(value) || value.length > 10000) {
      errors.push(label + ' must be an array within the 10000-entry budget.');
      return [];
    }
    return value;
  }
  function scope(value, label) {
    const values = list(value, label);
    if (new Set(values).size !== values.length || values.some(id => typeof id !== 'string' || !MODULE.test(id) || !modules.has(id))) {
      errors.push(label + ' must contain unique registered module IDs.');
    }
    return values;
  }
  function inspectPath(relative, label) {
    try {
      const file = safeContractPath(projectRoot, relative);
      trackedPaths.push(relative);
      return file;
    } catch (error) {
      errors.push(label + ': ' + error.message);
      return null;
    }
  }
  const knownDocuments = new Set([
    ...(Array.isArray(manifest.documents) ? manifest.documents.map(file => 'docs/' + file) : []),
    ...[...modules].map(module => 'docs/modules/' + module + '.md')
  ]);
  const documentContents = new Map();
  for (const detail of list(engineering.documents, 'engineering.documents')) {
    if (!record(detail) || !KINDS.has(detail.kind) || !modules.has(detail.module) ||
        detail.path !== 'docs/modules/' + detail.module + '/' + detail.kind + '.md' || knownDocuments.has(detail.path)) {
      errors.push('Engineering detail must have one registered module, standard kind and unique canonical path.');
      continue;
    }
    knownDocuments.add(detail.path);
    const file = inspectPath(detail.path, 'Engineering detail ' + detail.path);
    if (file) {
      const contents = fs.readFileSync(file, 'utf8');
      documentContents.set(detail.path, contents);
      if (!contents.includes('## Provenance')) errors.push('Engineering detail requires Provenance: ' + detail.path);
      if (engineering.coverage?.status === 'reviewed' || engineering.coverage?.reviewed_modules?.includes(detail.module)) {
        errors.push(...validateDetailDocumentShape(detail.module, detail.kind, detail.path, contents));
      }
    }
  }

  const contractIds = new Set();
  const artifacts = new Set();
  const declaredArtifacts = new Set(Array.isArray(engineering.contracts) ? engineering.contracts.map(item => item?.artifact).filter(text) : []);
  for (const contract of list(engineering.contracts, 'engineering.contracts')) {
    if (!record(contract) || !ID.test(contract.id || '') || contractIds.has(contract.id) ||
        !modules.has(contract.module) || !['json-schema', 'openapi-json'].includes(contract.format) ||
        typeof contract.artifact !== 'string' || !contract.artifact.startsWith('docs/contracts/' + contract.module + '/') ||
        !contract.artifact.endsWith('.json') || artifacts.has(contract.artifact) ||
        contract.source === contract.artifact || !knownDocuments.has(contract.explanation)) {
      errors.push('Invalid exact-contract entry: unique ID/artifact, supported format, source and registered explanation are required.');
      continue;
    }
    contractIds.add(contract.id);
    artifacts.add(contract.artifact);
    try {
      if (knownDocuments.has(contract.source) || declaredArtifacts.has(contract.source)) throw new Error('Derived documentation cannot be primary contract evidence.');
      const sourceStat = fs.statSync(safeContractPath(projectRoot, contract.source));
      const artifactStat = fs.statSync(safeContractPath(projectRoot, contract.artifact));
      if (sourceStat.ino === artifactStat.ino && sourceStat.dev === artifactStat.dev) throw new Error('Source and artifact resolve to the same physical file.');
      const source = readProjectContract(projectRoot, contract.source, contract.format);
      const artifact = readProjectContract(projectRoot, contract.artifact, contract.format);
      trackedPaths.push(contract.artifact);
      const comparison = compareContracts(source, artifact);
      comparisons.push({ id: contract.id, module: contract.module, ...comparison });
      if (comparison.status === 'mismatch') errors.push('Exact contract drift: ' + contract.id + ' (' + comparison.differences.length + ' differences).');
      if (comparison.status === 'partial') warnings.push('Exact contract has unresolved references: ' + contract.id);
    } catch (error) { errors.push('Exact contract ' + contract.id + ': ' + error.message); }
  }

  const coverage = engineering.coverage;
  if (!record(coverage) || !['not-assessed', 'partial', 'reviewed'].includes(coverage.status) || typeof coverage.inventory_complete !== 'boolean') {
    errors.push('Engineering coverage requires a closed status and inventory_complete boolean.');
    return { errors, warnings, trackedPaths, comparisons };
  }
  const coverageScope = scope(coverage.scope, 'Engineering coverage scope');
  const inventory = list(coverage.inventory, 'Engineering inventory');
  const gaps = list(coverage.gaps, 'Engineering coverage gaps');
  if (gaps.some(gap => !record(gap) || !coverageScope.includes(gap.module) || !text(gap.reason))) errors.push('Coverage gaps require a scoped module and reason.');
  const seen = new Set();
  for (const item of inventory) {
    if (!record(item) || !ID.test(item.id || '') || seen.has(item.id) ||
        !coverageScope.includes(item.module) || !INVENTORY_KINDS.has(item.kind) || !ENTRY_STATES.has(item.status)) {
      errors.push('Invalid engineering inventory entry: unique ID, scoped module, kind and explicit status required.');
      continue;
    }
    seen.add(item.id);
    if (item.status !== 'reviewed') {
      if (!text(item.reason)) errors.push('Unreviewed/gap/conflict inventory requires a reason: ' + item.id);
      continue;
    }
    if (!knownDocuments.has(item.document)) errors.push('Reviewed inventory must link its registered explanation: ' + item.id);
    if (!Array.isArray(item.sources) || !item.sources.length) errors.push('Reviewed inventory requires source references: ' + item.id);
    else for (const source of item.sources) {
      if (knownDocuments.has(source) || declaredArtifacts.has(source)) errors.push('Inventory cannot use derived documentation as primary evidence: ' + item.id);
      else inspectPath(source, 'Inventory source ' + item.id);
    }
    if (!text(item.review_basis)) errors.push('Reviewed inventory requires a review basis: ' + item.id);
    if (item.contract_id !== undefined && !contractIds.has(item.contract_id)) errors.push('Inventory contract ID does not resolve: ' + item.id);
  }
  const reviewedModules = scopedSchema ? scope(coverage.reviewed_modules, 'Reviewed modules') : coverage.status === 'reviewed' ? coverageScope : [];
  if (reviewedModules.some(id => !coverageScope.includes(id))) errors.push('Reviewed module must belong to the declared inventory scope.');
  if (coverage.status === 'reviewed' || reviewedModules.length) {
    for (const item of inventory.filter(entry => entry?.status === 'reviewed')) {
      let contents = documentContents.get(item.document);
      if (!contents) {
        try { contents = fs.readFileSync(safeContractPath(projectRoot, item.document), 'utf8'); }
        catch (error) { contents = ''; }
      }
      const marker = INVENTORY_MARKERS[item.kind];
      const explanatoryContents = contents.split(/\r?\n##\s+Provenance\b/i, 1)[0];
      if (marker && !marker.test(explanatoryContents)) {
        errors.push('Reviewed inventory item ' + item.id + ' lacks the expected ' + item.kind +
          ' detail markers in its canonical document: ' + item.document + '.');
      }
    }
    for (const module of (coverage.status === 'reviewed' ? coverageScope : reviewedModules)) {
      const relativePath = 'docs/modules/' + module + '.md';
      try {
        const contents = fs.readFileSync(safeContractPath(projectRoot, relativePath), 'utf8');
        documentContents.set(relativePath, contents);
        errors.push(...validateModuleDocumentShape(projectRoot, module, relativePath, contents));
      } catch (error) {
        errors.push('Reviewed module content cannot be inspected: ' + relativePath + ' (' + error.message + ').');
      }
    }
  }
  if (coverage.status === 'reviewed') {
    if (!coverage.inventory_complete || !coverageScope.length || !inventory.length || gaps.length ||
        (!scopedSchema && Array.isArray(manifest.known_gaps) && manifest.known_gaps.length) ||
        inventory.some(item => item?.status !== 'reviewed') ||
        coverageScope.some(module => !inventory.some(item => item?.module === module)) ||
        (!scopedSchema && [...modules].some(module => !coverageScope.includes(module))) || !text(coverage.inventory_basis) ||
        comparisons.some(comparison => comparison.status !== 'matched')) {
      errors.push('Reviewed coverage requires an independently reviewed full module inventory, explained items, no unresolved gaps and matched declared contracts.');
    }
  } else warnings.push('Engineering coverage is ' + coverage.status + '; current documentation is not a completeness claim.');
  for (const module of reviewedModules) {
    const items = inventory.filter(item => item?.module === module);
    if (!coverage.inventory_complete || !text(coverage.inventory_basis) || !items.length ||
        items.some(item => item.status !== 'reviewed') || gaps.some(gap => gap.module === module) ||
        comparisons.some(item => item.module === module && item.status !== 'matched')) errors.push('Reviewed module requires complete scoped inventory, explained items and no unresolved contract/gap: ' + module);
  }

  const reconstruction = engineering.reconstruction;
  if (!record(reconstruction) || !['not-run', 'passed', 'failed', 'unavailable'].includes(reconstruction.status)) {
    errors.push('Engineering reconstruction requires a closed result state.');
    return { errors, warnings, trackedPaths, comparisons };
  }
  const reconstructionScope = scope(reconstruction.scope, 'Reconstruction scope');
  const evidence = list(reconstruction.evidence, 'Reconstruction evidence');
  if (scopedSchema && reconstruction.status !== 'not-run' && !ID.test(reconstruction.current_run || '')) errors.push('Reconstruction result requires an explicit current_run.');
  for (const entry of evidence) {
    if (!record(entry) || !['question-answering', 'rebuild'].includes(entry.kind) ||
        !['passed', 'failed', 'unavailable', 'not-run'].includes(entry.result) ||
        !text(entry.environment) || typeof entry.isolated !== 'boolean' || !REVISION.test(entry.revision || '') ||
        (scopedSchema && !ID.test(entry.run_id || ''))) {
      errors.push('Reconstruction evidence requires kind, result, environment, isolation and full revision.');
      continue;
    }
    scope(entry.scope, 'Reconstruction evidence scope');
    inspectPath(entry.path, 'Reconstruction evidence');
  }
  if (reconstruction.status === 'passed') {
    const currentEvidence = scopedSchema ? evidence.filter(entry => entry.run_id === reconstruction.current_run) : evidence;
    const hasEvidence = (module, kind) => currentEvidence.some(entry => {
      const observation = manifest.scopes?.find(scope => scope.module === module)?.observation;
      return entry?.kind === kind && entry.result === 'passed' && entry.isolated === true &&
        entry.revision === (scopedSchema ? observation?.base_revision : manifest.observed_revision) &&
        (!scopedSchema || entry.observation_digest === observation?.digest) && Array.isArray(entry.scope) && entry.scope.includes(module);
    });
    const scopeReady = scopedSchema
      ? reconstructionScope.every(module => reviewedModules.includes(module) && observations.results.some(result => result.module === module && result.fresh && !result.gaps.length))
      : manifest.status === 'current' && coverage.status === 'reviewed';
    let dependencyComplete = true;
    if (scopedSchema && reconstructionScope.length) {
      try { dependencyComplete = selectModuleScope(manifest, reconstructionScope).every(id => reconstructionScope.includes(id)); }
      catch { dependencyComplete = false; }
    }
    if (!scopeReady || !dependencyComplete || (!reconstructionScope.length && !selected) ||
        reconstructionScope.some(module => !hasEvidence(module, 'question-answering') || !hasEvidence(module, 'rebuild')) ||
        currentEvidence.some(entry => (!selected || entry.scope?.some(id => selected.includes(id))) && (entry?.result !== 'passed' || entry?.isolated !== true))) {
      errors.push('Passed reconstruction requires current reviewed coverage and isolated revision-bound question/rebuild evidence for every claimed module.');
    }
  }
  warnings.push('Engineering checks validate declared coverage and linked evidence, not human approval or semantic correctness.');
  return { errors, warnings, trackedPaths: [...new Set(trackedPaths)], comparisons };
}
