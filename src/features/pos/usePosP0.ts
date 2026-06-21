import { useEffect, useMemo, useState } from 'react';

import { listCustomers, type CustomerRecord } from '../../db/repositories/customerRepository';
import {
  defaultDevicePaymentSettings,
  getDevicePaymentSettings,
  type DevicePaymentSettings,
} from '../../db/repositories/devicePaymentSettingsRepository';
import { getShopSettings, listItems, type ItemRecord, type ShopSettingsRecord } from '../../db/repositories/manualSetupRepository';
import { loadPhotoMap } from '../../db/repositories/photoStore';
import { getPrinterSettings } from '../../db/repositories/printerRepository';
import { listRecipes, type HydratedRecipe } from '../../db/repositories/recipesRepository';
import {
  createSale,
  createSaleInvoiceCode,
  getSaleById,
  getSaleStockWarnings,
  listRecentSales,
  searchSales,
  type HydratedSale,
  type PaymentMethod,
  type SaleRecord,
  type SaleStockWarning,
} from '../../db/repositories/salesRepository';
import { dispatchAIEvent } from '../../services/ai/desktopAIService';
import { buildVietQrSnapshot } from '../../services/payment/vietQrService';
import { calculateCartTotals, lineTotal, normalizeMoney, normalizeQuantity, type CartLine } from '../../services/pos/cart';
import { renderInvoiceHtml } from '../../services/printing/invoiceTemplate';
import { printInvoiceHtml } from '../../services/printing/printerService';
import { resolveMediaUrl } from '../../services/system/systemService';
import { formatCurrency } from '../../utils/format';
import { createLocalId } from '../../utils/id';

export type PosP0View = 'sale' | 'invoices';
export type PosP0CatalogView = 'items' | 'recipes';

