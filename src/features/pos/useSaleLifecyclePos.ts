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
  cancelSale,
  createPendingSale,
  finalizePendingSale,
  markSaleRefunded,
  recordSalePrint,
  updatePendingSale,
  type PendingSaleInput,
} from '../../db/repositories/saleLifecycleRepository';
import {
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

export type LifecyclePosView = 'sale' | 'invoices';
export type LifecycleCatalogView = 'items' | 'recipes';

export function useSaleLifecyclePos() {
  const [view, setView] = useState<LifecyclePosView>('sale');
  const [catalogView, setCatalogView] = useState<LifecycleCatalogView>('items');
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
  const [editingPendingId, setEditingPendingId] = useState<string | null>(null);
  const [replacementSourceId, setReplacementSourceId] = useState<string | null>(null);
  const [pendingSale, setPendingSale] = useState<HydratedSale | null>(null);
  const [completedSale, setCompletedSale] = useState<HydratedSale | null>(null);
  const [deviceSettings, setDeviceSettings] = useState<DevicePaymentSettings>(defaultDevicePaymentSettings);
  const [shop, setShop] = useState<ShopSettingsRecord | null>(null);
  const [customName, setCustomName] = useState('Bó hoa tùy chỉnh');
  const [customPrice, setCustomPrice] = useState('500000');
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
    const timer = window.setTimeout(() => {
      void searchSales(invoiceQuery, 100).then(setSavedSales).catch(() => setError('Không tìm được hóa đơn.'));
    }, 220);
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
      setItems(itemRows);
      setRecipes(recipeRows);
      setShop(shopRow);
      setCustomers(customerRows);
      setSavedSales(saleRows);
      setDeviceSettings(settings);
      const urls: Record<string, string> = {};
      for (const [id, path] of Object.entries(photoMap as Record<string, string>)) urls[id] = await resolveMediaUrl(path);
      setItemPhotoUrls(urls);
    } catch (caught) {
      console.error(caught);
      setError('Không tải được dữ liệu bán hàng.');
    }
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
  const transferImage = useMemo(
    () => paymentMethod === 'bank_transfer' ? buildVietQrSnapshot(deviceSettings, totals.total, draftInvoiceCode, deviceSettings.qrSize === 'large' ? 'print' : 'qr_only') : null,
    [deviceSettings, totals.total, draftInvoiceCode, paymentMethod],
  );
  const cartQuantity = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart]);
  const customerOptions = useMemo(() => [{ label: 'Khách lẻ', value: '' }, ...customers.map((row) => ({ label: row.phone ? `${row.name} — ${row.phone}` : row.name, value: row.id }))], [customers]);

  const checkoutAmounts = useMemo(() => {
    if (paymentMethod === 'bank_transfer') {
      const received = transferConfirmed ? totals.total : 0;
      return { paid: received, received, returned: 0, remaining: totals.total - received };
    }
    if (paymentMethod === 'card') return { paid: totals.total, received: totals.total, returned: 0, remaining: 0 };
    if (paymentMethod === 'cash') {
      const received = cashReceived === '' ? totals.total : normalizeMoney(Number(cashReceived));
      return { paid: Math.min(received, totals.total), received, returned: Math.max(0, received - totals.total), remaining: Math.max(0, totals.total - received) };
    }
    const received = normalizeMoney(Number(debtDeposit));
    return { paid: Math.min(received, totals.total), received, returned: 0, remaining: Math.max(0, totals.total - received) };
  }, [paymentMethod, transferConfirmed, totals.total, cashReceived, debtDeposit]);

  function selectCustomer(id: string) {
    setSelectedCustomerId(id);
    const row = customers.find((customer) => customer.id === id);
    setCustomerName(row?.name ?? '');
    setCustomerPhone(row?.phone ?? '');
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
    setCompletedSale(null);
    setCart((current) => [...current, main, ...parts]);
  }

  function addCustom() {
    if (!customName.trim()) { setError('Nhập tên dòng tùy chỉnh.'); return; }
    setCart((current) => [...current, { id: createLocalId('custom'), itemId: null, itemName: customName.trim(), quantity: 1, unitPrice: normalizeMoney(Number(customPrice)), costPrice: 0, isCustom: true }]);
  }

  function updateLine(id: string, patch: Partial<CartLine>) {
    setCart((current) => current.map((line) => line.id === id ? {
      ...line,
      ...patch,
      quantity: patch.quantity === undefined ? line.quantity : normalizeQuantity(patch.quantity),
      unitPrice: patch.unitPrice === undefined ? line.unitPrice : normalizeMoney(patch.unitPrice),
    } : line));
  }

  function removeLine(id: string) { setCart((current) => current.filter((line) => line.id !== id)); }
  function changeMethod(method: PaymentMethod) { setPaymentMethod(method); setTransferConfirmed(false); setCheckoutFeedback(''); }

  function buildPendingInput(): PendingSaleInput {
    return {
      invoiceCode: draftInvoiceCode,
      customerId: selectedCustomerId || null,
      customerName,
      customerPhone,
      note,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      shippingFee: totals.shippingFee,
      total: totals.total,
      paymentMethod,
      paymentQr: transferImage ? {
        bankBin: transferImage.bankBin,
        bankCode: transferImage.bankCode,
        bankName: transferImage.bankName,
        accountNumber: transferImage.accountNumber,
        accountName: transferImage.accountName,
        transferReference: transferImage.transferReference,
        qrAmount: transferImage.amount,
        qrImageUrl: transferImage.imageUrl,
      } : null,
      replacesSaleId: replacementSourceId,
      lines: toSaleLines(cart),
    };
  }

  async function saveAndPrintPaymentSlip() {
    if (saving) return;
    setCheckoutFeedback('');
    setError('');
    if (!cart.length) { setCheckoutFeedback('Chưa có sản phẩm trong giỏ.'); return; }
    if (paymentMethod === 'bank_transfer' && !transferImage) {
      setCheckoutFeedback('Chưa cấu hình tài khoản VietQR trong Cài đặt.');
      return;
    }
    try {
      setSaving(true);
      setCheckoutFeedback('Đang lưu đơn chờ thanh toán...');
      const sale = editingPendingId
        ? await updatePendingSale(editingPendingId, buildPendingInput())
        : await createPendingSale(buildPendingInput());
      setEditingPendingId(sale.sale.id);
      setPendingSale(sale);
      setCheckoutFeedback('');
      setStatus(`Đã lưu đơn chờ thanh toán ${sale.sale.invoice_code}. Chưa trừ kho, chưa tính doanh thu.`);
      setSavedSales(await listRecentSales(100));
      await printDocument(sale);
    } catch (caught) {
      const message = errorText(caught);
      setError(message);
      setCheckoutFeedback(message);
    } finally {
      setSaving(false);
    }
  }

  async function finalizeCurrentPayment() {
    if (!pendingSale || saving) return;
    if (paymentMethod === 'bank_transfer' && !transferConfirmed) {
      setCheckoutFeedback('Hãy kiểm tra tài khoản và xác nhận đã nhận đúng chuyển khoản.');
      return;
    }
    if (paymentMethod === 'cash' && checkoutAmounts.received < pendingSale.sale.total) {
      setCheckoutFeedback('Tiền khách đưa chưa đủ.');
      return;
    }
    try {
      setSaving(true);
      setCheckoutFeedback('Đang chốt thanh toán và trừ kho...');
      const sale = await finalizePendingSale(pendingSale.sale.id, {
        paidAmount: checkoutAmounts.paid,
        receivedAmount: checkoutAmounts.received,
        returnedAmount: checkoutAmounts.returned,
        transferConfirmedAt: paymentMethod === 'bank_transfer' ? new Date().toISOString() : null,
      });
      setPendingSale(null);
      setCompletedSale(sale);
      setEditingPendingId(null);
      setReplacementSourceId(null);
      setCart([]);
      setCheckoutFeedback('');
      setStatus(`Đã chốt ${sale.sale.invoice_code}. Kho và doanh thu đã được cập nhật.`);
      setSavedSales(await listRecentSales(100));
      await printDocument(sale);
      void dispatchAIEvent('sale_created', `Đã chốt hóa đơn ${sale.sale.invoice_code}`, `Tổng tiền ${formatCurrency(sale.sale.total)}`, { saleId: sale.sale.id }).catch(() => undefined);
    } catch (caught) {
      const message = errorText(caught);
      setError(message);
      setCheckoutFeedback(message);
    } finally {
      setSaving(false);
    }
  }

  async function quickFinalize() {
    if (saving) return;
    if (!cart.length) { setCheckoutFeedback('Chưa có sản phẩm trong giỏ.'); return; }
    if (paymentMethod === 'cash' && checkoutAmounts.received < totals.total) { setCheckoutFeedback('Tiền khách đưa chưa đủ.'); return; }
    try {
      setSaving(true);
      const draft = await createPendingSale(buildPendingInput());
      const sale = await finalizePendingSale(draft.sale.id, {
        paidAmount: checkoutAmounts.paid,
        receivedAmount: checkoutAmounts.received,
        returnedAmount: checkoutAmounts.returned,
      });
      setCompletedSale(sale);
      setCart([]);
      setStatus(`Đã chốt ${sale.sale.invoice_code}.`);
      setSavedSales(await listRecentSales(100));
      if (deviceSettings.autoPrintAfterPayment) await printDocument(sale);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setSaving(false);
    }
  }

  function editPending() {
    if (!pendingSale) return;
    populateEditor(pendingSale, true);
    setPendingSale(null);
    setStatus('Đang sửa đơn chờ thanh toán. Sau khi sửa cần in lại phiếu thanh toán.');
  }

  async function editSaleById(id: string) {
    try {
      const sale = await getSaleById(id);
      if (sale.sale.sale_status === 'pending_payment') {
        populateEditor(sale, true);
        setStatus(`Đang sửa ${sale.sale.invoice_code}.`);
      } else if (sale.sale.sale_status === 'completed') {
        const confirmed = window.confirm('Hóa đơn đã chốt. Bloomia sẽ hủy hóa đơn cũ, hoàn kho và tạo đơn điều chỉnh mới. Tiếp tục?');
        if (!confirmed) return;
        const reason = window.prompt('Lý do sửa hóa đơn:', 'Thao tác sai cần lập hóa đơn thay thế') ?? '';
        const cancelled = await cancelSale(id, reason);
        populateEditor(cancelled, false);
        setReplacementSourceId(id);
        setStatus(cancelled.sale.refund_status === 'required'
          ? 'Đã hủy hóa đơn cũ và hoàn kho. Cần hoàn tiền cho khách trước khi chốt đơn thay thế.'
          : 'Đã hủy hóa đơn cũ và hoàn kho. Đang tạo đơn thay thế.');
      } else {
        populateEditor(sale, false);
        setStatus('Đang tạo lại đơn từ hóa đơn đã hủy.');
      }
      setView('sale');
      setCompletedSale(null);
      setPendingSale(null);
      setSavedSales(await listRecentSales(100));
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function cancelSaleById(id: string) {
    const reason = window.prompt('Lý do hủy đơn:', 'Khách hủy đơn')?.trim();
    if (!reason) return;
    try {
      const cancelled = await cancelSale(id, reason);
      if (pendingSale?.sale.id === id) setPendingSale(null);
      if (completedSale?.sale.id === id) setCompletedSale(cancelled);
      setSavedSales(await listRecentSales(100));
      setStatus(cancelled.sale.refund_status === 'required'
        ? `Đã hủy ${cancelled.sale.invoice_code}, hoàn kho và đánh dấu cần hoàn tiền.`
        : `Đã hủy ${cancelled.sale.invoice_code}.`);
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function markRefundedById(id: string) {
    if (!window.confirm('Xác nhận đã hoàn tiền cho khách?')) return;
    try {
      await markSaleRefunded(id);
      setSavedSales(await listRecentSales(100));
      setStatus('Đã ghi nhận hoàn tiền cho khách.');
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  function populateEditor(sale: HydratedSale, preserveInvoiceCode: boolean) {
    setCart(sale.items.map((item) => ({
      id: createLocalId('cart'),
      itemId: item.item_id,
      itemName: item.item_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      costPrice: item.cost_price,
      note: item.note ?? undefined,
    })));
    setSelectedCustomerId(sale.sale.customer_id ?? '');
    setCustomerName(sale.sale.customer_name ?? '');
    setCustomerPhone(sale.sale.customer_phone ?? '');
    setNote(sale.sale.note ?? '');
    setDiscountPercent(sale.sale.subtotal > 0 ? String(Math.round((sale.sale.discount_amount / sale.sale.subtotal) * 10000) / 100) : '0');
    setShippingFee(String(sale.sale.shipping_fee));
    setPaymentMethod(sale.payments[0]?.method ?? 'cash');
    setCashReceived('');
    setDebtDeposit(String(sale.payments[0]?.amount ?? 0));
    setTransferConfirmed(false);
    setDraftInvoiceCode(preserveInvoiceCode ? sale.sale.invoice_code : createSaleInvoiceCode());
    setEditingPendingId(preserveInvoiceCode ? sale.sale.id : null);
  }

  async function previewDocument(sale: HydratedSale) {
    const printer = await getPrinterSettings();
    setPreviewSale(sale);
    setPreviewMarkup(renderInvoiceHtml(sale, shop, printer, { autoPrint: false }));
    setPreviewOpen(true);
  }

  async function previewById(id: string) {
    try { await previewDocument(await getSaleById(id)); }
    catch { setError('Không mở được hóa đơn.'); }
  }

  async function printDocument(sale: HydratedSale) {
    try {
      const printer = await getPrinterSettings();
      const markup = renderInvoiceHtml(sale, shop, printer, { autoPrint: false });
      await printInvoiceHtml(markup, printer?.printer_name, printer?.paper_size ?? '80mm', null, deviceSettings.copies);
      await recordSalePrint(sale.sale.id);
      setStatus(`${sale.sale.sale_status === 'pending_payment' ? 'Đã in phiếu thanh toán' : 'Đã in hóa đơn'} trên ${printer?.printer_name || 'máy in mặc định'}.`);
    } catch (caught) {
      setError(`Không in được: ${caught instanceof Error ? caught.message : String(caught)}`);
      throw caught;
    }
  }

  async function printById(id: string) {
    try { await printDocument(await getSaleById(id)); }
    catch { /* error is set by printDocument */ }
  }

  function newSale() {
    setCart([]);
    setStockWarnings([]);
    setSelectedCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setNote('');
    setDiscountPercent('0');
    setShippingFee('0');
    setPaymentMethod('cash');
    setCashReceived('');
    setDebtDeposit('0');
    setTransferConfirmed(false);
    setDraftInvoiceCode(createSaleInvoiceCode());
    setEditingPendingId(null);
    setReplacementSourceId(null);
    setPendingSale(null);
    setCompletedSale(null);
    setCheckoutFeedback('');
    setView('sale');
  }

  return {
    view, setView, catalogView, setCatalogView, catalogQuery, setCatalogQuery, invoiceQuery, setInvoiceQuery,
    visibleItems, visibleRecipes, itemPhotoUrls, cart, stockWarnings, customerOptions, selectedCustomerId, selectCustomer,
    customerName, setCustomerName, customerPhone, setCustomerPhone, note, setNote, discountPercent, setDiscountPercent,
    shippingFee, setShippingFee, paymentMethod, changeMethod, cashReceived, setCashReceived, debtDeposit, setDebtDeposit,
    transferConfirmed, setTransferConfirmed, transferImage, deviceSettings, customName, setCustomName, customPrice, setCustomPrice,
    pendingSale, completedSale, previewSale, previewMarkup, previewOpen, setPreviewOpen, saving, status, error, checkoutFeedback,
    totals, discountRate, checkoutAmounts, cartQuantity, savedSales, addItem, addRecipe, addCustom, updateLine, removeLine,
    saveAndPrintPaymentSlip, finalizeCurrentPayment, quickFinalize, editPending, editSaleById, cancelSaleById, markRefundedById,
    newSale, previewDocument, previewById, printDocument, printById,
  };
}

function toSaleLines(cart: CartLine[]) {
  return cart.map((line) => ({
    itemId: line.itemId,
    itemName: line.itemName,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    costPrice: line.costPrice ?? 0,
    note: line.note,
  }));
}

function clampPercent(value: number) {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value * 100) / 100)) : 0;
}

function errorText(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  return `Không xử lý được đơn: ${raw}`;
}
