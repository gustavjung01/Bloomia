import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

export const BLOOMIA_LICENSE_APP_ID = 'app-bloomia-pos';

const LICENSE_CACHE_KEY = 'bloomia.license.cache.v1';
const DEVICE_SEED_KEY = 'bloomia.device.seed.v1';
const DEFAULT_API_BASE_URL = 'https://ungdungthongminh.shop';
const API_BASE_URL = String(import.meta.env.VITE_BLOOMIA_LICENSE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
const DEV_LICENSE_KEY = String(import.meta.env.VITE_BLOOMIA_DEV_LICENSE_KEY || '').trim().toUpperCase();
const OFFLINE_PUBLIC_KEY = String(import.meta.env.VITE_BLOOMIA_LICENSE_PUBLIC_KEY || '').trim();
const REQUEST_TIMEOUT_MS = 12_000;

interface BloomiaAppStatus {
  app_data_dir: string;
  app_version: string;
}

export interface BloomiaMachineIdentity {
  machineId: string;
  shortId: string;
  deviceName: string;
  appVersion: string;
}

export interface BloomiaLicenseCache {
  activationToken: string;
  licenseId: string | null;
  maskedKey: string;
  machineId: string;
  status: string;
  expiresAt: string | null;
  offlineUntil: string | null;
  offlineLease: string | null;
  lastVerifiedAt: string;
  planCode: string | null;
}

export class BloomiaLicenseError extends Error {
  readonly code: string;
  readonly network: boolean;
  readonly httpStatus: number | null;

  constructor(message: string, options: { code?: string; network?: boolean; httpStatus?: number | null } = {}) {
    super(message);
    this.name = 'BloomiaLicenseError';
    this.code = options.code || 'LICENSE_ERROR';
    this.network = Boolean(options.network);
    this.httpStatus = options.httpStatus ?? null;
  }
}

export async function buildBloomiaMachineIdentity(): Promise<BloomiaMachineIdentity> {
  let appDataDir = 'bloomia-local';
  let appVersion = String(import.meta.env.VITE_APP_VERSION || '0.1.0');

  try {
    const status = await invoke<BloomiaAppStatus>('get_bloomia_app_status');
    appDataDir = status.app_data_dir || appDataDir;
    appVersion = status.app_version || appVersion;
  } catch {
    // Browser preview keeps a deterministic local identity without blocking the activation UI.
  }

  const seed = getOrCreateDeviceSeed();
  const source = [
    'com.bloomia.desktop',
    seed,
    appDataDir,
    navigator.platform || 'unknown-platform',
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown-timezone',
  ].join('|');
  const digest = await sha256Hex(source);
  const machineId = `BLM-${digest.slice(0, 32).toUpperCase()}`;
  const deviceName = resolveDeviceName();

  return {
    machineId,
    shortId: `${machineId.slice(0, 12)}…${machineId.slice(-6)}`,
    deviceName,
    appVersion,
  };
}

export function loadBloomiaLicenseCache(): BloomiaLicenseCache | null {
  try {
    const raw = localStorage.getItem(LICENSE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BloomiaLicenseCache>;
    if (!parsed.activationToken || !parsed.machineId || !parsed.status) return null;
    return {
      activationToken: String(parsed.activationToken),
      licenseId: parsed.licenseId ? String(parsed.licenseId) : null,
      maskedKey: String(parsed.maskedKey || 'BLM-••••-••••'),
      machineId: String(parsed.machineId),
      status: String(parsed.status),
      expiresAt: parsed.expiresAt ? String(parsed.expiresAt) : null,
      offlineUntil: parsed.offlineUntil ? String(parsed.offlineUntil) : null,
      offlineLease: parsed.offlineLease ? String(parsed.offlineLease) : null,
      lastVerifiedAt: String(parsed.lastVerifiedAt || new Date(0).toISOString()),
      planCode: parsed.planCode ? String(parsed.planCode) : null,
    };
  } catch {
    return null;
  }
}

export function saveBloomiaLicenseCache(cache: BloomiaLicenseCache) {
  localStorage.setItem(LICENSE_CACHE_KEY, JSON.stringify(cache));
}

export function clearBloomiaLicenseCache() {
  localStorage.removeItem(LICENSE_CACHE_KEY);
}

export async function activateBloomiaLicense(licenseKey: string, identity: BloomiaMachineIdentity): Promise<BloomiaLicenseCache> {
  const normalizedKey = normalizeLicenseKey(licenseKey);
  if (normalizedKey.length < 16) {
    throw new BloomiaLicenseError('Key chưa đúng định dạng. Vui lòng kiểm tra lại mã được cấp.', { code: 'INVALID_KEY_FORMAT' });
  }

  if (import.meta.env.DEV && DEV_LICENSE_KEY && normalizedKey === DEV_LICENSE_KEY) {
    return createDevLicenseCache(normalizedKey, identity);
  }

  const payload = await postLicenseJson('/api/v1/bloomia/licenses/activate', {
    appId: BLOOMIA_LICENSE_APP_ID,
    licenseKey: normalizedKey,
    machineId: identity.machineId,
    deviceName: identity.deviceName,
    appVersion: identity.appVersion,
  });

  return cacheFromApiPayload(payload, identity, normalizedKey);
}

export async function verifyBloomiaLicense(cache: BloomiaLicenseCache, identity: BloomiaMachineIdentity): Promise<BloomiaLicenseCache> {
  if (cache.machineId !== identity.machineId) {
    throw new BloomiaLicenseError('License đã được lưu cho một máy khác.', { code: 'MACHINE_MISMATCH' });
  }

  if (import.meta.env.DEV && DEV_LICENSE_KEY && cache.activationToken.startsWith('dev-preview:')) {
    return { ...cache, status: 'active', lastVerifiedAt: new Date().toISOString() };
  }

  const payload = await postLicenseJson('/api/v1/bloomia/licenses/verify', {
    appId: BLOOMIA_LICENSE_APP_ID,
    activationToken: cache.activationToken,
    machineId: identity.machineId,
    deviceName: identity.deviceName,
    appVersion: identity.appVersion,
  });

  return cacheFromApiPayload(payload, identity, cache.maskedKey, cache.activationToken);
}

export async function canUseSignedOfflineLease(cache: BloomiaLicenseCache, identity: BloomiaMachineIdentity): Promise<boolean> {
  if (!OFFLINE_PUBLIC_KEY || !cache.offlineLease || !cache.offlineUntil) return false;
  if (cache.machineId !== identity.machineId) return false;
  if (new Date(cache.offlineUntil).getTime() <= Date.now()) return false;

  try {
    const [payloadPart, signaturePart] = cache.offlineLease.split('.');
    if (!payloadPart || !signaturePart) return false;

    const publicKeyBytes = base64ToBytes(OFFLINE_PUBLIC_KEY);
    const signatureBytes = base64UrlToBytes(signaturePart);
    const messageBytes = new TextEncoder().encode(payloadPart);
    const key = await crypto.subtle.importKey('raw', toArrayBuffer(publicKeyBytes), 'Ed25519', false, ['verify']);
    const valid = await crypto.subtle.verify('Ed25519', key, toArrayBuffer(signatureBytes), toArrayBuffer(messageBytes));
    if (!valid) return false;

    const lease = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadPart))) as {
      appId?: string;
      machineId?: string;
      offlineUntil?: string;
      expiresAt?: string;
    };
    const leaseDeadline = new Date(lease.offlineUntil || lease.expiresAt || '').getTime();
    return lease.appId === BLOOMIA_LICENSE_APP_ID && lease.machineId === identity.machineId && leaseDeadline > Date.now();
  } catch {
    return false;
  }
}

