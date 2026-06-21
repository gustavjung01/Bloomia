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

type PosView = 'sale' | 'invoices';
type CatalogView = 'items' | 'recipes';

const posViews = [
  { label: 'Bán hàng', value: 'sale' },
  { label: 'Hóa đơn', value: 'invoices' },
] as const;

const catalogViews = [
  { label: 'Sản phẩm & dịch vụ', value: 'items' },
  { label: 'Mẫu hoa', value: 'recipes' },
] as const;

const paymentOptions = [
  { label: 'Tiền mặt', value: 'cash' },
  { label: 'Chuyển khoản', value: 'bank_transfer' },
  { label: 'Thẻ', value: 'card' },
  { label: 'Công nợ', value: 'debt' },
];

export function POSPage() {
  const [view, setView] = useState<PosView>('sale');
  const [catalogView, setCatalogView] = useState<CatalogView>('items');
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
  const [discountPercent, setDiscountPercent] = useState('0');
  const [shippingFee, setShippingFee] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [debtDeposit, setDebtDeposit] = useState('0');
  const [customName, setCustomName] = useState('Bó hoa tùy chỉnh');
  const [customPrice, setCustomPrice] = useState('500000');
  const [shop, setShop] = useState<ShopSettingsRecord | null>(null);
  const [completedSale, setCompletedSale] = useState<HydratedSale | null>(null);
  const [previewSale, setPreviewSale] = useState<HydratedSale | null>(null);
  const [previewMarkup, setPreviewMarkup] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [checkoutFeedback, setCheckoutFeedback] = useState('');

  useEffect(() => {
    void loadPosData();
  }, []);

  useEffect(() => {
    if (view !== 'invoices') return;
    let active = true;
    const timer = window.setTimeout(() => {
      searchSales(invoiceQuery, 100)
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
  }, [invoiceQuery, view]);

  async function loadPosData() {
    try {
      setError('');
      const [itemRows, recipeRows, shopRecord, photoMap, customerRows, saleRows] = await Promise.all([
        listItems(),
        listRecipes(),
        getShopSettings(),
        loadPhotoMap(),
        listCustomers(),
        listRecentSales(100),
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
      return [item.name, item.sku ?? '', item.category_name ?? ''].some((value) =>
        value.toLocaleLowerCase('vi-VN').includes(query),
      );
    });
  }, [items, catalogQuery]);

  const visibleRecipes = useMemo(() => {
    const query = catalogQuery.trim().toLocaleLowerCase('vi-VN');
    if (!query) return recipes;
    return recipes.filter((recipe) =>
      [recipe.name, recipe.color_tone ?? '', recipe.occasion ?? ''].some((value) =>
        value.toLocaleLowerCase('vi-VN').includes(query),
      ),
    );
  }, [recipes, catalogQuery]);

  const subtotal = useMemo(() => Math.round(cart.reduce((sum, line) => sum + lineTotal(line), 0)), [cart]);
  const safeDiscountPercent = useMemo(() => clampPercentage(Number(discountPercent)), [discountPercent]);
  const discountAmount = useMemo(
    () => Math.round((subtotal * safeDiscountPercent) / 100),
    [safeDiscountPercent, subtotal],
  );
  const totals = useMemo(
    () => calculateCartTotals(cart, discountAmount, Number(shippingFee)),
    [cart, discountAmount, shippingFee],
  );

  const checkoutAmounts = useMemo(() => {
    if (paymentMethod === 'bank_transfer' || paymentMethod === 'card') {
      return {
        paidAmount: totals.total,
        receivedAmount: totals.total,
        returnedAmount: 0,
        remainingAmount: 0,
      };
    }

    if (paymentMethod === 'cash') {
      const receivedAmount = cashReceived === '' ? totals.total : normalizeMoney(Number(cashReceived));
      return {
        paidAmount: Math.min(totals.total, receivedAmount),
        receivedAmount,
        returnedAmount: Math.max(0, receivedAmount - totals.total),
        remainingAmount: Math.max(0, totals.total - receivedAmount),
      };
    }

    const receivedAmount = normalizeMoney(Number(debtDeposit));
    const paidAmount = Math.min(totals.total, receivedAmount);
    return {
      paidAmount,
      receivedAmount,
      returnedAmount: 0,
      remainingAmount: Math.max(0, totals.total - paidAmount),
    };
  }, [cashReceived, debtDeposit, paymentMethod, totals.total]);

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
    setCheckoutFeedback('');
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
    setCompletedSale(null);
    setCheckoutFeedback('');
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
    setStatus(`Đã thêm ${item.name}.`);
    setError('');
  }

  function addRecipe(recipe: HydratedRecipe) {
    setCompletedSale(null);
    setCheckoutFeedback('');
    const parentLine: CartLine = {
      id: createLocalId('recipe-cart'),
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

    setCompletedSale(null);
    setCheckoutFeedback('');
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
    setStatus(`Đã thêm ${customName.trim()}.`);
    setError('');
  }

  function updateLine(id: string, patch: Partial<CartLine>) {
    setCheckoutFeedback('');
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
    setCheckoutFeedback('');
    setCart((current) => current.filter((line) => line.id !== id));
  }

  function clearCurrentSale() {
    if (cart.length > 0 && !window.confirm('Xóa toàn bộ đơn hiện tại?')) return;
    setCart([]);
    setCompletedSale(null);
    resetCheckoutFields();
    setStatus('Đã làm trống đơn hiện tại.');
    setError('');
  }

  async function checkoutAndSave() {
    if (saving) return;

    setCheckoutFeedback('');
    setError('');

    if (cart.length === 0) {
      setCheckoutFeedback('Chưa có sản phẩm trong giỏ. Hãy chọn hàng ở cột bên trái.');
      return;
    }

    if (safeDiscountPercent < 0 || safeDiscountPercent > 100) {
      setCheckoutFeedback('Chiết khấu phải nằm trong khoảng 0–100%.');
      return;
    }

    if (paymentMethod === 'cash' && checkoutAmounts.receivedAmount < totals.total) {
      setCheckoutFeedback('Tiền khách đưa chưa đủ. Hãy nhập đủ tiền hoặc chọn Công nợ.');
      return;
    }

    if (paymentMethod === 'debt' && checkoutAmounts.receivedAmount > totals.total) {
      setCheckoutFeedback('Số tiền thu trước không được lớn hơn tổng thanh toán.');
      return;
    }

    try {
      setSaving(true);
      setCheckoutFeedback('Đang lưu hóa đơn vào SQLite...');
      setStatus('');
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
        paidAmount: checkoutAmounts.paidAmount,
        receivedAmount: checkoutAmounts.receivedAmount,
        returnedAmount: checkoutAmounts.returnedAmount,
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

      setCompletedSale(sale);
      setCart([]);
      setCheckoutFeedback('');
      setCustomers(await listCustomers());
      setSavedSales(await listRecentSales(100));
      setStatus(`Đã lưu ${sale.sale.invoice_code}.`);
    } catch (caught) {
      console.error(caught);
      const message = checkoutFailureMessage(caught);
      setStatus('');
      setError(message);
      setCheckoutFeedback(message);
    } finally {
      setSaving(false);
    }
  }

  function resetCheckoutFields() {
    setSelectedCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setNote('');
    setDiscountPercent('0');
    setShippingFee('0');
    setPaymentMethod('cash');
    setCashReceived('');
    setDebtDeposit('0');
    setCheckoutFeedback('');
  }

  function startNewSale() {
    setCompletedSale(null);
    setCart([]);
    resetCheckoutFields();
    setCatalogQuery('');
    setView('sale');
    setStatus('Đã sẵn sàng tạo đơn mới.');
    setError('');
  }

  async function showInvoicePreview(sale: HydratedSale) {
    try {
      const printer = await getPrinterSettings();
      setPreviewSale(sale);
      setPreviewMarkup(renderInvoiceHtml(sale, shop, printer, { autoPrint: false }));
      setPreviewOpen(true);
      setError('');
    } catch (caught) {
      console.error(caught);
      setError('Không tạo được bản xem trước hóa đơn.');
    }
  }

  async function previewSavedSale(saleId: string) {
    try {
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

  function openSavedInvoice(invoiceCode: string) {
    setInvoiceQuery(invoiceCode);
    setView('invoices');
  }

  return (
    <>
      <div className="page-title-row pos-page-heading">
        <div>
          <span className="eyebrow">POS</span>
          <h2>{view === 'sale' ? 'Bán hàng tại quầy' : 'Tra cứu hóa đơn'}</h2>
          <p className="setup-muted">
            {view === 'sale'
              ? 'Giỏ hàng, cách tính tiền và nút thanh toán luôn nằm ở cột bên phải.'
              : 'Tìm theo mã hóa đơn, tên khách hoặc số điện thoại.'}
          </p>
        </div>
        <PillTabs value={view} onChange={setView} options={[...posViews]} />
      </div>

      {(status || error) && (
        <div className="setup-status-row">
          {status && <Badge tone="sage">{status}</Badge>}
          {error && <Badge tone="peach">{error}</Badge>}
        </div>
      )}

      {view === 'sale' ? (
        <div className="pos-standard-layout">
          <SoftCard className="pos-standard-catalog" title="Danh mục bán" description="Bấm sản phẩm để thêm; bấm lại để tăng số lượng.">
            <div className="pos-catalog-toolbar">
              <PillTabs value={catalogView} onChange={setCatalogView} options={[...catalogViews]} />
              <TextField value={catalogQuery} placeholder="Tìm tên, SKU hoặc nhóm hàng..." onChange={(event) => setCatalogQuery(event.target.value)} />
            </div>

            {catalogView === 'items' ? (
              <div className="pos-product-grid">
                {visibleItems.length === 0 && <p className="setup-muted">Không tìm thấy sản phẩm phù hợp.</p>}
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
            ) : (
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
                <span>Dùng cho bó hoa theo ngân sách riêng.</span>
              </div>
              <TextField value={customName} onChange={(event) => setCustomName(event.target.value)} />
              <TextField type="number" min={0} value={customPrice} onChange={(event) => setCustomPrice(event.target.value)} />
              <Button variant="soft" onClick={addCustomLine}>Thêm</Button>
            </div>
          </SoftCard>

          <aside className="pos-checkout-column">
            {completedSale ? (
              <SoftCard className="pos-completed-panel" title="Thanh toán thành công" description="Hóa đơn đã lưu vào SQLite local.">
                <div className="pos-success-mark">✓</div>
                <strong className="pos-completed-code">{completedSale.sale.invoice_code}</strong>
                <div className="pos-completed-summary">
                  <div><span>Khách hàng</span><strong>{completedSale.sale.customer_name ?? 'Khách lẻ'}</strong></div>
                  <div><span>Tổng thanh toán</span><strong>{formatCurrency(completedSale.sale.total)}</strong></div>
                  <div><span>Trạng thái</span><strong>{paymentStatusLabel(completedSale.sale.payment_status)}</strong></div>
                </div>
                <div className="pos-completed-actions">
                  <Button variant="soft" onClick={() => showInvoicePreview(completedSale)}>Xem hóa đơn</Button>
                  <Button onClick={() => printSale(completedSale)}>In hóa đơn</Button>
                  <Button variant="ghost" onClick={startNewSale}>Đơn mới</Button>
                  <Button variant="ghost" onClick={() => openSavedInvoice(completedSale.sale.invoice_code)}>Mở trong Hóa đơn</Button>
                </div>
              </SoftCard>
            ) : (
              <SoftCard className="pos-checkout-panel" title="Đơn đang bán" description={`${cart.length} dòng • ${cartQuantity} sản phẩm`}>
                <div className="pos-checkout-body">
                  <div className="pos-cart-header">
                    <strong>Giỏ hàng</strong>
                    <Button variant="ghost" onClick={clearCurrentSale} disabled={cart.length === 0}>Xóa đơn</Button>
                  </div>

                  <div className="pos-order-lines">
                    {cart.length === 0 && (
                      <div className="pos-empty-cart">
                        <span>Chưa có sản phẩm</span>
                        <p>Chọn sản phẩm ở cột bên trái.</p>
                      </div>
                    )}
                    {cart.map((line) => (
                      <div className="pos-order-line" key={line.id}>
                        <div className="pos-order-line-name">
                          <strong>{line.itemName}</strong>
                          <span>{formatCurrency(lineTotal(line))}</span>
                        </div>
                        <TextField label="SL" type="number" min={0.01} step={0.01} value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: Number(event.target.value) })} />
                        <TextField label="Giá" type="number" min={0} value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: Number(event.target.value) })} />
                        <Button variant="ghost" onClick={() => removeLine(line.id)}>Xóa</Button>
                      </div>
                    ))}
                  </div>

                  <div className="pos-checkout-section">
                    <h3>Khách hàng</h3>
                    <SelectField label="Khách có sẵn" value={selectedCustomerId} options={customerOptions} onChange={(event) => selectCustomer(event.target.value)} />
                    <div className="pos-two-fields">
                      <TextField label="Tên khách" value={customerName} placeholder="Khách lẻ" onChange={(event) => setCustomerName(event.target.value)} />
                      <TextField label="SĐT" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
                    </div>
                    <TextArea label="Ghi chú" value={note} onChange={(event) => setNote(event.target.value)} />
                  </div>

                  <div className="pos-checkout-section">
                    <h3>Tính tiền</h3>
                    <div className="pos-two-fields">
                      <TextField label="Chiết khấu (%)" type="number" min={0} max={100} step={1} value={discountPercent} onChange={(event) => { setDiscountPercent(event.target.value); setCheckoutFeedback(''); }} />
                      <TextField label="Phí giao" type="number" min={0} value={shippingFee} onChange={(event) => { setShippingFee(event.target.value); setCheckoutFeedback(''); }} />
                    </div>
                    <SelectField label="Phương thức" value={paymentMethod} options={paymentOptions} onChange={(event) => { setPaymentMethod(event.target.value as PaymentMethod); setCheckoutFeedback(''); }} />
                    {paymentMethod === 'cash' && (
                      <TextField label="Khách đưa" type="number" min={0} value={cashReceived === '' ? totals.total : cashReceived} onChange={(event) => { setCashReceived(event.target.value); setCheckoutFeedback(''); }} />
                    )}
                    {paymentMethod === 'debt' && (
                      <TextField label="Đã thu trước" type="number" min={0} max={totals.total} value={debtDeposit} onChange={(event) => { setDebtDeposit(event.target.value); setCheckoutFeedback(''); }} />
                    )}
                  </div>
                </div>

                <div className="pos-checkout-footer">
                  <div className="pos-payment-breakdown">
                    <div><span>Tạm tính</span><strong>{formatCurrency(totals.subtotal)}</strong></div>
                    <div><span>Chiết khấu ({safeDiscountPercent}%)</span><strong>-{formatCurrency(totals.discountAmount)}</strong></div>
                    <div><span>Phí giao</span><strong>{formatCurrency(totals.shippingFee)}</strong></div>
                    <div className="is-total"><span>TỔNG THANH TOÁN</span><strong>{formatCurrency(totals.total)}</strong></div>
                    {paymentMethod === 'cash' && checkoutAmounts.returnedAmount > 0 && (
                      <div className="is-change"><span>Tiền thừa</span><strong>{formatCurrency(checkoutAmounts.returnedAmount)}</strong></div>
                    )}
                    {checkoutAmounts.remainingAmount > 0 && paymentMethod === 'debt' && (
                      <div className="is-debt"><span>Còn nợ</span><strong>{formatCurrency(checkoutAmounts.remainingAmount)}</strong></div>
                    )}
                  </div>
                  {checkoutFeedback && (
                    <div className={`pos-checkout-feedback${saving ? ' is-progress' : ''}`} role="status" aria-live="polite">
                      {checkoutFeedback}
                    </div>
                  )}
                  <Button className="pos-primary-checkout" onClick={checkoutAndSave} disabled={saving}>
                    {saving
                      ? 'ĐANG LƯU HÓA ĐƠN...'
                      : cart.length === 0
                        ? 'CHỌN HÀNG ĐỂ THANH TOÁN'
                        : paymentMethod === 'debt'
                          ? `LƯU CÔNG NỢ • ${formatCurrency(totals.total)}`
                          : `THANH TOÁN & LƯU • ${formatCurrency(totals.total)}`}
                  </Button>
                  <p className="pos-checkout-hint">Sau khi lưu thành công, nút xem và in hóa đơn sẽ xuất hiện tại đây.</p>
                </div>
              </SoftCard>
            )}
          </aside>
        </div>
      ) : (
        <SoftCard className="pos-invoice-history" title="Hóa đơn đã lưu" description="Hóa đơn mới nhất nằm trên cùng. Xem trước mở bằng popup trong app.">
          <div className="pos-invoice-search">
            <TextField value={invoiceQuery} placeholder="Tìm mã hóa đơn, tên khách hoặc SĐT..." onChange={(event) => setInvoiceQuery(event.target.value)} />
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
                <Button variant="soft" onClick={() => previewSavedSale(sale.id)}>Xem</Button>
                <Button onClick={() => printSavedSale(sale.id)}>In lại</Button>
              </div>
            ))}
          </div>
        </SoftCard>
      )}

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

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value * 100) / 100));
}

function checkoutFailureMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
  const message = raw.toLowerCase();
  if (message.includes('insufficient stock')) return 'Không đủ tồn kho cho một hoặc nhiều sản phẩm trong đơn.';
  if (message.includes('sql.execute not allowed')) return 'Ứng dụng chưa có quyền ghi SQLite. Hãy cập nhật bản build mới nhất.';
  if (message.includes('database is locked')) return 'SQLite đang bị khóa. Hãy đóng các phiên Bloomia khác rồi thử lại.';
  return `Không lưu được hóa đơn: ${raw || 'Lỗi không xác định'}`;
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
