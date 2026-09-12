#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const BUNDLE_NAME = 'capabilities.bundle.json.gz';
const BUNDLE_DIGEST_NAME = 'BUNDLE.sha256';
const MANIFEST_NAME = 'MANIFEST.sha256';
const MAX_COMPRESSED_BYTES = 8 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 64 * 1024 * 1024;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_FILES = 5000;
const MAX_PATH_LENGTH = 512;
const MAX_METADATA_BYTES = 1024 * 1024;

function normalizedDigest(contents) {
  const portable = contents.includes(0)
    ? contents
    : Buffer.from(contents.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
  return crypto.createHash('sha256').update(portable).digest('hex');
}

function rawDigest(contents) {
  return crypto.createHash('sha256').update(contents).digest('hex');
}

function gitObjectDigest(type, contents) {
  return crypto.createHash('sha1')
    .update(Buffer.from(type + ' ' + contents.length + '\0'))
    .update(contents)
    .digest();
}

function bundleTreeSha(files, prefix, executablePaths = []) {
  const executable = new Set(executablePaths);
  const root = new Map();
  for (const [relativePath, contents] of files) {
    if (!relativePath.startsWith(prefix)) continue;
    const remainder = relativePath.slice(prefix.length);
    if (!remainder) continue;
    const parts = remainder.split('/');
    let directory = root;
    for (const part of parts.slice(0, -1)) {
      if (!directory.has(part)) directory.set(part, new Map());
      const next = directory.get(part);
      if (!(next instanceof Map)) throw new Error('Capability tree path collision: ' + relativePath);
      directory = next;
    }
    const name = parts.at(-1);
    if (directory.has(name)) throw new Error('Capability tree path collision: ' + relativePath);
    directory.set(name, contents);
  }

  if (root.size === 0) return null;
  function digestTreeWithModes(directory, parent = '') {
    const entries = [...directory.entries()].sort((left, right) => {
      const leftName = left[0] + (left[1] instanceof Map ? '/' : '');
      const rightName = right[0] + (right[1] instanceof Map ? '/' : '');
      return Buffer.compare(Buffer.from(leftName), Buffer.from(rightName));
    });
    const parts = [];
    for (const [name, value] of entries) {
      const isDirectory = value instanceof Map;
      const relativePath = parent ? parent + '/' + name : name;
      const digest = isDirectory
        ? digestTreeWithModes(value, relativePath)
        : gitObjectDigest('blob', value);
      const mode = isDirectory ? '40000' : executable.has(relativePath) ? '100755' : '100644';
      parts.push(Buffer.from(mode + ' ' + name + '\0'), digest);
    }
    return gitObjectDigest('tree', Buffer.concat(parts));
  }
  return digestTreeWithModes(root).toString('hex');
}

function verifyPinnedSkillTrees(files, snapshot) {
  if (snapshot?.schema_version !== '1.0' ||
      !/^[0-9a-f]{40}$/i.test(snapshot?.ref || '') ||
      typeof snapshot?.repository !== 'string' || !snapshot.repository.trim() ||
      typeof snapshot?.license !== 'string' || !snapshot.license.trim() ||
      !Array.isArray(snapshot?.items)) {
    throw new Error('Capability snapshot identity, provenance, or items are invalid.');
  }
  const ids = new Set();
  for (const item of snapshot.items) {
    if (typeof item?.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id) ||
        ids.has(item.id) || !['skill', 'plugin'].includes(item.kind) ||
        item.path !== (item.kind === 'skill' ? 'skills/' : 'plugins/') + item.id ||
        !Array.isArray(item.components) || item.components.length === 0) {
      throw new Error('Capability snapshot contains an invalid or duplicate item.');
    }
    ids.add(item.id);
    for (const component of item.components) {
      if (!safeBundlePath(component?.path) ||
          !(/^[0-9a-f]{40}$/i.test(component.tree_sha || '') ||
            /^[0-9a-f]{40}$/i.test(component.blob_sha || ''))) {
        throw new Error('Capability snapshot component metadata is invalid: ' + item.id);
      }
    }
    if (item?.kind !== 'skill') continue;
    const component = Array.isArray(item.components)
      ? item.components.find((candidate) => candidate.path === item.path)
      : null;
    if (!component || !/^[0-9a-f]{40}$/i.test(component.tree_sha || '')) {
      throw new Error('Bundled Skill is missing its pinned upstream tree SHA: ' + item?.id);
    }
    const executablePaths = component.executable_paths || [];
    if (!Array.isArray(executablePaths) || executablePaths.some((candidate) =>
      !safeBundlePath(candidate))) {
      throw new Error('Bundled Skill executable path metadata is invalid: ' + item.id);
    }
    const actual = bundleTreeSha(
      files,
      item.path.replace(/\/$/, '') + '/',
      executablePaths
    );
    if (actual !== component.tree_sha.toLowerCase()) {
      throw new Error('Bundled Skill does not match its pinned upstream Git tree: ' + item.id);
    }
  }
}

