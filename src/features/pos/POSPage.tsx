import { useEffect, useMemo, useState } from 'react';

import { Badge, Button, PillTabs, SelectField, SoftCard, TextArea, TextField } from '../../components/ui';
import type { ItemRecord, ShopSettingsRecord } from '../../db/repositories/manualSetupRepository';
import { getShopSettings, listItems } from '../../db/repositories/manualSetupRepository';
import { getPrinterSettings } from '../../db/repositories/printerRepository';
import { createSale, type HydratedSale, type PaymentMethod } from '../../db/repositories/salesRepository';
import { calculateCartTotals, lineTotal, normalizeMoney, normalizeQuantity, type CartLine } from '../../services/pos/cart';
import { renderInvoiceHtml } from '../../services/printing/invoiceTemplate';
import { openPrintWindow } from '../../services/printing/printerService';
import { createLocalId } from '../../utils/id';
import { formatCurrency } from '../../utils/format';

type OrderMode = 'counter' | 'delivery' | 'preorder';

const orderModeOptions = [
  { label: 'Đơn tại quầy', value: 'counter' },
  { label: 'Đơn giao', value: 'delivery' },
  { label: 'Đặt trước', value: 'preorder' },
] as const;

const paymentOptions = [
  { label: 'Tiền mặt', value: 'cash' },
  { label: 'Chuyển khoản', value: 'bank_transfer' },
  { label: 'Thẻ', value: 'card' },
  { label: 'Công nợ', value: 'debt' },
];

