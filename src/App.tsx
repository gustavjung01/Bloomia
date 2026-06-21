import { useEffect, useMemo, useState } from 'react';

import { AppLayout } from './app/AppLayout';
import { routes, type RouteKey } from './app/routes';
import { bootstrapLocalDatabase } from './services/appBootstrap';

export function App() {
  const [activeRoute, setActiveRoute] = useState<RouteKey>('dashboard');
  const [databaseStatus, setDatabaseStatus] = useState<'idle' | 'ready' | 'error'>('idle');

  useEffect(() => {
    let isMounted = true;

    bootstrapLocalDatabase()
      .then(() => {
        if (isMounted) {
          setDatabaseStatus('ready');
        }
      })
      .catch((error: unknown) => {
        console.error('Bloomia database bootstrap failed', error);
        if (isMounted) {
          setDatabaseStatus('error');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const route = useMemo(() => routes.find((item) => item.key === activeRoute) ?? routes[0], [activeRoute]);
  const Page = route.component;

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
          <p className="setup-muted">Hãy đóng app, mở lại. Nếu vẫn lỗi, vào System tab sau khi sửa runtime để kiểm tra AppData và file bloomia.db.</p>
        </div>
      )}
    </AppLayout>
  );
}
