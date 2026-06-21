import bloomiaMonogram from '../assets/bloomia-monogram.svg';
import { routes, type RouteKey } from './routes';

interface SidebarProps {
  activeRoute: RouteKey;
  onRouteChange: (route: RouteKey) => void;
}

export function Sidebar({ activeRoute, onRouteChange }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Bloomia navigation">
      <div className="brand-card">
        <div className="brand-mark" aria-hidden="true">
          <img src={bloomiaMonogram} alt="" />
        </div>
        <div>
          <strong>Bloomia</strong>
          <span>Studio POS</span>
        </div>
      </div>

      <nav className="nav-list">
        {routes.map((route) => {
          const isActive = route.key === activeRoute;
          return (
            <button
              key={route.key}
              type="button"
              className={`nav-item${isActive ? ' is-active' : ''}`}
              onClick={() => onRouteChange(route.key)}
              title={route.description}
            >
              <span className="nav-icon" aria-hidden="true">
                {route.icon}
              </span>
              <span>{route.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-quote">
        <span>✿</span>
        <p>Mỗi ngày là một tác phẩm.</p>
      </div>
    </aside>
  );
}
