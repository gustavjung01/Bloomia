import { getCurrentWindow } from '@tauri-apps/api/window';
import type { MouseEvent } from 'react';

const appWindow = getCurrentWindow();

export function DesktopTitlebar() {
  async function handleTitlebarMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;
    await appWindow.startDragging();
  }

  return (
    <div className="desktop-titlebar" data-tauri-drag-region onMouseDown={handleTitlebarMouseDown}>
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
