import { useState } from 'react';

import { Badge, Button, PillTabs, SoftCard, TextArea, TextField } from '../../components/ui';
import { formatCurrency } from '../../utils/format';

type OrderMode = 'counter' | 'delivery' | 'preorder';

const products = [
  { name: 'Bó Hồng Romance', price: 1250000, tag: 'Bó hoa' },
  { name: 'Giỏ Hoa Tình Yêu', price: 850000, tag: 'Giỏ hoa' },
  { name: 'Lẵng Khai Trương', price: 1650000, tag: 'Lẵng hoa' },
];

export function POSPage() {
  const [mode, setMode] = useState<OrderMode>('counter');

  return (
    <>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Bán hàng</span>
          <h2>Tạo đơn hoa mới</h2>
        </div>
        <PillTabs
          value={mode}
          onChange={setMode}
          options={[
            { label: 'Đơn tại quầy', value: 'counter' },
            { label: 'Đơn giao', value: 'delivery' },
            { label: 'Đặt trước', value: 'preorder' },
          ]}
        />
      </div>

      <div className="page-grid">
        <SoftCard className="span-8" title="Thông tin khách hàng" description="Phase A dựng layout, Phase C nối logic thật">
          <div className="page-grid">
            <div className="span-6">
              <TextField label="Khách hàng" placeholder="Tìm hoặc nhập tên khách" />
            </div>
            <div className="span-6">
              <TextField label="SĐT" placeholder="Nhập số điện thoại" />
            </div>
            <div className="span-12">
              <TextArea label="Lời nhắn thiệp" placeholder="Nhập lời chúc viết thiệp..." />
            </div>
          </div>
        </SoftCard>

        <SoftCard className="span-4" title="Chi tiết đơn hàng" description="Tổng tạm tính mẫu">
          <div style={{ display: 'grid', gap: 12 }}>
            <Badge tone="pink">Bó Hồng Romance × 1</Badge>
            <Badge tone="sage">Thiệp chúc mừng × 1</Badge>
            <h2>{formatCurrency(1260000)}</h2>
            <Button>Thanh toán</Button>
            <Button variant="soft">In hóa đơn</Button>
          </div>
        </SoftCard>

        <SoftCard className="span-12" title="Chọn sản phẩm" action={<Button variant="soft">Thêm dòng tùy chỉnh</Button>}>
          <div className="page-grid">
            {products.map((product) => (
              <SoftCard key={product.name} className="span-4">
                <Badge tone="lavender">{product.tag}</Badge>
                <h3 style={{ marginTop: 12 }}>{product.name}</h3>
                <p style={{ color: 'var(--color-ink-500)', margin: '8px 0 16px' }}>{formatCurrency(product.price)}</p>
                <Button variant="soft">+ Thêm</Button>
              </SoftCard>
            ))}
          </div>
        </SoftCard>
      </div>
    </>
  );
}
