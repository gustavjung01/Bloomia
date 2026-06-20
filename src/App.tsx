import { useMemo, useState } from 'react';

import { AppLayout } from './app/AppLayout';
import { routes, type RouteKey } from './app/routes';

export function App() {
  const [activeRoute, setActiveRoute] = useState<RouteKey>('dashboard');

  const route = useMemo(() => routes.find((item) => item.key === activeRoute) ?? routes[0], [activeRoute]);
  const Page = route.component;

  return (
    <AppLayout activeRoute={activeRoute} onRouteChange={setActiveRoute} routeTitle={route.label}>
      <Page />
    </AppLayout>
  );
}
