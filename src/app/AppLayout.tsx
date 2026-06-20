import type { PropsWithChildren } from 'react';

import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import type { RouteKey } from './routes';

interface AppLayoutProps extends PropsWithChildren {
  activeRoute: RouteKey;
  routeTitle: string;
  onRouteChange: (route: RouteKey) => void;
}

export function AppLayout({ activeRoute, routeTitle, onRouteChange, children }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <Sidebar activeRoute={activeRoute} onRouteChange={onRouteChange} />
      <main className="app-main">
        <Topbar title={routeTitle} />
        <section className="page-content">{children}</section>
      </main>
    </div>
  );
}
