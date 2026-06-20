import { useState } from 'react';

import type { RouteKey } from './routes';
import { Badge, Button } from '../components/ui';
import { TabAssistantPopup } from '../features/ai/TabAssistantPopup';

interface TopbarProps {
  title: string;
  databaseStatus: 'idle' | 'ready' | 'error';
}

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
};

export function Topbar({ title, databaseStatus }: TopbarProps) {
  const [open, setOpen] = useState(false);
  const tabKey = routeByTitle[title] ?? 'dashboard';

  return (
    <>
      <header className="topbar">
        <div>
          <span className="eyebrow">Bloomia Desktop</span>
          <h1>{title}</h1>
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
