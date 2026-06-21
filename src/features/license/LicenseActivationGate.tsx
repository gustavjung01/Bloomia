import { useMemo, useState, type FormEvent } from 'react';

import bloomiaMonogram from '../../assets/bloomia-monogram.svg';
import type { BloomiaMachineIdentity } from '../../services/licenseService';

interface LicenseActivationGateProps {
  mode: 'checking' | 'activation';
  machineIdentity: BloomiaMachineIdentity | null;
  busy: boolean;
  message: string;
  onActivate: (licenseKey: string) => Promise<void>;
}

export function LicenseActivationGate({ mode, machineIdentity, busy, message, onActivate }: LicenseActivationGateProps) {
  const [licenseKey, setLicenseKey] = useState('');
  const normalizedKey = useMemo(() => licenseKey.trim().toUpperCase().replace(/\s+/g, ''), [licenseKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!normalizedKey || busy || mode === 'checking') return;
    await onActivate(normalizedKey);
  }

  return (
    <main className="license-shell">
      <section className="license-card" aria-live="polite">
        <span className="license-art license-art-top" aria-hidden="true" />
        <span className="license-art license-art-bottom" aria-hidden="true" />
        <span className="license-petal license-petal-one" aria-hidden="true" />
        <span className="license-petal license-petal-two" aria-hidden="true" />
        <span className="license-petal license-petal-three" aria-hidden="true" />

        <header className="license-heading">
          <div className="license-logo-wrap">
            <img src={bloomiaMonogram} alt="Bloomia" />
          </div>
          <div>
            <span className="license-kicker">Bloomia Studio POS</span>
            <h1>Chào mừng đến với Bloomia</h1>
          </div>
        </header>

        <p className="license-intro">
          Một không gian nhỏ xinh để bán hoa, giữ đơn, chăm kho và nâng niu từng khách hàng của tiệm.
        </p>

        {mode === 'checking' ? (
          <div className="license-checking-panel">
            <span className="license-spinner" aria-hidden="true" />
            <strong>Đang kiểm tra giấy phép trên máy này</strong>
            <p>Bloomia sẽ mở không gian làm việc ngay khi xác minh hoàn tất.</p>
          </div>
        ) : (
          <form className="license-form" onSubmit={handleSubmit}>
            <label htmlFor="bloomia-license-key">License key</label>
            <div className="license-input-wrap">
              <span aria-hidden="true">✦</span>
              <input
                id="bloomia-license-key"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                inputMode="text"
                placeholder="BLM-XXXX-XXXX-XXXX-XXXX"
                value={licenseKey}
                onChange={(event) => setLicenseKey(event.target.value.toUpperCase())}
                disabled={busy}
              />
            </div>

            <div className="license-device-card">
              <div>
                <span>Thiết bị kích hoạt</span>
                <strong>{machineIdentity?.deviceName || 'Đang nhận diện máy…'}</strong>
              </div>
              <code>{machineIdentity?.shortId || 'BLM-…'}</code>
            </div>

            <p className="license-binding-note">
              Key sẽ được gắn cố định với ID máy này sau lần kích hoạt đầu tiên. Đổi máy cần được hỗ trợ reset trên hệ thống bán hàng.
            </p>

            {message && <div className="license-message" role="alert">{message}</div>}

            <button className="license-submit" type="submit" disabled={busy || !normalizedKey || !machineIdentity}>
              {busy ? <span className="license-spinner license-spinner-small" aria-hidden="true" /> : <span aria-hidden="true">✿</span>}
              {busy ? 'Đang kích hoạt…' : 'Kích hoạt Bloomia'}
            </button>
          </form>
        )}

        <footer className="license-footer">
          <span>Giấy phép có thời hạn</span>
          <span aria-hidden="true">•</span>
          <span>Một máy cho mỗi key</span>
          <span aria-hidden="true">•</span>
          <span>Dữ liệu luôn nằm trên máy của anh/chị</span>
        </footer>
      </section>
    </main>
  );
}