function readBoundedFile(filePath, maximum, label) {
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size > maximum) {
    throw new Error(label + ' exceeds its ' + maximum + '-byte limit.');
  }
  return fs.readFileSync(filePath);
}

function filesBelow(root, relative = '') {
  const directory = path.join(root, relative);
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(relative, entry.name);
    const normalized = entryPath.split(path.sep).join('/');
    if (!relative && entry.name === MANIFEST_NAME) {
      continue;
    }
    if (entry.isSymbolicLink()) {
      throw new Error('Capability source must not contain symbolic links: ' + normalized);
    }
    if (entry.isDirectory()) {
      files.push(...filesBelow(root, entryPath));
    } else if (entry.isFile()) {
      files.push(normalized);
    }
  }
  return files.sort();
}

function parseManifest(text) {
  const entries = new Map();
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    if (!line) continue;
    const match = line.match(/^([0-9a-f]{64})  (.+)$/i);
    if (!match || !safeBundlePath(match[2]) || entries.has(match[2])) {
      throw new Error('Invalid or duplicate snapshot manifest entry: ' + line);
    }
    entries.set(match[2], match[1].toLowerCase());
  }
  return entries;
}

function safeBundlePath(relativePath) {
  if (typeof relativePath !== 'string' || !relativePath ||
      relativePath.length > MAX_PATH_LENGTH || relativePath.includes('\\')) {
    return false;
  }
  const normalized = path.posix.normalize(relativePath);
  return normalized === relativePath && normalized !== '.' &&
    !normalized.startsWith('../') && !path.posix.isAbsolute(normalized);
}

export function createCapabilityBundle(sourceRoot) {
  const root = path.resolve(sourceRoot);
  const manifestText = readBoundedFile(
    path.join(root, MANIFEST_NAME), MAX_METADATA_BYTES, 'Capability manifest'
  ).toString('utf8');
  const manifest = parseManifest(manifestText);
  const paths = filesBelow(root);
  if (paths.length > MAX_FILES) {
    throw new Error('Expanded snapshot exceeds the maximum file count.');
  }
  if (paths.length !== manifest.size || paths.some((file) => !manifest.has(file))) {
    throw new Error('Expanded snapshot does not match its manifest file list.');
  }
  const files = paths.map((relativePath) => {
    const contents = fs.readFileSync(path.join(root, ...relativePath.split('/')));
    if (contents.length > MAX_FILE_BYTES) {
      throw new Error('Expanded snapshot file exceeds the size limit: ' + relativePath);
    }
    if (normalizedDigest(contents) !== manifest.get(relativePath)) {
      throw new Error('Expanded snapshot content does not match manifest: ' + relativePath);
    }
    return { path: relativePath, content_base64: contents.toString('base64') };
  });
  const snapshot = JSON.parse(readBoundedFile(
    path.join(root, 'SNAPSHOT.json'), MAX_METADATA_BYTES, 'Capability snapshot metadata'
  ).toString('utf8'));
  verifyPinnedSkillTrees(new Map(files.map(
    (entry) => [entry.path, Buffer.from(entry.content_base64, 'base64')]
  )), snapshot);
  const payload = Buffer.from(JSON.stringify({
    schema_version: '1.0',
    snapshot: snapshot.snapshot,
    ref: snapshot.ref,
    files
  }), 'utf8');
  return {
    bundle: zlib.gzipSync(payload, { level: 9, mtime: 0 }),
    manifest: manifestText.replace(/\r\n/g, '\n'),
    snapshot,
    license: readBoundedFile(path.join(root, 'LICENSE'), MAX_METADATA_BYTES, 'Capability license')
  };
}

