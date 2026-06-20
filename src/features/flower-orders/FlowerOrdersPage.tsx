import { Badge, Button, EmptyState, SoftCard } from '../../components/ui';

const statuses = ['Mới nhận', 'Đã xác nhận', 'Đang chuẩn bị', 'Đã cắm xong', 'Đang giao'];

export function FlowerOrdersPage() {
  return (
    <>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Đơn hoa</span>
          <h2>Đơn đặt trước & giao hoa</h2>
        </div>
        <Button>Tạo đơn hoa</Button>
      </div>

      <div className="page-grid">
        <SoftCard className="span-8" title="Luồng trạng thái" description="Kanban thật sẽ làm ở Phase E">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {statuses.map((status) => (
              <Badge key={status} tone="lavender">
                {status}
              </Badge>
            ))}
          </div>
        </SoftCard>
        <SoftCard className="span-4" title="Đơn cần giao hôm nay">
          <EmptyState title="Chưa có dữ liệu thật" description="Sau Phase E, danh sách đơn cần giao sẽ hiện ở đây." />
        </SoftCard>
      </div>
    </>
  );
}
