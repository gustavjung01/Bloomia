import { getCurrentWindow } from '@tauri-apps/api/window';
import { useState, type PointerEvent } from 'react';

import type { RouteKey } from './routes';
import { Badge, Button } from '../components/ui';
import { TabAssistantPopup } from '../features/ai/TabAssistantPopup';

interface TopbarProps {
  title: string;
  databaseStatus: 'idle' | 'ready' | 'error';
}

const appWindow = getCurrentWindow();

const statusLabel = {
  idle: 'DB đang khởi tạo',
  ready: 'DB sẵn sàng',
  error: 'DB lỗi',
};

const routeByTitle: Record<string, RouteKey> = {
  'Tổng quan': 'dashboard',
  'Bán hàng': 'sales',
  'Đơn hoa': 'flowerOrders',
  Kho: 'inventory',
  'Nhập hàng': 'purchase',
  'Mẫu hoa': 'recipes',
  'Khách hàng': 'customers',
  'Báo cáo': 'reports',
  'Cài đặt': 'settings',
  'Hệ thống': 'system',
  'Cập nhật': 'update',
};

export function Topbar({ title, databaseStatus }: TopbarProps) {
  const [open, setOpen] = useState(false);
  const tabKey = routeByTitle[title] ?? 'dashboard';

  async function handleTopbarDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();

    try {
      await appWindow.startDragging();
    } catch (error) {
      console.warn('Bloomia topbar drag failed', error);
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-title" data-tauri-drag-region onPointerDown={handleTopbarDrag} onDoubleClick={() => appWindow.toggleMaximize()}>
          <span className="eyebrow" data-tauri-drag-region>Bloomia Desktop</span>
          <h1 data-tauri-drag-region>{title}</h1>
        </div>

        <div className="topbar-actions">
          <Badge tone={databaseStatus === 'ready' ? 'sage' : databaseStatus === 'error' ? 'peach' : 'lavender'}>
            {statusLabel[databaseStatus]}
          </Badge>
          <label className="search-field">
            <span>⌕</span>
            <input placeholder="Tìm đơn hàng, khách hàng, sản phẩm..." />
          </label>
          <Button variant="soft" onClick={() => setOpen(true)}>Bloomia AI</Button>
        </div>
      </header>
      <TabAssistantPopup open={open} tabKey={tabKey} tabTitle={title} onClose={() => setOpen(false)} />
    </>
  );
}