export function writeCapabilityBundle(sourceRoot, destinationRoot) {
  const destination = path.resolve(destinationRoot);
  fs.mkdirSync(destination, { recursive: true });
  const created = createCapabilityBundle(sourceRoot);
  fs.writeFileSync(path.join(destination, BUNDLE_NAME), created.bundle);
  fs.writeFileSync(path.join(destination, BUNDLE_DIGEST_NAME), rawDigest(created.bundle) + '  ' + BUNDLE_NAME + '\n');
  fs.writeFileSync(path.join(destination, MANIFEST_NAME), created.manifest, 'utf8');
  fs.writeFileSync(path.join(destination, 'SNAPSHOT.json'), JSON.stringify(created.snapshot, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(destination, 'LICENSE'), created.license);
}

export function readAndVerifyCapabilityBundle(bundleRoot) {
  const root = path.resolve(bundleRoot);
  const bundlePath = path.join(root, BUNDLE_NAME);
  const bundle = readBoundedFile(bundlePath, MAX_COMPRESSED_BYTES, 'Capability bundle');
  const digestLine = readBoundedFile(
    path.join(root, BUNDLE_DIGEST_NAME), 1024, 'Capability bundle digest'
  ).toString('utf8').trim();
  if (digestLine !== rawDigest(bundle) + '  ' + BUNDLE_NAME) {
    throw new Error('Capability bundle does not match ' + BUNDLE_DIGEST_NAME + '.');
  }
  let unpackedBuffer;
  try {
    unpackedBuffer = zlib.gunzipSync(bundle, { maxOutputLength: MAX_UNCOMPRESSED_BYTES });
  } catch (error) {
    throw new Error('Capability bundle decompression failed or exceeded its limit: ' + error.message);
  }
  const unpacked = JSON.parse(unpackedBuffer.toString('utf8'));
  if (unpacked.schema_version !== '1.0' || !Array.isArray(unpacked.files)) {
    throw new Error('Capability bundle schema is invalid.');
  }
  if (unpacked.files.length > MAX_FILES) {
    throw new Error('Capability bundle exceeds the maximum file count.');
  }
  const manifest = parseManifest(readBoundedFile(
    path.join(root, MANIFEST_NAME), MAX_METADATA_BYTES, 'Capability manifest'
  ).toString('utf8'));
  if (manifest.size > MAX_FILES) {
    throw new Error('Capability manifest exceeds the maximum file count.');
  }
  const files = new Map();
  let decodedBytes = 0;
  for (const entry of unpacked.files) {
    if (!safeBundlePath(entry?.path) || files.has(entry.path)) {
      throw new Error('Capability bundle contains an unsafe or duplicate path.');
    }
    if (typeof entry.content_base64 !== 'string' ||
        entry.content_base64.length > Math.ceil(MAX_FILE_BYTES / 3) * 4 + 4 ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(entry.content_base64)) {
      throw new Error('Capability bundle contains invalid or oversized base64 content: ' + entry.path);
    }
    const contents = Buffer.from(entry.content_base64, 'base64');
    if (contents.length > MAX_FILE_BYTES || contents.toString('base64') !== entry.content_base64) {
      throw new Error('Capability bundle file exceeds its limit or is not canonical base64: ' + entry.path);
    }
    decodedBytes += contents.length;
    if (decodedBytes > MAX_UNCOMPRESSED_BYTES) {
      throw new Error('Capability bundle files exceed the total decoded size limit.');
    }
    if (normalizedDigest(contents) !== manifest.get(entry.path)) {
      throw new Error('Capability bundle file does not match manifest: ' + entry.path);
    }
    files.set(entry.path, contents);
  }
  if (files.size !== manifest.size || [...manifest.keys()].some((file) => !files.has(file))) {
    throw new Error('Capability bundle and manifest file lists differ.');
  }
  if (!files.has('SNAPSHOT.json') || !files.has('LICENSE')) {
    throw new Error('Capability bundle must contain SNAPSHOT.json and LICENSE.');
  }
  const snapshot = JSON.parse(files.get('SNAPSHOT.json').toString('utf8'));
  if (snapshot.ref !== unpacked.ref || snapshot.snapshot !== unpacked.snapshot) {
    throw new Error('Capability bundle provenance is inconsistent.');
  }
  const externalSnapshot = JSON.parse(readBoundedFile(
    path.join(root, 'SNAPSHOT.json'), MAX_METADATA_BYTES, 'Capability snapshot metadata'
  ).toString('utf8'));
  const externalLicense = readBoundedFile(
    path.join(root, 'LICENSE'), MAX_METADATA_BYTES, 'Capability license'
  );
  if (JSON.stringify(externalSnapshot) !== JSON.stringify(snapshot)) {
    throw new Error('External SNAPSHOT.json does not match the bundled provenance.');
  }
  if (normalizedDigest(externalLicense) !== normalizedDigest(files.get('LICENSE'))) {
    throw new Error('External LICENSE does not match the bundled license.');
  }
  verifyPinnedSkillTrees(files, snapshot);
  return { root, files, snapshot };
}

function itemPrefix(item) {
  return item.path.replace(/\/$/, '') + '/';
}

function projectInstallDestination(projectInput, capabilityId) {
  const projectRoot = fs.realpathSync(path.resolve(projectInput));
  const configPath = path.join(projectRoot, '.accord', 'accord.yaml');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const installRoot = config.capabilities?.install_root;
  if (typeof installRoot !== 'string' ||
      path.normalize(installRoot).split(path.sep).join('/') !== '.agents/skills') {
    throw new Error('Project capabilities.install_root must be .agents/skills.');
  }
  const destination = path.resolve(projectRoot, installRoot, capabilityId);
  const relation = path.relative(projectRoot, destination);
  if (!relation || relation === '..' || relation.startsWith('..' + path.sep) || path.isAbsolute(relation)) {
    throw new Error('Capability destination escapes the project root.');
  }
  let cursor = projectRoot;
  for (const segment of installRoot.split('/')) {
    cursor = path.join(cursor, segment);
    if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink()) {
      throw new Error('Capability install path must not traverse a symbolic link: ' + cursor);
    }
  }
  return { projectRoot, installRoot, destination };
}

