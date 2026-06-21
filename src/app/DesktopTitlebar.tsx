import { getCurrentWindow } from '@tauri-apps/api/window';
import type { PointerEvent } from 'react';

const appWindow = getCurrentWindow();

export function DesktopTitlebar() {
  async function handleTitlebarPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, input, textarea, select, a')) return;
    event.preventDefault();

    try {
      await appWindow.startDragging();
    } catch (error) {
      console.warn('Bloomia window drag failed', error);
    }
  }

  return (
    <div className="desktop-titlebar" data-tauri-drag-region onPointerDown={handleTitlebarPointerDown} onDoubleClick={() => appWindow.toggleMaximize()}>
      <div className="desktop-titlebar-brand" data-tauri-drag-region>
        <span className="desktop-titlebar-mark" data-tauri-drag-region>B</span>
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
