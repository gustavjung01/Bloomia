import { useEffect, useMemo, useState } from 'react';

import { Badge, Button, Dialog, PillTabs, SelectField, SoftCard, TextArea, TextField } from '../../components/ui';
import { listCustomers, type CustomerRecord } from '../../db/repositories/customerRepository';
import type { ItemRecord, ShopSettingsRecord } from '../../db/repositories/manualSetupRepository';
import { getShopSettings, listItems } from '../../db/repositories/manualSetupRepository';
import { loadPhotoMap } from '../../db/repositories/photoStore';
import { getPrinterSettings } from '../../db/repositories/printerRepository';
import { listRecipes, type HydratedRecipe } from '../../db/repositories/recipesRepository';
import {
  createSale,
  getSaleById,
  listRecentSales,
  searchSales,
  type HydratedSale,
  type PaymentMethod,
  type SaleRecord,
} from '../../db/repositories/salesRepository';
import { dispatchAIEvent } from '../../services/ai/desktopAIService';
import { calculateCartTotals, lineTotal, normalizeMoney, normalizeQuantity, type CartLine } from '../../services/pos/cart';
import { renderInvoiceHtml } from '../../services/printing/invoiceTemplate';
import { printInvoiceHtml as sendInvoiceToPrinter } from '../../services/printing/printerService';
import { resolveMediaUrl } from '../../services/system/systemService';
import { formatCurrency } from '../../utils/format';
import { createLocalId } from '../../utils/id';

type CatalogTab = 'items' | 'recipes';

const catalogTabs = [
  { label: 'Sản phẩm & dịch vụ', value: 'items' },
  { label: 'Mẫu hoa', value: 'recipes' },
] as const;

const paymentOptions = [
  { label: 'Tiền mặt — thu đủ', value: 'cash' },
  { label: 'Chuyển khoản — thu đủ', value: 'bank_transfer' },
  { label: 'Thẻ — thu đủ', value: 'card' },
  { label: 'Công nợ — chưa thu', value: 'debt' },
];

const paymentLabels: Record<PaymentMethod, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  card: 'Thẻ',
  debt: 'Công nợ',
};

