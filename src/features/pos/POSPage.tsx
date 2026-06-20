import { useEffect, useMemo, useState } from 'react';

import { Badge, Button, PillTabs, SelectField, SoftCard, TextArea, TextField } from '../../components/ui';
import { listCustomers, type CustomerRecord } from '../../db/repositories/customerRepository';
import type { ItemRecord, ShopSettingsRecord } from '../../db/repositories/manualSetupRepository';
import { getShopSettings, listItems } from '../../db/repositories/manualSetupRepository';
import { loadPhotoMap } from '../../db/repositories/photoStore';
import { getPrinterSettings } from '../../db/repositories/printerRepository';
import { listRecipes, type HydratedRecipe } from '../../db/repositories/recipesRepository';
import { createSale, getSaleById, listRecentSales, type HydratedSale, type PaymentMethod, type SaleRecord } from '../../db/repositories/salesRepository';
import { dispatchAIEvent } from '../../services/ai/desktopAIService';
import { calculateCartTotals, lineTotal, normalizeMoney, normalizeQuantity, type CartLine } from '../../services/pos/cart';
import { renderInvoiceHtml } from '../../services/printing/invoiceTemplate';
import { openPrintWindow, printInvoiceHtml as sendInvoiceToPrinter, testPrint } from '../../services/printing/printerService';
import { resolveMediaUrl } from '../../services/system/systemService';
import { createLocalId } from '../../utils/id';
import { formatCurrency } from '../../utils/format';
import { PrinterSettingsCard } from '../settings/PrinterSettingsCard';

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

function formatInvoiceDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function POSPage() {
  const [mode, setMode] = useState<OrderMode>('counter');
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [recipes, setRecipes] = useState<HydratedRecipe[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [recentSales, setRecentSales] = useState<SaleRecord[]>([]);
  const [itemPhotoUrls, setItemPhotoUrls] = useState<{ [key: string]: string }>({});
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
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [lastSale, setLastSale] = useState<HydratedSale | null>(null);
  const [shop, setShop] = useState<ShopSettingsRecord | null>(null);

  useEffect(() => { void loadCatalog(); }, []);

  async function loadCatalog() {
    try {
      setError('');
      const data = await Promise.all([listItems(), listRecipes(), getShopSettings(), loadPhotoMap(), listCustomers(), listRecentSales(12)]);
      setItems(data[0]);
      setRecipes(data[1]);
      setShop(data[2]);
      setCustomers(data[4]);
      setRecentSales(data[5]);
      const urls: { [key: string]: string } = {};
      for (const [itemId, path] of Object.entries(data[3])) urls[itemId] = await resolveMediaUrl(path);
      setItemPhotoUrls(urls);
    } catch (caught) {
      console.error(caught);
      setError('Không tải được sản phẩm/công thức/khách hàng/hóa đơn. Hãy dùng npm run tauri:dev.');
    }
  }

  async function refreshRecentSales() {
    setRecentSales(await listRecentSales(12));
  }

  const visibleItems = useMemo(() => items.filter((item) => item.is_active && item.default_sale_price >= 0), [items]);
  const totals = useMemo(() => calculateCartTotals(cart, Number(discountAmount), Number(shippingFee)), [cart, discountAmount, shippingFee]);
  const customerOptions = useMemo(() => [
    { label: 'Khách lẻ', value: '' },
    ...customers.map((customer) => ({ label: customer.phone ? `${customer.name} - ${customer.phone}` : customer.name, value: customer.id })),
  ], [customers]);

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

  function clearCustomer() {
    setSelectedCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
  }

  function addCatalogItem(item: ItemRecord) {
    setCart((current) => {
      const existing = current.find((line) => line.itemId === item.id && !line.isCustom);
      if (existing) return current.map((line) => line.id === existing.id ? { ...line, quantity: normalizeQuantity(line.quantity + 1) } : line);
      return [...current, { id: createLocalId('cart'), itemId: item.id, itemName: item.name, quantity: 1, unitPrice: item.default_sale_price, costPrice: item.default_purchase_price, note: item.item_type === 'service' ? 'Dịch vụ không trừ kho' : '' }];
    });
  }

  function addRecipe(recipe: HydratedRecipe) {
    const groupId = createLocalId('recipe-cart');
    const parentLine: CartLine = { id: groupId, itemId: null, itemName: recipe.name, quantity: 1, unitPrice: recipe.suggested_sale_price, costPrice: recipe.estimated_cost, isCustom: true, note: `Mẫu hoa • ${recipe.size_label ?? ''} • ${recipe.color_tone ?? ''}` };
    const ingredientLines: CartLine[] = recipe.items.map((item) => ({ id: createLocalId('recipe-ingredient'), itemId: item.item_id, itemName: `↳ ${item.item_name}`, quantity: item.quantity, unitPrice: 0, costPrice: item.default_sale_price, note: `Thành phần của ${recipe.name}` }));
    setCart((current) => [...current, parentLine, ...ingredientLines]);
    setStatus(`Đã thêm mẫu ${recipe.name}. Có thể sửa số lượng/thành phần trong chi tiết đơn.`);
  }

  function addCustomLine() {
    if (!customName.trim()) { setError('Tên dòng tùy chỉnh là bắt buộc.'); return; }
    setCart((current) => [...current, { id: createLocalId('cart-custom'), itemId: null, itemName: customName.trim(), quantity: 1, unitPrice: normalizeMoney(Number(customPrice)), costPrice: 0, isCustom: true }]);
    setCustomName('Bó hoa tùy chỉnh');
    setCustomPrice('500000');
    setError('');
  }

  function updateLine(id: string, patch: Partial<CartLine>) {
    setCart((current) => current.map((line) => line.id === id ? { ...line, ...patch, quantity: patch.quantity === undefined ? line.quantity : normalizeQuantity(patch.quantity), unitPrice: patch.unitPrice === undefined ? line.unitPrice : normalizeMoney(patch.unitPrice) } : line));
  }

  function removeLine(id: string) {
    setCart((current) => current.filter((line) => line.id !== id));
  }

  async function handleCheckout() {
    if (cart.length === 0) { setError('Chưa có sản phẩm/dịch vụ trong đơn.'); return; }
    try {
      setStatus('Đang lưu hóa đơn...');
      setError('');
      const paidAmount = paymentMethod === 'debt' ? 0 : totals.total;
      const sale = await createSale({ customerId: selectedCustomerId || null, customerName, customerPhone, note, subtotal: totals.subtotal, discountAmount: totals.discountAmount, shippingFee: totals.shippingFee, total: totals.total, paymentMethod, paidAmount, lines: cart.map((line) => ({ itemId: line.itemId, itemName: line.itemName, quantity: line.quantity, unitPrice: line.unitPrice, costPrice: line.costPrice ?? 0, note: line.note })) });
      void dispatchAIEvent('sale_created', `Đã tạo hóa đơn ${sale.sale.invoice_code}`, `Tổng tiền ${formatCurrency(sale.sale.total)}`, { saleId: sale.sale.id, invoiceCode: sale.sale.invoice_code, total: sale.sale.total }).catch((eventError) => console.warn('AI event dispatch failed', eventError));
      setLastSale(sale);
      setCart([]);
      clearCustomer();
      setNote('');
      setDiscountAmount('0');
      setShippingFee('0');
      setCustomers(await listCustomers());
      await refreshRecentSales();
      setStatus(`Đã lưu hóa đơn ${sale.sale.invoice_code}.`);
    } catch (caught) {
      console.error(caught);
      setStatus('');
      setError('Không lưu được hóa đơn. Kiểm tra tồn kho hoặc SQLite runtime.');
    }
  }

  async function previewSale(sale: HydratedSale) {
    const printer = await getPrinterSettings();
    openPrintWindow(renderInvoiceHtml(sale, shop, printer));
  }

  async function printSale(sale: HydratedSale) {
    const printer = await getPrinterSettings();
    const invoiceMarkup = renderInvoiceHtml(sale, shop, printer);
    await sendInvoiceToPrinter(invoiceMarkup, printer?.printer_name, printer?.paper_size ?? '80mm');
  }

  async function handlePreviewLastSale() {
    if (!lastSale) { setError('Chưa có hóa đơn để preview.'); return; }
    try {
      await previewSale(lastSale);
      setError('');
    } catch (caught) {
      console.error(caught);
      setError('Không mở được preview hóa đơn.');
    }
  }

  async function handlePrintLastSale() {
    if (!lastSale) { setError('Chưa có hóa đơn để in.'); return; }
    let invoiceMarkup = '';
    try {
      const printer = await getPrinterSettings();
      invoiceMarkup = renderInvoiceHtml(lastSale, shop, printer);
      await sendInvoiceToPrinter(invoiceMarkup, printer?.printer_name, printer?.paper_size ?? '80mm');
      setError('');
      setStatus(`Đã gửi lệnh in hóa đơn ${lastSale.sale.invoice_code} tới máy in local.`);
    } catch (caught) {
      console.error(caught);
      setStatus('');
      setError('In trực tiếp thất bại. Đã mở preview để in thủ công.');
      if (invoiceMarkup) openPrintWindow(invoiceMarkup);
    }
  }

  async function handleTestPrint() {
    try {
      setStatus('Đang gửi lệnh test in tới máy in local...');
      setError('');
      const printer = await getPrinterSettings();
      await testPrint(printer?.printer_name, printer?.paper_size ?? '80mm');
      setStatus('Đã gửi lệnh test in tới máy in local.');
    } catch (caught) {
      console.error(caught);
      setStatus('');
      setError('Test in thất bại. Kiểm tra máy in đã chọn trong Cài đặt → Máy in.');
    }
  }

  async function handlePreviewOldSale(saleId: string) {
    try {
      setError('');
      const sale = await getSaleById(saleId);
      await previewSale(sale);
    } catch (caught) {
      console.error(caught);
      setError('Không mở được preview hóa đơn cũ.');
    }
  }

  async function handleReprintOldSale(saleId: string) {
    let sale: HydratedSale | null = null;
    try {
      setStatus('Đang gửi lệnh in lại hóa đơn cũ...');
      setError('');
      sale = await getSaleById(saleId);
      await printSale(sale);
      setStatus(`Đã gửi lệnh in lại hóa đơn ${sale.sale.invoice_code} tới máy in local.`);
    } catch (caught) {
      console.error(caught);
      setStatus('');
      setError('In lại hóa đơn cũ thất bại. Đã mở preview để in thủ công.');
      if (sale) await previewSale(sale);
    }
  }

  return (
    <>
      <div className="page-title-row"><div><span className="eyebrow">Bán hàng</span><h2>Tạo hóa đơn bán lẻ</h2></div><PillTabs value={mode} onChange={setMode} options={[...orderModeOptions]} /></div>
      {(status || error) && <div className="setup-status-row">{status && <Badge tone="sage">{status}</Badge>}{error && <Badge tone="peach">{error}</Badge>}</div>}
      <div className="page-grid">
        <SoftCard className="span-8" title="Thông tin khách hàng" description="Chọn khách có sẵn hoặc để Khách lẻ."><div className="page-grid"><div className="span-6"><SelectField label="Chọn khách có sẵn" value={selectedCustomerId} options={customerOptions} onChange={(event) => selectCustomer(event.target.value)} /></div><div className="span-6" style={{ alignSelf: 'end' }}><Button variant="soft" onClick={clearCustomer}>Khách lẻ</Button></div><div className="span-6"><TextField label="Khách hàng" value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></div><div className="span-6"><TextField label="SĐT" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} /></div><div className="span-12"><TextArea label="Ghi chú đơn" value={note} placeholder="Tone màu, dịp tặng, lời nhắn thiệp..." onChange={(event) => setNote(event.target.value)} /></div></div></SoftCard>
        <SoftCard className="span-4" title="Thanh toán" description="POS chỉ hiển thị thông tin cần chốt đơn."><div className="pos-summary"><div className="pos-total-row"><span>Tạm tính</span><strong>{formatCurrency(totals.subtotal)}</strong></div><TextField label="Chiết khấu" type="number" min={0} value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} /><TextField label="Phí giao" type="number" min={0} value={shippingFee} onChange={(event) => setShippingFee(event.target.value)} /><SelectField label="Thanh toán" value={paymentMethod} options={paymentOptions} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} /><div className="pos-total-row pos-grand-total"><span>Tổng cộng</span><strong>{formatCurrency(totals.total)}</strong></div><Button onClick={handleCheckout}>Lưu hóa đơn</Button><Button variant="soft" onClick={handleTestPrint}>Test in</Button><Button variant="soft" onClick={handlePreviewLastSale} disabled={!lastSale}>Preview</Button><Button variant="soft" onClick={handlePrintLastSale} disabled={!lastSale}>In máy in đã chọn</Button></div></SoftCard>
        <SoftCard className="span-8" title="Mẫu hoa" description="Chọn recipe để bung thành phần vào giỏ, rồi sửa linh hoạt."><div className="pos-product-grid">{recipes.map((recipe) => <button key={recipe.id} type="button" className="pos-product-card" onClick={() => addRecipe(recipe)}><Badge tone="pink">{recipe.size_label ?? 'Mẫu'}</Badge><strong>{recipe.name}</strong><span>{recipe.color_tone ?? 'Chưa tone'} • vốn tạm {formatCurrency(recipe.estimated_cost)}</span><span>{formatCurrency(recipe.suggested_sale_price)}</span></button>)}</div></SoftCard>
        <SoftCard className="span-4" title="Dòng tùy chỉnh" description="Dùng cho đơn theo ngân sách khách."><div className="setup-form-grid"><TextField label="Tên dòng" value={customName} onChange={(event) => setCustomName(event.target.value)} /><TextField label="Giá bán" type="number" min={0} value={customPrice} onChange={(event) => setCustomPrice(event.target.value)} /><Button variant="soft" onClick={addCustomLine}>Thêm dòng tùy chỉnh</Button></div></SoftCard>
        <SoftCard className="span-12" title="Chọn sản phẩm / dịch vụ" description="Dữ liệu lấy từ Cài đặt → Hàng hóa & dịch vụ."><div className="pos-product-grid">{visibleItems.map((item) => <button key={item.id} type="button" className="pos-product-card" onClick={() => addCatalogItem(item)}>{itemPhotoUrls[item.id] && <img className="pos-product-image" src={itemPhotoUrls[item.id]} alt={item.name} />}<Badge tone={item.item_type === 'service' ? 'sage' : 'lavender'}>{item.item_type === 'service' ? 'Dịch vụ' : item.category_name ?? 'Sản phẩm'}</Badge><strong>{item.name}</strong><span>{formatCurrency(item.default_sale_price)}</span></button>)}</div></SoftCard>
        <SoftCard className="span-12" title="Chi tiết đơn hàng" description="Recipe có thể sửa số lượng/thành phần trước khi lưu."><div className="pos-cart-list">{cart.length === 0 && <p className="setup-muted">Chưa có dòng nào trong đơn.</p>}{cart.map((line) => <div className="pos-cart-row" key={line.id}><div className="pos-cart-name"><strong>{line.itemName}</strong><span>{line.isCustom ? line.note ?? 'Dòng tùy chỉnh' : line.note || 'Từ danh mục'}</span></div><TextField label="SL" type="number" min={0.01} step={0.01} value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: Number(event.target.value) })} /><TextField label="Giá" type="number" min={0} value={line.unitPrice} onChange={(event) => updateLine(line.id, { unitPrice: Number(event.target.value) })} /><div className="pos-line-total"><span>Thành tiền</span><strong>{formatCurrency(lineTotal(line))}</strong></div><Button variant="ghost" onClick={() => removeLine(line.id)}>Xóa</Button></div>)}</div></SoftCard>
        <SoftCard className="span-12" title="Hóa đơn gần đây" description="In lại hóa đơn cũ hoặc mở preview để in thủ công."><div className="pos-cart-list">{recentSales.length === 0 && <p className="setup-muted">Chưa có hóa đơn gần đây.</p>}{recentSales.map((sale) => <div className="pos-cart-row" key={sale.id} style={{ gridTemplateColumns: '1.2fr 1fr 140px auto auto' }}><div className="pos-cart-name"><strong>{sale.invoice_code}</strong><span>{formatInvoiceDate(sale.sale_date)}</span></div><div className="pos-cart-name"><strong>{sale.customer_name ?? 'Khách lẻ'}</strong><span>{sale.payment_status}</span></div><div className="pos-line-total"><span>Tổng tiền</span><strong>{formatCurrency(sale.total)}</strong></div><Button variant="soft" onClick={() => handlePreviewOldSale(sale.id)}>Preview</Button><Button onClick={() => handleReprintOldSale(sale.id)}>In lại</Button></div>)}</div></SoftCard>
        <PrinterSettingsCard />
      </div>
    </>
  );
}
