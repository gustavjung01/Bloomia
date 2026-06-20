import { Badge, Button, SoftCard } from '../../components/ui';
import { formatCurrency } from '../../utils/format';

const stats = [
  { label: 'Doanh thu hôm nay', value: formatCurrency(24850000), tone: 'pink' as const },
  { label: 'Đơn đang xử lý', value: '18', tone: 'lavender' as const },
  { label: 'Hoa sắp héo', value: '12', tone: 'peach' as const },
  { label: 'Lợi nhuận tạm tính', value: formatCurrency(9650000), tone: 'sage' as const },
];

export function DashboardPage() {
  return (
    <>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Tổng quan</span>
          <h2>Nhịp tiệm hoa hôm nay</h2>
        </div>
        <Button variant="soft">Xem báo cáo ngày</Button>
      </div>

      <div className="page-grid">
        {stats.map((stat) => (
          <SoftCard key={stat.label} className="span-3">
            <Badge tone={stat.tone}>{stat.label}</Badge>
            <h2 style={{ marginTop: 16 }}>{stat.value}</h2>
          </SoftCard>
        ))}

        <SoftCard className="span-8" title="Doanh thu" description="Placeholder chart cho Phase A">
          <div style={{ height: 240, display: 'grid', placeItems: 'center', color: 'var(--color-ink-500)' }}>
            Biểu đồ sẽ nối dữ liệu thật ở Phase E
          </div>
        </SoftCard>

        <SoftCard className="span-4" title="Đơn cần giao hôm nay" description="Dữ liệu mẫu cho app shell">
          <div style={{ display: 'grid', gap: 12 }}>
            {['09:00 — Chị Minh Anh', '11:00 — Anh Hoàng Nam', '14:00 — Chị Thu Hà'].map((item) => (
              <Badge key={item} tone="lavender">
                {item}
              </Badge>
            ))}
          </div>
        </SoftCard>
      </div>
    </>
  );
}
