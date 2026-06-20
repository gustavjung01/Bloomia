import { Badge, Button, SoftCard } from '../../components/ui';
import { formatCurrency } from '../../utils/format';

export function ReportsPage() {
  return (
    <>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Báo cáo</span>
          <h2>Doanh thu, tồn kho và hao hụt</h2>
        </div>
        <Button variant="soft">Xuất CSV</Button>
      </div>

      <div className="page-grid">
        <SoftCard className="span-4">
          <Badge tone="pink">Doanh thu hôm nay</Badge>
          <h2 style={{ marginTop: 16 }}>{formatCurrency(24850000)}</h2>
        </SoftCard>
        <SoftCard className="span-4">
          <Badge tone="sage">Lợi nhuận tạm tính</Badge>
          <h2 style={{ marginTop: 16 }}>{formatCurrency(9650000)}</h2>
        </SoftCard>
        <SoftCard className="span-4">
          <Badge tone="peach">Hao hụt</Badge>
          <h2 style={{ marginTop: 16 }}>{formatCurrency(420000)}</h2>
        </SoftCard>
      </div>
    </>
  );
}