export async function showActivationWindow() {
  try {
    const currentWindow = getCurrentWindow();
    if (await currentWindow.isMaximized()) {
      await currentWindow.toggleMaximize();
    }
  } catch {
    // Browser preview keeps its current viewport.
  }
}

export async function showMainBloomiaWindow() {
  try {
    const currentWindow = getCurrentWindow();
    if (!(await currentWindow.isMaximized())) {
      await currentWindow.toggleMaximize();
    }
  } catch {
    // Browser preview keeps its current viewport.
  }
}

export function friendlyLicenseError(error: unknown): string {
  if (error instanceof BloomiaLicenseError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Không thể kiểm tra license lúc này. Vui lòng thử lại.';
}

export function isNetworkLicenseError(error: unknown): boolean {
  return error instanceof BloomiaLicenseError && error.network;
}

function normalizeLicenseKey(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

function maskLicenseKey(value: string) {
  const normalized = normalizeLicenseKey(value);
  if (normalized.length < 10) return 'BLM-••••-••••';
  return `${normalized.slice(0, 8)}••••${normalized.slice(-5)}`;
}

function getOrCreateDeviceSeed() {
  const existing = localStorage.getItem(DEVICE_SEED_KEY);
  if (existing) return existing;
  const seed = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(DEVICE_SEED_KEY, seed);
  return seed;
}

function resolveDeviceName() {
  const platform = navigator.platform || 'Windows';
  return platform.length > 80 ? platform.slice(0, 80) : platform;
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function postLicenseJson(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    const success = payload.success === true || payload.ok === true;
    if (!response.ok || !success) {
      const code = String(payload.status || payload.code || `HTTP_${response.status}`);
      const message = String(payload.error || payload.message || messageForCode(code));
      throw new BloomiaLicenseError(message, { code, httpStatus: response.status });
    }
    return payload;
  } catch (error) {
    if (error instanceof BloomiaLicenseError) throw error;
    const message = error instanceof DOMException && error.name === 'AbortError'
      ? 'Máy chủ cấp phép phản hồi quá lâu. Vui lòng kiểm tra mạng và thử lại.'
      : 'Không kết nối được máy chủ cấp phép. Vui lòng kiểm tra Internet.';
    throw new BloomiaLicenseError(message, { code: 'NETWORK_ERROR', network: true });
  } finally {
    window.clearTimeout(timeout);
  }
}

function cacheFromApiPayload(
  payload: Record<string, unknown>,
  identity: BloomiaMachineIdentity,
  keyOrMasked: string,
  fallbackToken = '',
): BloomiaLicenseCache {
  const data = asObject(payload.data);
  const license = asObject(data.license || payload.license || data);
  const activationToken = String(data.activationToken || data.licenseToken || data.sessionToken || fallbackToken || '');
  if (!activationToken) {
    throw new BloomiaLicenseError('Máy chủ chưa trả activation token cho Bloomia.', { code: 'MISSING_ACTIVATION_TOKEN' });
  }

  const status = String(payload.status || data.status || license.status || 'active');
  if (!['active', 'offline_grace'].includes(status)) {
    throw new BloomiaLicenseError(messageForCode(status), { code: status });
  }

  return {
    activationToken,
    licenseId: stringOrNull(license.id || data.licenseId),
    maskedKey: keyOrMasked.includes('•') ? keyOrMasked : maskLicenseKey(keyOrMasked),
    machineId: identity.machineId,
    status,
    expiresAt: stringOrNull(license.expiresAt || data.expiresAt),
    offlineUntil: stringOrNull(data.offlineUntil || asObject(data.grace).offlineUntil),
    offlineLease: stringOrNull(data.offlineLease),
    lastVerifiedAt: String(license.lastVerifiedAt || data.lastVerifiedAt || new Date().toISOString()),
    planCode: stringOrNull(license.planCode || data.planCode),
  };
}

function createDevLicenseCache(key: string, identity: BloomiaMachineIdentity): BloomiaLicenseCache {
  const now = new Date();
  const expires = new Date(now);
  expires.setFullYear(expires.getFullYear() + 1);
  return {
    activationToken: `dev-preview:${identity.machineId}`,
    licenseId: 'dev-preview',
    maskedKey: maskLicenseKey(key),
    machineId: identity.machineId,
    status: 'active',
    expiresAt: expires.toISOString(),
    offlineUntil: expires.toISOString(),
    offlineLease: null,
    lastVerifiedAt: now.toISOString(),
    planCode: 'development',
  };
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringOrNull(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

function messageForCode(code: string) {
  switch (code.toLowerCase()) {
    case 'expired':
    case 'license_expired':
      return 'License Bloomia đã hết hạn. Vui lòng gia hạn để tiếp tục sử dụng.';
    case 'revoked':
    case 'license_revoked':
      return 'License này đã bị thu hồi. Vui lòng liên hệ hỗ trợ.';
    case 'machine_mismatch':
    case 'device_limit_exceeded':
      return 'License đã được kích hoạt trên một máy khác. Việc đổi máy cần được hỗ trợ reset.';
    case 'invalid':
    case 'license_invalid':
      return 'Key không hợp lệ hoặc không thuộc sản phẩm Bloomia.';
    default:
      return 'Không thể xác thực license Bloomia.';
  }
}

function base64ToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function base64UrlToBytes(value: string) {
  return base64ToBytes(value);
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