export function previewCapability(bundleRoot, capabilityId, projectInput) {
  const verified = readAndVerifyCapabilityBundle(bundleRoot);
  const item = verified.snapshot.items.find((candidate) => candidate.id === capabilityId);
  if (!item) {
    throw new Error('Unknown bundled capability: ' + capabilityId);
  }
  if (item.kind !== 'skill') {
    throw new Error('Bundled plugins require an Agent-specific reviewed installer; direct Skill materialization is not supported: ' + capabilityId);
  }
  const target = projectInstallDestination(projectInput, capabilityId);
  const prefix = itemPrefix(item);
  const files = [...verified.files.keys()]
    .filter((file) => file.startsWith(prefix))
    .map((file) => file.slice(prefix.length));
  return {
    id: item.id,
    kind: item.kind,
    source_path: item.path,
    ref: verified.snapshot.ref,
    license: verified.snapshot.license,
    project_root: target.projectRoot,
    destination: target.destination,
    files
  };
}

export function materializeCapability(bundleRoot, capabilityId, projectInput, options = {}) {
  if (options.approved !== true) {
    throw new Error('Materialization requires explicit user approval.');
  }
  const preview = previewCapability(bundleRoot, capabilityId, projectInput);
  if (fs.existsSync(preview.destination)) {
    throw new Error('Destination already exists; refusing to overwrite: ' + preview.destination);
  }
  const verified = readAndVerifyCapabilityBundle(bundleRoot);
  const prefix = preview.source_path.replace(/\/$/, '') + '/';
  const installRoot = path.dirname(preview.destination);
  fs.mkdirSync(installRoot, { recursive: true });
  if (fs.lstatSync(installRoot).isSymbolicLink()) {
    throw new Error('Capability install root must not be a symbolic link.');
  }
  const temporary = fs.mkdtempSync(path.join(installRoot, '.accord-' + capabilityId + '-'));
  try {
    for (const relativePath of preview.files) {
      const output = path.join(temporary, ...relativePath.split('/'));
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, verified.files.get(prefix + relativePath));
    }
    if (!fs.existsSync(path.join(temporary, 'LICENSE'))) {
      fs.writeFileSync(path.join(temporary, 'LICENSE'), verified.files.get('LICENSE'));
    }
    fs.writeFileSync(
      path.join(temporary, 'ACCORD-SNAPSHOT.json'),
      JSON.stringify({
        source: verified.snapshot.repository,
        ref: verified.snapshot.ref,
        path: preview.source_path,
        license: verified.snapshot.license
      }, null, 2) + '\n',
      'utf8'
    );
    if (!fs.existsSync(path.join(temporary, 'SKILL.md'))) {
      throw new Error('Materialized capability has no SKILL.md: ' + capabilityId);
    }
    fs.renameSync(temporary, preview.destination);
  } catch (error) {
    fs.rmSync(temporary, { recursive: true, force: true });
    throw error;
  }
  return preview;
}

