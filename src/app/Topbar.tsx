import { Button } from '../components/ui';

interface TopbarProps {
  title: string;
}

export function Topbar({ title }: TopbarProps) {
  return (
    <header className="topbar">
      <div>
        <span className="eyebrow">Bloomia Desktop</span>
        <h1>{title}</h1>
      </div>

      <div className="topbar-actions">
        <label className="search-field">
          <span>⌕</span>
          <input placeholder="Tìm đơn hàng, khách hàng, sản phẩm..." />
        </label>
        <Button variant="soft">AI tư vấn</Button>
      </div>
    </header>
  );
}
