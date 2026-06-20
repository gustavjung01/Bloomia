import { Badge, Button, SoftCard } from '../../components/ui';

const items = [
  { name: 'Hoa hồng pastel', qty: '35 cành', status: 'Sắp héo' },
  { name: 'Baby trắng', qty: '8 bó', status: 'Tồn thấp' },
  { name: 'Giấy gói Hàn Quốc', qty: '40 tờ', status: 'Ổn' },
];

export function InventoryPage() {
  return (
    <>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Kho</span>
          <h2>Tồn kho & lô nhập</h2>
        </div>
        <Button variant="soft">AI tư vấn kho</Button>
      </div>

      <div className="page-grid">
        <SoftCard className="span-12" title="Tồn kho hiện tại" description="Phase D sẽ nối purchase_batches và stock_movements">
          <div style={{ display: 'grid', gap: 12 }}>
            {items.map((item) => (
              <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{item.name}</strong>
                  <p style={{ color: 'var(--color-ink-500)' }}>{item.qty}</p>
                </div>
                <Badge tone={item.status === 'Ổn' ? 'sage' : 'peach'}>{item.status}</Badge>
              </div>
            ))}
          </div>
        </SoftCard>
      </div>
    </>
  );
}