function usage() {
  console.log('Usage:');
  console.log('  node accord-capability-bundle.mjs --verify <bundle-directory>');
  console.log('  node accord-capability-bundle.mjs --list <bundle-directory>');
  console.log('  node accord-capability-bundle.mjs --preview <bundle-directory> <capability-id> --project <project-root>');
  console.log('  node accord-capability-bundle.mjs --materialize <bundle-directory> <capability-id> --project <project-root> --approved');
}

function main(argv) {
  const [mode, bundleRoot, capabilityId] = argv;
  if (!mode || mode === '--help' || mode === '-h') {
    usage();
    return;
  }
  if (mode === '--verify') {
    const verified = readAndVerifyCapabilityBundle(bundleRoot);
    console.log('Verified ' + verified.files.size + ' bundled capability source files.');
    return;
  }
  if (mode === '--list') {
    const verified = readAndVerifyCapabilityBundle(bundleRoot);
    console.log(JSON.stringify(verified.snapshot.items.map(
      ({ id, kind, path: sourcePath }) => ({ id, kind, source_path: sourcePath })
    ), null, 2));
    return;
  }
  if (mode === '--preview') {
    const projectIndex = argv.indexOf('--project');
    if (projectIndex < 0 || !argv[projectIndex + 1]) {
      throw new Error('Preview requires --project <project-root>.');
    }
    console.log(JSON.stringify(previewCapability(bundleRoot, capabilityId, argv[projectIndex + 1]), null, 2));
    return;
  }
  if (mode === '--materialize') {
    if (!argv.includes('--approved')) {
      throw new Error('Materialization requires explicit user approval and the --approved flag.');
    }
    const projectIndex = argv.indexOf('--project');
    if (projectIndex < 0 || !argv[projectIndex + 1]) {
      throw new Error('Materialization requires --project <project-root>.');
    }
    console.log(JSON.stringify(
      materializeCapability(bundleRoot, capabilityId, argv[projectIndex + 1], { approved: true }),
      null,
      2
    ));
    return;
  }
  throw new Error('Unknown mode: ' + mode);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error('ERROR: ' + error.message);
    process.exitCode = 1;
  }
}
