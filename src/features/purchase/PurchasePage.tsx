import { Button, SoftCard, TextField } from '../../components/ui';

export function PurchasePage() {
  return (
    <>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Nhập hàng</span>
          <h2>Nhập hoa theo lô</h2>
        </div>
        <Button>Tạo phiếu nhập</Button>
      </div>

      <SoftCard title="Phiếu nhập mẫu" description="Giá nhập lưu theo từng lô, không ghi đè giá item.">
        <div className="page-grid">
          <div className="span-4">
            <TextField label="Nhà cung cấp" placeholder="Chợ hoa Hồ Thị Kỷ" />
          </div>
          <div className="span-4">
            <TextField label="Ngày nhập" type="date" />
          </div>
          <div className="span-4">
            <TextField label="Ngày dự kiến héo" type="date" />
          </div>
        </div>
      </SoftCard>
    </>
  );
}
