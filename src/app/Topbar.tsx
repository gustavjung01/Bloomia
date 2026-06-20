import { Badge, Button } from '../components/ui';

interface TopbarProps {
  title: string;
  databaseStatus: 'idle' | 'ready' | 'error';
}

const statusLabel = {
  idle: 'DB đang khởi tạo',
  ready: 'DB sẵn sàng',
  error: 'DB lỗi',
};

export function Topbar({ title, databaseStatus }: TopbarProps) {
  return (
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
        <Button variant="soft">AI tư vấn</Button>
      </div>
    </header>
  );
}
