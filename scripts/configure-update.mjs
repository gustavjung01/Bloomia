import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

readEnv('.env');
readEnv('.env.release');

const path = resolve('src-tauri', 'tauri.conf.json');
const json = JSON.parse(readFileSync(path, 'utf8'));
const endpoint = process.env.BLOOMIA_UPDATE_ENDPOINT || process.env.VITE_BLOOMIA_UPDATE_ENDPOINT || 'https://example.com/bloomia/latest.json';
const pubkey = normalizeUpdaterPublicKey(process.env.BLOOMIA_UPDATE_PUBLIC_KEY);

json.plugins = json.plugins || {};
json.plugins.updater = { endpoints: [endpoint], pubkey };

writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
console.log(`Update feed: ${endpoint}`);

function normalizeUpdaterPublicKey(value) {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error('Invalid updater public key. Expected base64 minisign public key content.');
  }
  if (trimmed.includes('your-public-key') || trimmed.includes('CHANGE_ME_BEFORE_RELEASE')) {
    throw new Error('Invalid updater public key. Expected base64 minisign public key content.');
  }

  if (existsSync(trimmed)) {
    return readFileSync(trimmed, 'utf8').trim();
  }

  if (looksLikeBase64(trimmed)) {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8').trim();
    if (hasMinisignPublicLine(decoded)) {
      return trimmed;
    }
  }

  if (hasMinisignPublicLine(trimmed)) {
    if (trimmed.includes('\n') || trimmed.includes('untrusted comment:')) {
      return Buffer.from(trimmed, 'utf8').toString('base64');
    }

    const fallback = readCanonicalPublicKeyFile();
    if (fallback) return fallback;
  }

  const fallback = readCanonicalPublicKeyFile();
  if (fallback) return fallback;

  throw new Error('Invalid updater public key. Expected base64 minisign public key content.');
}

function looksLikeBase64(value) {
  return value.length >= 32 && value.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(value);
}

function hasMinisignPublicLine(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line.startsWith('RW'));
}

function readCanonicalPublicKeyFile() {
  const canonicalPath = resolve(process.env.USERPROFILE ?? '', '.tauri', 'bloomia.key.pub');
  if (!existsSync(canonicalPath)) return '';
  return readFileSync(canonicalPath, 'utf8').trim();
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