export function POSPage() {
  const [mode, setMode] = useState<OrderMode>('counter');
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [note, setNote] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [shippingFee, setShippingFee] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customName, setCustomName] = useState('Bó hoa tùy chỉnh');
  const [customPrice, setCustomPrice] = useState('500000');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [lastSale, setLastSale] = useState<HydratedSale | null>(null);
  const [shop, setShop] = useState<ShopSettingsRecord | null>(null);

  useEffect(() => {
    void loadCatalog();
  }, []);

  async function loadCatalog() {
    try {
      setError('');
      const [itemRows, shopRecord] = await Promise.all([listItems(), getShopSettings()]);
      setItems(itemRows);
      setShop(shopRecord);
    } catch (caught) {
      console.error(caught);
      setError('Không tải được sản phẩm. Nếu đang chạy bằng browser Vite, hãy dùng npm run tauri:dev.');
    }
  }

  const visibleItems = useMemo(() => items.filter((item) => item.is_active && item.default_sale_price >= 0), [items]);
  const totals = useMemo(() => calculateCartTotals(cart, Number(discountAmount), Number(shippingFee)), [cart, discountAmount, shippingFee]);

  function addCatalogItem(item: ItemRecord) {
    setCart((current) => {
      const existing = current.find((line) => line.itemId === item.id && !line.isCustom);
      if (existing) {
        return current.map((line) => (line.id === existing.id ? { ...line, quantity: normalizeQuantity(line.quantity + 1) } : line));
      }

      return [
        ...current,
        {
          id: createLocalId('cart'),
          itemId: item.id,
          itemName: item.name,
          quantity: 1,
          unitPrice: item.default_sale_price,
          costPrice: 0,
          note: item.item_type === 'service' ? 'Dịch vụ không trừ kho' : '',
        },
      ];
    });
  }

  function addCustomLine() {
    if (!customName.trim()) {
      setError('Tên dòng tùy chỉnh là bắt buộc.');
      return;
    }

    setCart((current) => [
      ...current,
      {
        id: createLocalId('cart-custom'),
        itemId: null,
        itemName: customName.trim(),
        quantity: 1,
        unitPrice: normalizeMoney(Number(customPrice)),
        costPrice: 0,
        isCustom: true,
      },
    ]);
    setCustomName('Bó hoa tùy chỉnh');
    setCustomPrice('500000');
    setError('');
  }

  function updateLine(id: string, patch: Partial<CartLine>) {
    setCart((current) =>
      current.map((line) =>
        line.id === id
          ? {
              ...line,
              ...patch,
              quantity: patch.quantity === undefined ? line.quantity : normalizeQuantity(patch.quantity),
              unitPrice: patch.unitPrice === undefined ? line.unitPrice : normalizeMoney(patch.unitPrice),
            }
          : line,
      ),
    );
  }

  function removeLine(id: string) {
    setCart((current) => current.filter((line) => line.id !== id));
  }

  async function handleCheckout() {
    if (cart.length === 0) {
      setError('Chưa có sản phẩm/dịch vụ trong đơn.');
      return;
    }

    try {
      setStatus('Đang lưu hóa đơn...');
      setError('');
      const paidAmount = paymentMethod === 'debt' ? 0 : totals.total;
      const sale = await createSale({
        customerName,
        customerPhone,
        note,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        shippingFee: totals.shippingFee,
        total: totals.total,
        paymentMethod,
        paidAmount,
        lines: cart.map((line) => ({
          itemId: line.itemId,
          itemName: line.itemName,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          costPrice: line.costPrice ?? 0,
          note: line.note,
        })),
      });

      setLastSale(sale);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setNote('');
      setDiscountAmount('0');
      setShippingFee('0');
      setStatus(`Đã lưu hóa đơn ${sale.sale.invoice_code}.`);
    } catch (caught) {
      console.error(caught);
      setStatus('');
      setError('Không lưu được hóa đơn. Kiểm tra dữ liệu hoặc SQLite runtime.');
    }
  }

  async function handlePrintLastSale() {
    if (!lastSale) {
      setError('Chưa có hóa đơn để in.');
      return;
    }

    try {
      const printer = await getPrinterSettings();
      const invoiceHtml = renderInvoiceHtml(lastSale, shop, printer);
      openPrintWindow(invoiceHtml);
    } catch (caught) {
      console.error(caught);
      setError('Không mở được preview/in hóa đơn.');
    }
  }

  return (
    <>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Bán hàng</span>
          <h2>Tạo hóa đơn bán lẻ</h2>
        </div>
        <PillTabs value={mode} onChange={setMode} options={[...orderModeOptions]} />
      </div>

      {(status || error) && (
        <div className="setup-status-row">
          {status && <Badge tone="sage">{status}</Badge>}
          {error && <Badge tone="peach">{error}</Badge>}
        </div>
      )}

      <div className="page-grid">
        <SoftCard className="span-8" title="Thông tin khách hàng" description="Có thể để trống nếu là khách lẻ.">
          <div className="page-grid">
            <div className="span-6">
              <TextField label="Khách hàng" value={customerName} placeholder="Tên khách" onChange={(event) => setCustomerName(event.target.value)} />
            </div>
            <div className="span-6">
              <TextField label="SĐT" value={customerPhone} placeholder="09xx xxx xxx" onChange={(event) => setCustomerPhone(event.target.value)} />
            </div>
            <div className="span-12">
              <TextArea label="Ghi chú đơn" value={note} placeholder="Tone màu, dịp tặng, lời nhắn thiệp..." onChange={(event) => setNote(event.target.value)} />
            </div>
          </div>
        </SoftCard>

        <SoftCard className="span-4" title="Thanh toán" description="Tính tiền theo dữ liệu giỏ hàng.">
          <div className="pos-summary">
            <div className="pos-total-row"><span>Tạm tính</span><strong>{formatCurrency(totals.subtotal)}</strong></div>
            <TextField label="Chiết khấu" type="number" min={0} value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} />
            <TextField label="Phí giao" type="number" min={0} value={shippingFee} onChange={(event) => setShippingFee(event.target.value)} />
            <SelectField label="Thanh toán" value={paymentMethod} options={paymentOptions} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} />
            <div className="pos-total-row pos-grand-total"><span>Tổng cộng</span><strong>{formatCurrency(totals.total)}</strong></div>
            <div className="pos-total-row"><span>Lời tạm tính</span><strong>{formatCurrency(totals.estimatedProfit)}</strong></div>
            <Button onClick={handleCheckout}>Lưu hóa đơn</Button>
            <Button variant="soft" onClick={handlePrintLastSale} disabled={!lastSale}>Preview / In hóa đơn cuối</Button>
          </div>
        </SoftCard>

        <SoftCard className="span-8" title="Chọn sản phẩm / dịch vụ" description="Dữ liệu lấy từ Cài đặt → Hàng hóa & dịch vụ.">
          <div className="pos-product-grid">
            {visibleItems.map((item) => (
              <button key={item.id} type="button" className="pos-product-card" onClick={() => addCatalogItem(item)}>
                <Badge tone={item.item_type === 'service' ? 'sage' : 'lavender'}>{item.item_type === 'service' ? 'Dịch vụ' : item.category_name ?? 'Sản phẩm'}</Badge>
                <strong>{item.name}</strong>
                <span>{formatCurrency(item.default_sale_price)}</span>
              </button>
            ))}
          </div>
        </SoftCard>

        <SoftCard className="span-4" title="Dòng tùy chỉnh" description="Dùng cho đơn theo ngân sách khách.">
          <div className="setup-form-grid">
            <TextField label="Tên dòng" value={customName} onChange={(event) => setCustomName(event.target.value)} />
            <TextField label="Giá bán" type="number" min={0} value={customPrice} onChange={(event) => setCustomPrice(event.target.value)} />
            <Button variant="soft" onClick={addCustomLine}>Thêm dòng tùy chỉnh</Button>
          </div>
        </SoftCard>

        <SoftCard className="span-12" title="Chi tiết đơn hàng" description="Có thể sửa số lượng và giá từng dòng trước khi lưu.">
          <div className="pos-cart-list">
            {cart.length === 0 && <p className="setup-muted">Chưa có dòng nào trong đơn.</p>}
            {cart.map((line) => (
              <div className="pos-cart-row" key={line.id}>
                <div className="pos-cart-name">
                  <strong>{line.itemName}</strong>
                  <span>{line.isCustom ? 'Dòng tùy chỉnh' : line.note || 'Từ danh mục'}</span>
                </div>
                <TextField label="SL" type="number" min={0.01} step={0.01} value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: Number(event.target.value) })} />
                <TextField label="Giá" type="number" min={0} value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: Number(event.target.value) })} />
                <div className="pos-line-total">
                  <span>Thành tiền</span>
                  <strong>{formatCurrency(lineTotal(line))}</strong>
                </div>
                <Button variant="ghost" onClick={() => removeLine(line.id)}>Xóa</Button>
              </div>
            ))}
          </div>
        </SoftCard>
      </div>
    </>
  );
}
