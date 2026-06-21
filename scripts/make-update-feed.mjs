import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

readEnv('.env');
readEnv('.env.release');

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = process.env.BLOOMIA_RELEASE_VERSION || pkg.version;
const notes = process.env.BLOOMIA_RELEASE_NOTES || `Bloomia ${version}`;
const baseUrl = requireValue('BLOOMIA_R2_BASE_URL').replace(/\/$/, '');
const target = process.env.BLOOMIA_RELEASE_TARGET || 'windows-x86_64';
const bundleDir = resolve('src-tauri', 'target', 'release', 'bundle', 'nsis');
const outDir = resolve('release');
mkdirSync(outDir, { recursive: true });

const exePath = findFirst(bundleDir, '.exe');
const zipPath = findFirst(bundleDir, '.zip');
const sigPath = `${zipPath}.sig`;
if (!existsSync(exePath)) throw new Error(`Missing installer file: ${exePath}`);
if (!existsSync(sigPath)) throw new Error(`Missing signature file: ${sigPath}`);

const exeName = basename(exePath);
const zipName = basename(zipPath);
const sigName = basename(sigPath);
const manifest = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms: {
    [target]: {
      signature: readFileSync(sigPath, 'utf8').trim(),
      url: `${baseUrl}/${target}/${zipName}`,
    },
  },
};

writeFileSync(join(outDir, 'latest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(
  join(outDir, 'upload-plan.txt'),
  [
    `upload ${exePath} -> ${baseUrl}/downloads/${exeName}`,
    `upload ${zipPath} -> ${baseUrl}/${target}/${zipName}`,
    `upload ${sigPath} -> ${baseUrl}/${target}/${sigName}`,
    `upload ${join(outDir, 'latest.json')} -> ${baseUrl}/latest.json`,
  ].join('\n'),
);
console.log('Update feed generated at release/latest.json');

function findFirst(dir, suffix) {
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    if (!current || !existsSync(current)) continue;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const p = join(current, entry.name);
      if (entry.isDirectory()) stack.push(p);
      else if (entry.name.endsWith(suffix)) return p;
    }
  }
  throw new Error(`No ${suffix} file found under ${dir}`);
}

function requireValue(key) {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function readEnv(name) {
  if (!existsSync(name)) return;
  for (const line of readFileSync(name, 'utf8').split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith('#')) continue;
    const i = text.indexOf('=');
    if (i < 0) continue;
    const key = text.slice(0, i).trim();
    const value = text.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}
