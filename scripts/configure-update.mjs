import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

readEnv('.env');
readEnv('.env.release');

const path = resolve('src-tauri', 'tauri.conf.json');
const json = JSON.parse(readFileSync(path, 'utf8'));
const endpoint = process.env.BLOOMIA_UPDATE_ENDPOINT || process.env.VITE_BLOOMIA_UPDATE_ENDPOINT || 'https://example.com/bloomia/latest.json';
const pubkey = process.env.BLOOMIA_UPDATE_PUBLIC_KEY || 'CHANGE_ME_BEFORE_RELEASE';

json.plugins = json.plugins || {};
json.plugins.updater = { endpoints: [endpoint], pubkey };

writeFileSync(path, `${JSON.stringify(json, null, 2)}\n`);
console.log(`Update feed: ${endpoint}`);

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
