import type { PropsWithChildren } from 'react';

import { DesktopTitlebar } from './DesktopTitlebar';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import type { RouteKey } from './routes';

interface AppLayoutProps extends PropsWithChildren {
  activeRoute: RouteKey;
  routeTitle: string;
  databaseStatus: 'idle' | 'ready' | 'error';
  onRouteChange: (route: RouteKey) => void;
}

export function AppLayout({ activeRoute, routeTitle, databaseStatus, onRouteChange, children }: AppLayoutProps) {
  return (
    <>
      <DesktopTitlebar />
      <div className="app-shell">
        <Sidebar activeRoute={activeRoute} onRouteChange={onRouteChange} />
        <main className="app-main">
          <Topbar title={routeTitle} databaseStatus={databaseStatus} />
          <section className="page-content">{children}</section>
        </main>
      </div>
    </>
  );
}
