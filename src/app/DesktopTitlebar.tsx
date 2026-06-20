import { getCurrentWindow } from '@tauri-apps/api/window';

const appWindow = getCurrentWindow();

export function DesktopTitlebar() {
  return (
    <div className="desktop-titlebar" data-tauri-drag-region>
      <div className="desktop-titlebar-brand" data-tauri-drag-region>
        <span className="desktop-titlebar-mark">B</span>
        <strong data-tauri-drag-region>Bloomia</strong>
      </div>
      <div className="desktop-titlebar-actions">
        <button type="button" onClick={() => appWindow.minimize()} aria-label="Minimize">—</button>
        <button type="button" onClick={() => appWindow.toggleMaximize()} aria-label="Maximize">□</button>
        <button type="button" onClick={() => appWindow.close()} aria-label="Close">×</button>
      </div>
    </div>
  );
}
