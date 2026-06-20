import { Button, EmptyState, SoftCard } from '../../components/ui';

export function CustomersPage() {
  return (
    <>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Khách hàng</span>
          <h2>Hồ sơ khách & lịch sử mua</h2>
        </div>
        <Button>Thêm khách hàng</Button>
      </div>

      <SoftCard>
        <EmptyState title="Chưa có khách hàng" description="Phase sau sẽ kết nối dữ liệu từ POS và đơn hoa." />
      </SoftCard>
    </>
  );
}
