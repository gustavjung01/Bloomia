import { useEffect, useMemo, useRef, useState } from 'react';

import {
  getCachedBankDirectoryTimestamp,
  loadVietnamBanks,
  type VietnamBankRecord,
} from '../../services/payment/vietnamBankDirectoryService';

interface VietnamBankPickerProps {
  bankName: string;
  bankCode: string;
  bankBin: string;
  onSelect: (bank: VietnamBankRecord) => void;
}

export function VietnamBankPicker({ bankName, bankCode, bankBin, onSelect }: VietnamBankPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [banks, setBanks] = useState<VietnamBankRecord[]>([]);
  const [query, setQuery] = useState(bankName || bankCode || bankBin);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cacheTimestamp, setCacheTimestamp] = useState<string | null>(null);

  useEffect(() => {
    setQuery(bankName || bankCode || bankBin);
  }, [bankName, bankCode, bankBin]);

  useEffect(() => {
    void refresh(false);
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const filteredBanks = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    const rows = normalizedQuery
      ? banks.filter((bank) => [bank.shortName, bank.name, bank.code, bank.bin].some((value) => normalizeSearch(value).includes(normalizedQuery)))
      : banks;
    return rows.slice(0, 80);
  }, [banks, query]);

  const selectedBank = useMemo(
    () => banks.find((bank) => bank.bin === bankBin || bank.code.toLowerCase() === bankCode.toLowerCase()) ?? null,
    [banks, bankBin, bankCode],
  );

  async function refresh(forceRefresh: boolean) {
    try {
      setLoading(true);
      setError('');
      const rows = await loadVietnamBanks(forceRefresh);
      setBanks(rows);
      setCacheTimestamp(getCachedBankDirectoryTimestamp());
    } catch (caught) {
      console.error(caught);
      setError('Không tải được danh mục ngân hàng VietQR. Kiểm tra Internet rồi thử lại.');
    } finally {
      setLoading(false);
    }
  }

  function selectBank(bank: VietnamBankRecord) {
    if (!bank.transferSupported) return;
    onSelect(bank);
    setQuery(bank.shortName);
    setOpen(false);
    setError('');
  }

  return (
    <div className="bank-picker" ref={containerRef}>
      <label htmlFor="vietqr-bank-search">Ngân hàng nhận tiền</label>
      <div className={`bank-picker-control${open ? ' is-open' : ''}`}>
        {selectedBank?.logo ? <img src={selectedBank.logo} alt="" aria-hidden="true" /> : <span className="bank-picker-monogram">₫</span>}
        <input
          id="vietqr-bank-search"
          value={query}
          placeholder={loading ? 'Đang tải danh mục ngân hàng...' : 'Tìm Sacombank, STB hoặc 970403...'}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
        />
        <button type="button" className="bank-picker-toggle" onClick={() => setOpen((current) => !current)} aria-label="Mở danh sách ngân hàng">⌄</button>
      </div>

      {open && (
        <div className="bank-picker-menu" role="listbox" aria-label="Danh sách ngân hàng Việt Nam">
          <div className="bank-picker-menu-header">
            <span>{loading ? 'Đang tải...' : `${filteredBanks.length}/${banks.length} ngân hàng`}</span>
            <button type="button" onClick={() => void refresh(true)}>Cập nhật danh mục</button>
          </div>
          <div className="bank-picker-options">
            {!loading && filteredBanks.length === 0 && <p>Không tìm thấy ngân hàng phù hợp.</p>}
            {filteredBanks.map((bank) => (
              <button
                type="button"
                role="option"
                aria-selected={bank.bin === bankBin}
                className={`bank-picker-option${bank.transferSupported ? '' : ' is-unsupported'}${bank.bin === bankBin ? ' is-selected' : ''}`}
                key={`${bank.bin}-${bank.code}`}
                disabled={!bank.transferSupported}
                onClick={() => selectBank(bank)}
              >
                <span className="bank-picker-logo">{bank.logo ? <img src={bank.logo} alt="" /> : bank.shortName.slice(0, 2)}</span>
                <span className="bank-picker-copy">
                  <strong>{bank.shortName}</strong>
                  <span>{bank.name}</span>
                  <small>{bank.code} • BIN {bank.bin}</small>
                </span>
                <span className={`bank-picker-support${bank.transferSupported ? ' is-supported' : ''}`}>
                  {bank.transferSupported ? 'Có QR' : 'Chưa hỗ trợ chuyển khoản'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bank-picker-meta">
        {selectedBank ? (
          <span>Đã chọn: {selectedBank.shortName} • {selectedBank.code} • BIN {selectedBank.bin}</span>
        ) : (
          <span>Chọn ngân hàng để tự điền BIN và mã ngân hàng.</span>
        )}
        {cacheTimestamp && <span>Danh mục cập nhật {new Date(cacheTimestamp).toLocaleDateString('vi-VN')}</span>}
      </div>
      {error && <p className="bank-picker-error">{error}</p>}
    </div>
  );
}

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi-VN')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
