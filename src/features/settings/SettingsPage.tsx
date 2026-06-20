import { Button, SelectField, SoftCard, TextArea, TextField } from '../../components/ui';

export function SettingsPage() {
  return (
    <>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Cài đặt</span>
          <h2>Thông tin shop & nền vận hành</h2>
        </div>
        <Button>Lưu cài đặt</Button>
      </div>

      <div className="page-grid">
        <SoftCard className="span-6" title="Thông tin shop">
          <div style={{ display: 'grid', gap: 16 }}>
            <TextField label="Tên shop" defaultValue="Bloomia Florist" />
            <TextField label="Số điện thoại" placeholder="09xx xxx xxx" />
            <TextField label="Địa chỉ" placeholder="Nhập địa chỉ shop" />
            <TextArea label="Footer hóa đơn" defaultValue="Cảm ơn quý khách đã ghé Bloomia." />
          </div>
        </SoftCard>

        <SoftCard className="span-6" title="Máy in">
          <div style={{ display: 'grid', gap: 16 }}>
            <SelectField
              label="Khổ giấy"
              options={[
                { label: '58mm', value: '58' },
                { label: '80mm', value: '80' },
                { label: 'A4', value: 'a4' },
              ]}
            />
            <Button variant="soft">In thử</Button>
          </div>
        </SoftCard>
      </div>
    </>
  );
}
