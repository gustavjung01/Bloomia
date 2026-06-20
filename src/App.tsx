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
      <Page />
    </AppLayout>
  );
}
