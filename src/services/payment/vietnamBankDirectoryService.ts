const BANKS_ENDPOINT = 'https://api.vietqr.io/v2/banks';
const CACHE_KEY = 'bloomia:vietqr-bank-directory:v1';
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface VietnamBankRecord {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
  transferSupported: boolean;
  lookupSupported: boolean;
}

interface VietQrBankApiRecord {
  id?: number;
  name?: string;
  code?: string;
  bin?: string;
  shortName?: string;
  short_name?: string;
  logo?: string;
  transferSupported?: number;
  lookupSupported?: number;
  isTransfer?: number;
}

interface BankDirectoryCache {
  fetchedAt: string;
  banks: VietnamBankRecord[];
}

export async function loadVietnamBanks(forceRefresh = false): Promise<VietnamBankRecord[]> {
  const cached = readCache();
  const cacheFresh = cached && Date.now() - new Date(cached.fetchedAt).getTime() < CACHE_MAX_AGE_MS;
  if (!forceRefresh && cacheFresh && cached.banks.length > 0) return cached.banks;

  try {
    const response = await fetch(BANKS_ENDPOINT, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`VietQR bank directory HTTP ${response.status}`);
    const payload = await response.json() as { data?: VietQrBankApiRecord[] };
    const banks = normalizeBanks(payload.data ?? []);
    if (banks.length === 0) throw new Error('VietQR bank directory returned no banks.');
    writeCache({ fetchedAt: new Date().toISOString(), banks });
    return banks;
  } catch (error) {
    if (cached?.banks.length) return cached.banks;
    throw error;
  }
}

export function getCachedBankDirectoryTimestamp() {
  return readCache()?.fetchedAt ?? null;
}

function normalizeBanks(rows: VietQrBankApiRecord[]) {
  return rows
    .map((row): VietnamBankRecord | null => {
      const code = String(row.code ?? '').trim();
      const bin = String(row.bin ?? '').trim();
      const shortName = String(row.shortName ?? row.short_name ?? code).trim();
      const name = String(row.name ?? shortName).trim();
      if (!code || !bin || !name) return null;
      return {
        id: Number(row.id ?? 0),
        name,
        code,
        bin,
        shortName,
        logo: String(row.logo ?? '').trim(),
        transferSupported: Number(row.transferSupported ?? row.isTransfer ?? 0) === 1,
        lookupSupported: Number(row.lookupSupported ?? 0) === 1,
      };
    })
    .filter((bank): bank is VietnamBankRecord => Boolean(bank))
    .sort((left, right) => {
      if (left.transferSupported !== right.transferSupported) return left.transferSupported ? -1 : 1;
      return left.shortName.localeCompare(right.shortName, 'vi');
    });
}

function readCache(): BankDirectoryCache | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BankDirectoryCache;
    return Array.isArray(parsed.banks) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(cache: BankDirectoryCache) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Cache failure must not block bank selection.
  }
}