export function usePosP0() {
  const [view, setView] = useState<PosP0View>('sale');
  const [catalogView, setCatalogView] = useState<PosP0CatalogView>('items');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [recipes, setRecipes] = useState<HydratedRecipe[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [savedSales, setSavedSales] = useState<SaleRecord[]>([]);
  const [itemPhotoUrls, setItemPhotoUrls] = useState<Record<string, string>>({});
  const [cart, setCart] = useState<CartLine[]>([]);
  const [stockWarnings, setStockWarnings] = useState<SaleStockWarning[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [note, setNote] = useState('');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [shippingFee, setShippingFee] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [debtDeposit, setDebtDeposit] = useState('0');
  const [transferConfirmed, setTransferConfirmed] = useState(false);
  const [draftInvoiceCode, setDraftInvoiceCode] = useState(createSaleInvoiceCode);
  const [deviceSettings, setDeviceSettings] = useState<DevicePaymentSettings>(defaultDevicePaymentSettings);
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

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (view !== 'invoices') return;
    const timer = window.setTimeout(() => void searchSales(invoiceQuery, 100).then(setSavedSales).catch(() => setError('Không tìm được hóa đơn.')), 220);
    return () => window.clearTimeout(timer);
  }, [invoiceQuery, view]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!cart.length) { setStockWarnings([]); return; }
      void getSaleStockWarnings(toSaleLines(cart)).then(setStockWarnings).catch(() => setStockWarnings([]));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [cart]);

  async function load() {
    try {
      const [itemRows, recipeRows, shopRow, photoMap, customerRows, saleRows, settings] = await Promise.all([
        listItems(), listRecipes(), getShopSettings(), loadPhotoMap(), listCustomers(), listRecentSales(100), getDevicePaymentSettings(),
      ]);
      setItems(itemRows); setRecipes(recipeRows); setShop(shopRow); setCustomers(customerRows); setSavedSales(saleRows); setDeviceSettings(settings);
      const urls: Record<string, string> = {};
      for (const [id, path] of Object.entries(photoMap as Record<string, string>)) urls[id] = await resolveMediaUrl(path);
      setItemPhotoUrls(urls);
    } catch (caught) { console.error(caught); setError('Không tải được dữ liệu bán hàng.'); }
  }

  const visibleItems = useMemo(() => {
    const query = catalogQuery.trim().toLocaleLowerCase('vi-VN');
    return items.filter((item) => item.is_active && item.default_sale_price >= 0 && (!query || [item.name, item.sku ?? '', item.category_name ?? ''].some((value) => value.toLocaleLowerCase('vi-VN').includes(query))));
  }, [items, catalogQuery]);

  const visibleRecipes = useMemo(() => {
    const query = catalogQuery.trim().toLocaleLowerCase('vi-VN');
    return query ? recipes.filter((row) => [row.name, row.color_tone ?? '', row.occasion ?? ''].some((value) => value.toLocaleLowerCase('vi-VN').includes(query))) : recipes;
  }, [recipes, catalogQuery]);

  const subtotal = useMemo(() => Math.round(cart.reduce((sum, line) => sum + lineTotal(line), 0)), [cart]);
  const discountRate = useMemo(() => clampPercent(Number(discountPercent)), [discountPercent]);
  const discountAmount = useMemo(() => Math.round(subtotal * discountRate / 100), [subtotal, discountRate]);
  const totals = useMemo(() => calculateCartTotals(cart, discountAmount, Number(shippingFee)), [cart, discountAmount, shippingFee]);
  const transferImage = useMemo(() => paymentMethod === 'bank_transfer' ? buildVietQrSnapshot(deviceSettings, totals.total, draftInvoiceCode, deviceSettings.qrSize === 'large' ? 'print' : 'qr_only') : null, [deviceSettings, totals.total, draftInvoiceCode, paymentMethod]);
  const cartQuantity = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart]);
  const customerOptions = useMemo(() => [{ label: 'Khách lẻ', value: '' }, ...customers.map((row) => ({ label: row.phone ? `${row.name} — ${row.phone}` : row.name, value: row.id }))], [customers]);

  const checkoutAmounts = useMemo(() => {
    if (paymentMethod === 'bank_transfer') { const value = transferConfirmed ? totals.total : 0; return { paid: value, received: value, returned: 0, remaining: totals.total - value }; }
    if (paymentMethod === 'card') return { paid: totals.total, received: totals.total, returned: 0, remaining: 0 };
    if (paymentMethod === 'cash') { const received = cashReceived === '' ? totals.total : normalizeMoney(Number(cashReceived)); return { paid: Math.min(received, totals.total), received, returned: Math.max(0, received - totals.total), remaining: Math.max(0, totals.total - received) }; }
    const received = normalizeMoney(Number(debtDeposit)); return { paid: Math.min(received, totals.total), received, returned: 0, remaining: Math.max(0, totals.total - received) };
  }, [paymentMethod, transferConfirmed, totals.total, cashReceived, debtDeposit]);

  function selectCustomer(id: string) {
    setSelectedCustomerId(id); setCheckoutFeedback('');
    const row = customers.find((customer) => customer.id === id);
    setCustomerName(row?.name ?? ''); setCustomerPhone(row?.phone ?? '');
  }

  function addItem(item: ItemRecord) {
    setCompletedSale(null);
    setCart((current) => {
      const existing = current.find((line) => line.itemId === item.id && !line.isCustom);
      if (existing) return current.map((line) => line.id === existing.id ? { ...line, quantity: normalizeQuantity(line.quantity + 1) } : line);
      return [...current, { id: createLocalId('cart'), itemId: item.id, itemName: item.name, quantity: 1, unitPrice: item.default_sale_price, costPrice: item.default_purchase_price }];
    });
  }

  function addRecipe(recipe: HydratedRecipe) {
    const main: CartLine = { id: createLocalId('recipe'), itemId: null, itemName: recipe.name, quantity: 1, unitPrice: recipe.suggested_sale_price, costPrice: recipe.estimated_cost, isCustom: true };
    const parts: CartLine[] = recipe.items.map((item) => ({ id: createLocalId('part'), itemId: item.item_id, itemName: `↳ ${item.item_name}`, quantity: item.quantity, unitPrice: 0, costPrice: item.default_sale_price }));
    setCompletedSale(null); setCart((current) => [...current, main, ...parts]);
  }

  function addCustom() {
    if (!customName.trim()) { setError('Nhập tên dòng tùy chỉnh.'); return; }
    setCompletedSale(null); setCart((current) => [...current, { id: createLocalId('custom'), itemId: null, itemName: customName.trim(), quantity: 1, unitPrice: normalizeMoney(Number(customPrice)), costPrice: 0, isCustom: true }]);
  }

  function updateLine(id: string, patch: Partial<CartLine>) { setCart((current) => current.map((line) => line.id === id ? { ...line, ...patch, quantity: patch.quantity === undefined ? line.quantity : normalizeQuantity(patch.quantity), unitPrice: patch.unitPrice === undefined ? line.unitPrice : normalizeMoney(patch.unitPrice) } : line)); }
  function removeLine(id: string) { setCart((current) => current.filter((line) => line.id !== id)); }
  function changeMethod(method: PaymentMethod) { setPaymentMethod(method); setTransferConfirmed(false); setCheckoutFeedback(''); }

  async function saveCurrentSale() {
    if (saving) return;
    setCheckoutFeedback(''); setError('');
    if (!cart.length) { setCheckoutFeedback('Chưa có sản phẩm trong giỏ.'); return; }
    if (paymentMethod === 'cash' && checkoutAmounts.received < totals.total) { setCheckoutFeedback('Tiền khách đưa chưa đủ.'); return; }
    if (paymentMethod === 'bank_transfer' && !transferImage) { setCheckoutFeedback('Chưa cấu hình tài khoản nhận tiền trong Cài đặt.'); return; }
    if (paymentMethod === 'bank_transfer' && !transferConfirmed) { setCheckoutFeedback('Hãy xác nhận đã nhận đúng chuyển khoản.'); return; }
    try {
      setSaving(true); setCheckoutFeedback('Đang lưu hóa đơn...');
      const warnings = await getSaleStockWarnings(toSaleLines(cart)); setStockWarnings(warnings);
      const sale = await createSale({
        invoiceCode: draftInvoiceCode, customerId: selectedCustomerId || null, customerName, customerPhone, note,
        subtotal: totals.subtotal, discountAmount: totals.discountAmount, shippingFee: totals.shippingFee, total: totals.total,
        paymentMethod, paidAmount: checkoutAmounts.paid, receivedAmount: checkoutAmounts.received, returnedAmount: checkoutAmounts.returned,
        paymentQr: transferImage ? { bankBin: transferImage.bankBin, bankCode: transferImage.bankCode, bankName: transferImage.bankName, accountNumber: transferImage.accountNumber, accountName: transferImage.accountName, transferReference: transferImage.transferReference, qrAmount: transferImage.amount, qrImageUrl: transferImage.imageUrl, transferConfirmedAt: new Date().toISOString() } : null,
        lines: toSaleLines(cart),
      });
      setCompletedSale(sale); setCart([]); setCheckoutFeedback(''); setSavedSales(await listRecentSales(100)); setCustomers(await listCustomers());
      setStatus(`Đã lưu ${sale.sale.invoice_code}${warnings.length ? ` • ${warnings.length} cảnh báo tồn kho` : ''}.`);
      void dispatchAIEvent('sale_created', `Đã tạo hóa đơn ${sale.sale.invoice_code}`, `Tổng tiền ${formatCurrency(sale.sale.total)}`, { saleId: sale.sale.id }).catch(() => undefined);
      if (deviceSettings.autoPrintAfterPayment) void printSale(sale);
    } catch (caught) { console.error(caught); const message = errorText(caught); setError(message); setCheckoutFeedback(message); }
    finally { setSaving(false); }
  }

  function newSale() {
    setCompletedSale(null); setCart([]); setStockWarnings([]); setSelectedCustomerId(''); setCustomerName(''); setCustomerPhone(''); setNote('');
    setDiscountPercent('0'); setShippingFee('0'); setPaymentMethod('cash'); setCashReceived(''); setDebtDeposit('0'); setTransferConfirmed(false); setDraftInvoiceCode(createSaleInvoiceCode()); setView('sale');
  }

  async function preview(sale: HydratedSale) { const printer = await getPrinterSettings(); setPreviewSale(sale); setPreviewMarkup(renderInvoiceHtml(sale, shop, printer, { autoPrint: false })); setPreviewOpen(true); }
  async function previewById(id: string) { try { await preview(await getSaleById(id)); } catch { setError('Không mở được hóa đơn.'); } }
  async function printSale(sale: HydratedSale) {
    const printer = await getPrinterSettings();
    const markup = renderInvoiceHtml(sale, shop, printer, { autoPrint: false });
    const imageUrl = deviceSettings.printQr ? sale.payments[0]?.qr_image_url : null;
    await printInvoiceHtml(markup, printer?.printer_name, printer?.paper_size ?? '80mm', imageUrl, deviceSettings.copies);
  }
  async function printById(id: string) { try { await printSale(await getSaleById(id)); } catch { setError('Không in được hóa đơn.'); } }

  return {
    view, setView, catalogView, setCatalogView, catalogQuery, setCatalogQuery, invoiceQuery, setInvoiceQuery,
    visibleItems, visibleRecipes, itemPhotoUrls, cart, stockWarnings, customerOptions, selectedCustomerId, selectCustomer,
    customerName, setCustomerName, customerPhone, setCustomerPhone, note, setNote, discountPercent, setDiscountPercent,
    shippingFee, setShippingFee, paymentMethod, changeMethod, cashReceived, setCashReceived, debtDeposit, setDebtDeposit,
    transferConfirmed, setTransferConfirmed, transferImage, deviceSettings, customName, setCustomName, customPrice, setCustomPrice,
    completedSale, previewSale, previewMarkup, previewOpen, setPreviewOpen, saving, status, error, checkoutFeedback,
    totals, discountRate, checkoutAmounts, cartQuantity, savedSales, addItem, addRecipe, addCustom, updateLine, removeLine,
    saveCurrentSale, newSale, preview, previewById, printSale, printById,
  };
}

function toSaleLines(cart: CartLine[]) { return cart.map((line) => ({ itemId: line.itemId, itemName: line.itemName, quantity: line.quantity, unitPrice: line.unitPrice, costPrice: line.costPrice ?? 0, note: line.note })); }
function clampPercent(value: number) { return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value * 100) / 100)) : 0; }
function errorText(error: unknown) { const raw = error instanceof Error ? error.message : String(error); return `Không lưu được hóa đơn: ${raw}`; }
