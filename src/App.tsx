import { useEffect, useMemo, useState } from 'react';

import { AppLayout } from './app/AppLayout';
import { routes, type RouteKey } from './app/routes';
import { Button } from './components/ui';
import { LicenseActivationGate } from './features/license/LicenseActivationGate';
import { bootstrapLocalDatabase } from './services/appBootstrap';
import {
  activateBloomiaLicense,
  buildBloomiaMachineIdentity,
  canUseSignedOfflineLease,
  clearBloomiaLicenseCache,
  friendlyLicenseError,
  isNetworkLicenseError,
  loadBloomiaLicenseCache,
  saveBloomiaLicenseCache,
  showActivationWindow,
  showMainBloomiaWindow,
  verifyBloomiaLicense,
  type BloomiaMachineIdentity,
} from './services/licenseService';

type LicenseStage = 'checking' | 'activation' | 'active' | 'offline_grace';

export function App() {
  const [activeRoute, setActiveRoute] = useState<RouteKey>('dashboard');
  const [databaseStatus, setDatabaseStatus] = useState<'idle' | 'ready' | 'error'>('idle');
  const [databaseError, setDatabaseError] = useState('');
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const [licenseStage, setLicenseStage] = useState<LicenseStage>('checking');
  const [machineIdentity, setMachineIdentity] = useState<BloomiaMachineIdentity | null>(null);
  const [licenseMessage, setLicenseMessage] = useState('');
  const [licenseBusy, setLicenseBusy] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function prepareLicense() {
      await showActivationWindow();
      const identity = await buildBloomiaMachineIdentity();
      if (!isMounted) return;
      setMachineIdentity(identity);

      const cached = loadBloomiaLicenseCache();
      if (!cached) {
        setLicenseStage('activation');
        return;
      }

      if (cached.machineId !== identity.machineId) {
        clearBloomiaLicenseCache();
        setLicenseMessage('License cũ không thuộc ID máy hiện tại. Vui lòng nhập key để kích hoạt máy này.');
        setLicenseStage('activation');
        return;
      }

      try {
        const verified = await verifyBloomiaLicense(cached, identity);
        saveBloomiaLicenseCache(verified);
        await showMainBloomiaWindow();
        if (isMounted) setLicenseStage('active');
      } catch (error) {
        if (isNetworkLicenseError(error) && await canUseSignedOfflineLease(cached, identity)) {
          await showMainBloomiaWindow();
          if (isMounted) setLicenseStage('offline_grace');
          return;
        }

        if (!isNetworkLicenseError(error)) {
          clearBloomiaLicenseCache();
        }
        if (isMounted) {
          setLicenseMessage(friendlyLicenseError(error));
          setLicenseStage('activation');
        }
      }
    }

    void prepareLicense().catch((error) => {
      if (!isMounted) return;
      setLicenseMessage(friendlyLicenseError(error));
      setLicenseStage('activation');
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (licenseStage !== 'active' && licenseStage !== 'offline_grace') return;

    let isMounted = true;
    setDatabaseStatus('idle');

    bootstrapLocalDatabase()
      .then(() => {
        if (isMounted) {
          setDatabaseError('');
          setDatabaseStatus('ready');
        }
      })
      .catch((error: unknown) => {
        console.error('Bloomia database bootstrap failed', error);
        if (isMounted) {
          setDatabaseError(errorMessage(error));
          setDatabaseStatus('error');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [bootstrapAttempt, licenseStage]);

  const route = useMemo(() => routes.find((item) => item.key === activeRoute) ?? routes[0], [activeRoute]);
  const Page = route.component;

  async function handleActivateLicense(licenseKey: string) {
    if (!machineIdentity || licenseBusy) return;

    try {
      setLicenseBusy(true);
      setLicenseMessage('');
      const activated = await activateBloomiaLicense(licenseKey, machineIdentity);
      saveBloomiaLicenseCache(activated);
      await showMainBloomiaWindow();
      setLicenseStage('active');
    } catch (error) {
      setLicenseMessage(friendlyLicenseError(error));
    } finally {
      setLicenseBusy(false);
    }
  }

  function retryDatabaseBootstrap() {
    setDatabaseError('');
    setDatabaseStatus('idle');
    setBootstrapAttempt((current) => current + 1);
  }

  if (licenseStage === 'checking' || licenseStage === 'activation') {
    return (
      <LicenseActivationGate
        mode={licenseStage === 'checking' ? 'checking' : 'activation'}
        machineIdentity={machineIdentity}
        busy={licenseBusy}
        message={licenseMessage}
        onActivate={handleActivateLicense}
      />
    );
  }

  return (
    <AppLayout activeRoute={activeRoute} onRouteChange={setActiveRoute} routeTitle={route.label} databaseStatus={databaseStatus}>
      {licenseStage === 'offline_grace' && (
        <div className="license-offline-notice">
          Bloomia đang dùng giấy phép ngoại tuyến có chữ ký. Hãy kết nối Internet trước khi thời gian dự phòng kết thúc.
        </div>
      )}
      {databaseStatus === 'ready' && <Page />}
      {databaseStatus === 'idle' && (
        <div className="glass-card">
          <span className="eyebrow">Đang chuẩn bị dữ liệu</span>
          <h2>Bloomia đang kiểm tra SQLite local</h2>
          <p className="setup-muted">App đang chạy migration và seed cấu hình mặc định trước khi mở màn hình thao tác.</p>
        </div>
      )}
      {databaseStatus === 'error' && (
        <div className="glass-card">
          <span className="eyebrow">Lỗi dữ liệu</span>
          <h2>Không khởi tạo được SQLite local</h2>
          <p className="setup-muted">Bloomia chưa thay đổi hoặc xóa dữ liệu. Hãy thử khởi tạo lại; nếu vẫn lỗi, gửi nội dung kỹ thuật bên dưới để kiểm tra chính xác.</p>
          {databaseError && (
            <pre style={{ margin: '16px 0', overflow: 'auto', padding: 16, whiteSpace: 'pre-wrap' }}>{databaseError}</pre>
          )}
          <Button onClick={retryDatabaseBootstrap}>Thử khởi tạo lại</Button>
        </div>
      )}
    </AppLayout>
  );
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return 'Unknown SQLite bootstrap error';
  }
}
