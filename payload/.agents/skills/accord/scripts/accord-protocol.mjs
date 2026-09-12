// Exact runtime contracts. Product policy belongs in docs/product.md, not here.
export const CONFIG_SCHEMA = '0.8'; // Configuration shape remains compatible.
export const PROTOCOL_VERSION = '0.9.0';
export const CHANGE_SCHEMA = '0.9';
export const RECORD_SCHEMAS = new Set(['0.8', '0.9']);
export const KNOWLEDGE_SCHEMAS = new Set(['1.2', '1.3', '1.4']);
export const RISK_LEVELS = new Set(['L0', 'L1', 'L2', 'L3', 'L4']);
export const MATERIAL_RISKS = new Set(['L2', 'L3', 'L4']);
export const CHANGE_STATUSES = new Set(['draft', 'design-input-ready', 'approved',
  'implementing', 'verifying', 'validating', 'review', 'accepted', 'awaiting-archive', 'rejected']);
export const AUTHORIZED_STAGES = new Set(['approved', 'implementing', 'verifying',
  'validating', 'review', 'accepted', 'awaiting-archive']);
export const EXECUTING_STAGES = new Set([...AUTHORIZED_STAGES].filter(s => s !== 'approved'));
export const DELIVERY_STAGES = new Set(['review', 'accepted', 'awaiting-archive']);
export const VALIDATION_SCOPES = new Set(['installation', 'task', 'delivery', 'audit']);
export const KNOWLEDGE_DOCUMENTS = ['README.md', 'agent-context.md', 'system-overview.md',
  'architecture.md', 'interfaces-and-data.md', 'glossary.md', 'modules/README.md'];
export const DOC_OUTPUTS = ['docs/README.md', 'docs/manifest.yaml', 'docs/agent-context.md',
  'docs/system-overview.md', 'docs/architecture.md', 'docs/interfaces-and-data.md',
  'docs/glossary.md', 'docs/modules/'];
export const ROUTE_CONTRACTS = {
  'initial-knowledge': { methods: ['acquire-codebase-knowledge', 'arch'], outputs: DOC_OUTPUTS },
  'change-context': { methods: ['context-engineering'], outputs: [] },
  'knowledge-refresh': { methods: ['context-engineering', 'arch'], outputs: DOC_OUTPUTS },
  'knowledge-query': { methods: [], outputs: [], root: null },
  'documentation-writing': { methods: ['documentation-writer'], outputs: [], root: null },
  'bug-reproduction': { methods: ['bug-reproduction-brief'], outputs: [], root: null },
  'refactor-planning': { methods: ['context-engineering', 'refactor-plan'], outputs: [], root: null },
  'test-verification': { methods: [], outputs: [], root: null },
  'web-testing': { methods: ['webapp-testing'], outputs: [], root: null }
};
export const BUDGET_KEYS = [...KNOWLEDGE_DOCUMENTS, 'module'];
export const METHOD_STATES = new Set(['not-run', 'loaded', 'applied', 'verified',
  'reused', 'unavailable', 'skipped', 'failed']);

export function methodContribution(route, method) {
  return { method, requirement: route === 'knowledge-refresh' && method === 'arch' ? 'conditional' : 'required',
    condition: route === 'knowledge-refresh' && method === 'arch'
      ? 'Architecture, topology or cross-module explanation changes.'
      : 'Supply the route contribution; reuse matching evidence when sufficient.',
    reuse: 'Same reviewed method content, task scope, inputs and dependencies; record evidence/basis.' };
}

export function validateMethodUse(entries, stage) {
  const errors = [];
  if (!Array.isArray(entries) || entries.length > 64) return ['Method use must be a bounded JSON array.'];
  const seen = new Set();
  for (const entry of entries) {
    if (!entry || typeof entry.method !== 'string' || !entry.method.trim() || seen.has(entry.method) ||
        !METHOD_STATES.has(entry.state) || !['required', 'conditional'].includes(entry.requirement) ||
        typeof entry.basis !== 'string' || !entry.basis.trim()) {
      errors.push('Each method needs a unique ID, requirement, actual state and contribution/skip basis.');
      continue;
    }
    seen.add(entry.method);
    if (['applied', 'verified', 'reused'].includes(entry.state) &&
        (typeof entry.evidence !== 'string' || !entry.evidence.trim())) errors.push('Method ' + entry.method + ' requires evidence.');
    if (DELIVERY_STAGES.has(stage) && entry.requirement === 'required' &&
        !['verified', 'reused'].includes(entry.state)) errors.push('Required method contribution is incomplete: ' + entry.method);
    if (DELIVERY_STAGES.has(stage) && entry.requirement === 'conditional' && ['not-run', 'loaded'].includes(entry.state)) errors.push('Resolve conditional method applicability before delivery: ' + entry.method);
  }
  return errors;
}
