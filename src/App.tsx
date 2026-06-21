import { useEffect, useMemo, useState } from 'react';

import { AppLayout } from './app/AppLayout';
import { routes, type RouteKey } from './app/routes';
import { Button } from './components/ui';
import { bootstrapLocalDatabase } from './services/appBootstrap';

export function App() {
  const [activeRoute, setActiveRoute] = useState<RouteKey>('dashboard');
  const [databaseStatus, setDatabaseStatus] = useState<'idle' | 'ready' | 'error'>('idle');
  const [databaseError, setDatabaseError] = useState('');
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);

  useEffect(() => {
    let isMounted = true;

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
  }, [bootstrapAttempt]);

  const route = useMemo(() => routes.find((item) => item.key === activeRoute) ?? routes[0], [activeRoute]);
  const Page = route.component;

  function retryDatabaseBootstrap() {
    setDatabaseError('');
    setDatabaseStatus('idle');
    setBootstrapAttempt((current) => current + 1);
  }

  return (
    <AppLayout activeRoute={activeRoute} onRouteChange={setActiveRoute} routeTitle={route.label} databaseStatus={databaseStatus}>
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