export function POSPage() {
  const [catalogTab, setCatalogTab] = useState<CatalogTab>('items');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [recipes, setRecipes] = useState<HydratedRecipe[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [savedSales, setSavedSales] = useState<SaleRecord[]>([]);
  const [itemPhotoUrls, setItemPhotoUrls] = useState<Record<string, string>>({});
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [note, setNote] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [shippingFee, setShippingFee] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customName, setCustomName] = useState('Bó hoa tùy chỉnh');
  const [customPrice, setCustomPrice] = useState('500000');
  const [shop, setShop] = useState<ShopSettingsRecord | null>(null);
  const [lastSale, setLastSale] = useState<HydratedSale | null>(null);
  const [previewSale, setPreviewSale] = useState<HydratedSale | null>(null);
  const [previewMarkup, setPreviewMarkup] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void loadCatalog();
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      searchSales(invoiceQuery, 80)
        .then((rows) => {
          if (active) setSavedSales(rows);
        })
        .catch((caught) => {
          console.error(caught);
          if (active) setError('Không tìm được hóa đơn đã lưu.');
        });
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [invoiceQuery]);

  async function loadCatalog() {
    try {
      setError('');
      const [itemRows, recipeRows, shopRecord, photoMap, customerRows, saleRows] = await Promise.all([
        listItems(),
        listRecipes(),
        getShopSettings(),
        loadPhotoMap(),
        listCustomers(),
        listRecentSales(50),
      ]);

      setItems(itemRows);
      setRecipes(recipeRows);
      setShop(shopRecord);
      setCustomers(customerRows);
      setSavedSales(saleRows);

      const urls: Record<string, string> = {};
      for (const [itemId, path] of Object.entries(photoMap as Record<string, string>)) {
        urls[itemId] = await resolveMediaUrl(path);
      }
      setItemPhotoUrls(urls);
    } catch (caught) {
      console.error(caught);
      setError('Không tải được dữ liệu bán hàng. Hãy kiểm tra SQLite runtime.');
    }
  }

  const visibleItems = useMemo(() => {
    const query = catalogQuery.trim().toLocaleLowerCase('vi-VN');
    return items.filter((item) => {
      if (!item.is_active || item.default_sale_price < 0) return false;
      if (!query) return true;
      return [item.name, item.sku ?? '', item.category_name ?? ''].some((value) => value.toLocaleLowerCase('vi-VN').includes(query));
    });
  }, [items, catalogQuery]);

  const visibleRecipes = useMemo(() => {
    const query = catalogQuery.trim().toLocaleLowerCase('vi-VN');
    if (!query) return recipes;
    return recipes.filter((recipe) => [recipe.name, recipe.color_tone ?? '', recipe.occasion ?? ''].some((value) => value.toLocaleLowerCase('vi-VN').includes(query)));
  }, [recipes, catalogQuery]);

  const totals = useMemo(
    () => calculateCartTotals(cart, Number(discountAmount), Number(shippingFee)),
    [cart, discountAmount, shippingFee],
  );

  const cartQuantity = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart]);
  const customerOptions = useMemo(
    () => [
      { label: 'Khách lẻ', value: '' },
      ...customers.map((customer) => ({
        label: customer.phone ? `${customer.name} — ${customer.phone}` : customer.name,
        value: customer.id,
      })),
    ],
    [customers],
  );

  function selectCustomer(customerId: string) {
    setSelectedCustomerId(customerId);
    if (!customerId) {
      setCustomerName('');
      setCustomerPhone('');
      return;
    }

    const customer = customers.find((item) => item.id === customerId);
    if (!customer) return;
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone ?? '');
  }

  function addCatalogItem(item: ItemRecord) {
    setCart((current) => {
      const existing = current.find((line) => line.itemId === item.id && !line.isCustom);
      if (existing) {
        return current.map((line) =>
          line.id === existing.id ? { ...line, quantity: normalizeQuantity(line.quantity + 1) } : line,
        );
      }

      return [
        ...current,
        {
          id: createLocalId('cart'),
          itemId: item.id,
          itemName: item.name,
          quantity: 1,
          unitPrice: item.default_sale_price,
          costPrice: item.default_purchase_price,
          note: item.item_type === 'service' ? 'Dịch vụ không trừ kho' : '',
        },
      ];
    });
    setStatus(`Đã thêm ${item.name} vào đơn.`);
    setError('');
  }

  function addRecipe(recipe: HydratedRecipe) {
    const groupId = createLocalId('recipe-cart');
    const parentLine: CartLine = {
      id: groupId,
      itemId: null,
      itemName: recipe.name,
      quantity: 1,
      unitPrice: recipe.suggested_sale_price,
      costPrice: recipe.estimated_cost,
      isCustom: true,
      note: `Mẫu hoa • ${recipe.size_label ?? ''} • ${recipe.color_tone ?? ''}`,
    };
    const ingredientLines: CartLine[] = recipe.items.map((item) => ({
      id: createLocalId('recipe-ingredient'),
      itemId: item.item_id,
      itemName: `↳ ${item.item_name}`,
      quantity: item.quantity,
      unitPrice: 0,
      costPrice: item.default_sale_price,
      note: `Thành phần của ${recipe.name}`,
    }));

    setCart((current) => [...current, parentLine, ...ingredientLines]);
    setStatus(`Đã thêm mẫu ${recipe.name}.`);
    setError('');
  }

  function addCustomLine() {
    if (!customName.trim()) {
      setError('Nhập tên dòng tùy chỉnh trước khi thêm.');
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
    setStatus(`Đã thêm ${customName.trim()} vào đơn.`);
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

  function openCheckout() {
    if (cart.length === 0) {
      setError('Chọn ít nhất một sản phẩm hoặc dịch vụ trước khi thanh toán.');
      return;
    }
    setError('');
    setCheckoutOpen(true);
  }

  async function saveSale() {
    if (cart.length === 0 || saving) return;

    try {
      setSaving(true);
      setError('');
      setStatus('Đang lưu hóa đơn...');
      const paidAmount = paymentMethod === 'debt' ? 0 : totals.total;
      const sale = await createSale({
        customerId: selectedCustomerId || null,
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

      void dispatchAIEvent(
        'sale_created',
        `Đã tạo hóa đơn ${sale.sale.invoice_code}`,
        `Tổng tiền ${formatCurrency(sale.sale.total)}`,
        { saleId: sale.sale.id, invoiceCode: sale.sale.invoice_code, total: sale.sale.total },
      ).catch((eventError) => console.warn('AI event dispatch failed', eventError));

      setLastSale(sale);
      setCart([]);
      resetCheckoutFields();
      setCustomers(await listCustomers());
      setSavedSales(await listRecentSales(50));
      setCheckoutOpen(false);
      setSuccessOpen(true);
      setStatus(`Đã lưu ${sale.sale.invoice_code}. Hóa đơn có trong mục Hóa đơn đã lưu bên dưới.`);
    } catch (caught) {
      console.error(caught);
      setStatus('');
      setError('Không lưu được hóa đơn. Kiểm tra tồn kho hoặc dữ liệu thanh toán.');
    } finally {
      setSaving(false);
    }
  }

  function resetCheckoutFields() {
    setSelectedCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setNote('');
    setDiscountAmount('0');
    setShippingFee('0');
    setPaymentMethod('cash');
  }

  async function showInvoicePreview(sale: HydratedSale) {
    const printer = await getPrinterSettings();
    setPreviewSale(sale);
    setPreviewMarkup(renderInvoiceHtml(sale, shop, printer, { autoPrint: false }));
    setPreviewOpen(true);
  }

  async function previewSavedSale(saleId: string) {
    try {
      setError('');
      await showInvoicePreview(await getSaleById(saleId));
    } catch (caught) {
      console.error(caught);
      setError('Không mở được hóa đơn đã lưu.');
    }
  }

  async function printSale(sale: HydratedSale) {
    try {
      setError('');
      setStatus(`Đang gửi ${sale.sale.invoice_code} tới máy in...`);
      const printer = await getPrinterSettings();
      const markup = renderInvoiceHtml(sale, shop, printer, { autoPrint: false });
      await sendInvoiceToPrinter(markup, printer?.printer_name, printer?.paper_size ?? '80mm');
      setStatus(`Đã gửi ${sale.sale.invoice_code} tới máy in.`);
    } catch (caught) {
      console.error(caught);
      setStatus('');
      setError('Không in được hóa đơn. Kiểm tra máy in đã chọn trong Cài đặt.');
    }
  }

  async function printSavedSale(saleId: string) {
    try {
      await printSale(await getSaleById(saleId));
    } catch (caught) {
      console.error(caught);
      setError('Không tải được hóa đơn để in.');
    }
  }

  const paidNow = paymentMethod === 'debt' ? 0 : totals.total;
  const remaining = Math.max(0, totals.total - paidNow);

  return (
    <>
      <div className="page-title-row pos-page-heading">
        <div>
          <span className="eyebrow">Bán hàng</span>
          <h2>Tạo hóa đơn theo 3 bước</h2>
          <p className="setup-muted">Chọn hàng, kiểm tra giỏ rồi xác nhận thanh toán. Hóa đơn lưu xong có thể tìm, xem và in lại.</p>
        </div>
      </div>

      <div className="pos-flow-strip" aria-label="Quy trình bán hàng">
        <div className="is-active"><span>1</span><strong>Chọn hàng</strong><small>Thêm sản phẩm hoặc mẫu hoa</small></div>
        <div className={cart.length > 0 ? 'is-active' : ''}><span>2</span><strong>Kiểm tra đơn</strong><small>Sửa số lượng và giá bán</small></div>
        <div><span>3</span><strong>Thanh toán</strong><small>Khách hàng, giảm giá và phương thức thu</small></div>
      </div>

      {(status || error) && (
        <div className="setup-status-row">
          {status && <Badge tone="sage">{status}</Badge>}
          {error && <Badge tone="peach">{error}</Badge>}
        </div>
      )}

      <div className="pos-workspace">
        <SoftCard className="pos-catalog-panel" title="Bước 1 — Chọn hàng" description="Bấm vào thẻ để thêm vào đơn. Bấm lần nữa để tăng số lượng.">
          <div className="pos-catalog-toolbar">
            <PillTabs value={catalogTab} onChange={setCatalogTab} options={[...catalogTabs]} />
            <TextField value={catalogQuery} placeholder="Tìm tên, mã SKU hoặc nhóm hàng..." onChange={(event) => setCatalogQuery(event.target.value)} />
          </div>

          {catalogTab === 'items' && (
            <div className="pos-product-grid">
              {visibleItems.length === 0 && <p className="setup-muted">Không tìm thấy sản phẩm hoặc dịch vụ phù hợp.</p>}
              {visibleItems.map((item) => (
                <button key={item.id} type="button" className="pos-product-card" onClick={() => addCatalogItem(item)}>
                  {itemPhotoUrls[item.id] ? (
                    <img className="pos-product-image" src={itemPhotoUrls[item.id]} alt={item.name} />
                  ) : (
                    <div className="pos-product-image pos-product-image-placeholder" aria-hidden="true">✦</div>
                  )}
                  <Badge tone={item.item_type === 'service' ? 'sage' : 'lavender'}>
                    {item.item_type === 'service' ? 'Dịch vụ' : item.category_name ?? 'Sản phẩm'}
                  </Badge>
                  <strong>{item.name}</strong>
                  <span>{formatCurrency(item.default_sale_price)}</span>
                </button>
              ))}
            </div>
          )}

          {catalogTab === 'recipes' && (
            <div className="pos-product-grid">
              {visibleRecipes.length === 0 && <p className="setup-muted">Chưa có mẫu hoa phù hợp.</p>}
              {visibleRecipes.map((recipe) => (
                <button key={recipe.id} type="button" className="pos-product-card pos-recipe-card" onClick={() => addRecipe(recipe)}>
                  <Badge tone="pink">{recipe.size_label ?? 'Mẫu hoa'}</Badge>
                  <strong>{recipe.name}</strong>
                  <span>{recipe.color_tone ?? 'Chưa chọn tone'}</span>
                  <span>{formatCurrency(recipe.suggested_sale_price)}</span>
                </button>
              ))}
            </div>
          )}

          <div className="pos-custom-line">
            <div>
              <strong>Dòng bán tùy chỉnh</strong>
              <span>Dùng khi khách đặt bó hoa theo ngân sách riêng.</span>
            </div>
            <TextField value={customName} onChange={(event) => setCustomName(event.target.value)} />
            <TextField type="number" min={0} value={customPrice} onChange={(event) => setCustomPrice(event.target.value)} />
            <Button variant="soft" onClick={addCustomLine}>Thêm vào đơn</Button>
          </div>
        </SoftCard>

        <SoftCard className="pos-order-panel" title="Bước 2 — Đơn hiện tại" description={`${cart.length} dòng • ${cartQuantity} sản phẩm`}>
          <div className="pos-order-lines">
            {cart.length === 0 && (
              <div className="pos-empty-cart">
                <span>Giỏ hàng đang trống</span>
                <p>Chọn sản phẩm ở bên trái để bắt đầu.</p>
              </div>
            )}

            {cart.map((line) => (
              <div className="pos-order-line" key={line.id}>
                <div className="pos-order-line-name">
                  <strong>{line.itemName}</strong>
                  <span>{formatCurrency(lineTotal(line))}</span>
                </div>
                <TextField label="SL" type="number" min={0.01} step={0.01} value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: Number(event.target.value) })} />
                <TextField label="Đơn giá" type="number" min={0} value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: Number(event.target.value) })} />
                <Button variant="ghost" onClick={() => removeLine(line.id)}>Xóa</Button>
              </div>
            ))}
          </div>

          <div className="pos-order-total">
            <span>Tạm tính đơn hàng</span>
            <strong>{formatCurrency(totals.subtotal)}</strong>
          </div>
          <Button className="pos-checkout-button" onClick={openCheckout} disabled={cart.length === 0}>
            Tiếp tục thanh toán
          </Button>
        </SoftCard>
      </div>

      <SoftCard className="pos-invoice-history" title="Hóa đơn đã lưu" description="Tìm theo mã hóa đơn, tên khách hoặc số điện thoại. Hóa đơn mới nhất nằm trên cùng.">
        <div className="pos-invoice-search">
          <TextField value={invoiceQuery} placeholder="Ví dụ: BLM-2026..., Khách hàng mẫu..." onChange={(event) => setInvoiceQuery(event.target.value)} />
          <Badge tone="lavender">{savedSales.length} kết quả</Badge>
        </div>

        <div className="pos-invoice-list">
          {savedSales.length === 0 && <p className="setup-muted">Không tìm thấy hóa đơn phù hợp.</p>}
          {savedSales.map((sale) => (
            <div className="pos-invoice-row" key={sale.id}>
              <div>
                <strong>{sale.invoice_code}</strong>
                <span>{formatInvoiceDate(sale.sale_date)}</span>
              </div>
              <div>
                <strong>{sale.customer_name ?? 'Khách lẻ'}</strong>
                <span>{sale.customer_phone ?? 'Không có SĐT'}</span>
              </div>
              <div className="pos-invoice-amount">
                <span>{paymentStatusLabel(sale.payment_status)}</span>
                <strong>{formatCurrency(sale.total)}</strong>
              </div>
              <Button variant="soft" onClick={() => previewSavedSale(sale.id)}>Xem hóa đơn</Button>
              <Button onClick={() => printSavedSale(sale.id)}>In lại</Button>
            </div>
          ))}
        </div>
      </SoftCard>

      <Dialog open={checkoutOpen} title="Bước 3 — Kiểm tra và thanh toán" onClose={() => setCheckoutOpen(false)}>
        <div className="pos-checkout-dialog">
          <section className="pos-checkout-section">
            <h3>Khách hàng</h3>
            <SelectField label="Chọn khách có sẵn" value={selectedCustomerId} options={customerOptions} onChange={(event) => selectCustomer(event.target.value)} />
            <div className="page-grid">
              <div className="span-6"><TextField label="Tên khách" value={customerName} placeholder="Để trống nếu là khách lẻ" onChange={(event) => setCustomerName(event.target.value)} /></div>
              <div className="span-6"><TextField label="Số điện thoại" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} /></div>
            </div>
            <TextArea label="Ghi chú hóa đơn" value={note} placeholder="Lời nhắn, yêu cầu giao hàng..." onChange={(event) => setNote(event.target.value)} />
          </section>

          <section className="pos-checkout-section">
            <h3>Cách tính tiền</h3>
            <div className="page-grid">
              <div className="span-6"><TextField label="Chiết khấu" type="number" min={0} value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} /></div>
              <div className="span-6"><TextField label="Phí giao" type="number" min={0} value={shippingFee} onChange={(event) => setShippingFee(event.target.value)} /></div>
            </div>
            <SelectField label="Phương thức thanh toán" value={paymentMethod} options={paymentOptions} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} />

            <div className="pos-payment-breakdown">
              <div><span>Tạm tính</span><strong>{formatCurrency(totals.subtotal)}</strong></div>
              <div><span>Trừ chiết khấu</span><strong>-{formatCurrency(totals.discountAmount)}</strong></div>
              <div><span>Cộng phí giao</span><strong>{formatCurrency(totals.shippingFee)}</strong></div>
              <div className="is-total"><span>Khách phải trả</span><strong>{formatCurrency(totals.total)}</strong></div>
              <div><span>Thu ngay bằng {paymentLabels[paymentMethod]}</span><strong>{formatCurrency(paidNow)}</strong></div>
              {remaining > 0 && <div className="is-debt"><span>Ghi công nợ</span><strong>{formatCurrency(remaining)}</strong></div>}
            </div>
          </section>

          <div className="pos-dialog-actions">
            <Button variant="ghost" onClick={() => setCheckoutOpen(false)}>Quay lại sửa đơn</Button>
            <Button onClick={saveSale} disabled={saving}>{saving ? 'Đang lưu...' : `Lưu hóa đơn • ${formatCurrency(totals.total)}`}</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={successOpen} title="Hóa đơn đã được lưu" onClose={() => setSuccessOpen(false)}>
        {lastSale && (
          <div className="pos-success-dialog">
            <div className="pos-success-mark">✓</div>
            <strong>{lastSale.sale.invoice_code}</strong>
            <span>{lastSale.sale.customer_name ?? 'Khách lẻ'} • {formatCurrency(lastSale.sale.total)}</span>
            <p>Hóa đơn đã nằm trong mục “Hóa đơn đã lưu” và có thể tìm lại bất cứ lúc nào.</p>
            <div className="pos-dialog-actions">
              <Button variant="soft" onClick={() => showInvoicePreview(lastSale)}>Xem hóa đơn</Button>
              <Button onClick={() => printSale(lastSale)}>In hóa đơn</Button>
              <Button variant="ghost" onClick={() => setSuccessOpen(false)}>Tạo đơn mới</Button>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={previewOpen} title={`Xem trước hóa đơn${previewSale ? ` — ${previewSale.sale.invoice_code}` : ''}`} onClose={() => setPreviewOpen(false)}>
        <div className="pos-preview-dialog">
          <iframe title="Xem trước hóa đơn" className="pos-invoice-preview-frame" srcDoc={previewMarkup} />
          <div className="pos-dialog-actions">
            <Button variant="ghost" onClick={() => setPreviewOpen(false)}>Đóng</Button>
            {previewSale && <Button onClick={() => printSale(previewSale)}>In hóa đơn này</Button>}
          </div>
        </div>
      </Dialog>
    </>
  );
}

function formatInvoiceDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function paymentStatusLabel(status: string) {
  if (status === 'paid') return 'Đã thanh toán';
  if (status === 'partial') return 'Thanh toán một phần';
  return 'Công nợ';
}
