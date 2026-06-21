import type { HydratedSale, PaymentMethod } from '../../db/repositories/salesRepository';
import type { PrinterSettingsRecord } from '../../db/repositories/printerRepository';
import type { ShopSettingsRecord } from '../../db/repositories/manualSetupRepository';
import { formatCurrency } from '../../utils/format';

interface InvoiceRenderOptions {
  autoPrint?: boolean;
}

const paymentLabels: Record<PaymentMethod, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  card: 'Thẻ',
  debt: 'Công nợ',
};

export function renderInvoiceHtml(
  sale: HydratedSale,
  shop: ShopSettingsRecord | null,
  printer: PrinterSettingsRecord | null,
  options: InvoiceRenderOptions = {},
) {
  const paperSize = printer?.paper_size ?? '80mm';
  const width = paperSize === '58mm' ? '58mm' : paperSize === 'A4' ? '190mm' : '80mm';
  const paidAmount = sale.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const receivedAmount = sale.payments.reduce((sum, payment) => sum + (payment.received_amount > 0 ? payment.received_amount : payment.amount), 0);
  const returnedAmount = sale.payments.reduce((sum, payment) => sum + (payment.returned_amount ?? 0), 0);
  const remainingAmount = Math.max(0, sale.sale.total - paidAmount);
  const payment = sale.payments[0];
  const paymentMethod = payment?.method;
  const isPending = sale.sale.sale_status === 'pending_payment';
  const isCancelled = sale.sale.sale_status === 'cancelled';
  const documentTitle = isPending ? 'PHIẾU THANH TOÁN' : isCancelled ? 'HÓA ĐƠN ĐÃ HỦY' : 'HÓA ĐƠN BÁN LẺ';
  const statusText = isPending
    ? 'CHƯA THANH TOÁN — KHÔNG TÍNH DOANH THU'
    : isCancelled
      ? `ĐÃ HỦY${sale.sale.cancel_reason ? ` — ${sale.sale.cancel_reason}` : ''}`
      : sale.sale.payment_status === 'paid'
        ? 'ĐÃ THANH TOÁN'
        : sale.sale.payment_status === 'partial'
          ? 'THANH TOÁN MỘT PHẦN'
          : 'CÔNG NỢ';
  const showTransferImage = Boolean(payment?.qr_image_url && (isPending || remainingAmount > 0));
  const autoPrintScript = options.autoPrint === false ? '' : '<script>window.onload = () => setTimeout(() => window.print(), 150);</script>';

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${sale.sale.invoice_code}</title>
  <style>
    @page { size: ${paperSize === 'A4' ? 'A4' : width} auto; margin: 8mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #2e2630; margin: 0; background: #fff; }
    .invoice { width: ${width}; max-width: 100%; margin: 0 auto; padding: 12px; }
    .center { text-align: center; }
    .muted { color: #6f6270; font-size: 12px; }
    .status { border: 1px solid #b9aab7; font-size: 11px; font-weight: 700; margin: 8px 0; padding: 6px; text-align: center; }
    .status.pending { border-color: #b68a35; color: #8a651f; }
    .status.cancelled { border-color: #b34d6c; color: #9d3f5b; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    h2 { font-size: 15px; margin: 12px 0 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px dashed #cfc2ce; padding: 6px 0; text-align: left; vertical-align: top; }
    th:last-child, td:last-child { text-align: right; }
    .totals { margin-top: 10px; font-size: 13px; }
    .row { display: flex; justify-content: space-between; gap: 12px; margin: 4px 0; }
    .row span:last-child { text-align: right; }
    .total { font-weight: 700; font-size: 16px; border-top: 1px solid #d8ccd6; padding-top: 7px; margin-top: 7px; }
    .remaining { color: #b05d7a; font-weight: 700; }
    .transfer-image { border-top: 1px dashed #cfc2ce; margin-top: 12px; padding-top: 10px; text-align: center; }
    .transfer-image img { display: block; margin: 8px auto; max-width: 220px; width: 100%; }
    .footer { border-top: 1px dashed #cfc2ce; margin-top: 14px; padding-top: 10px; text-align: center; }
    @media print { button { display: none; } .invoice { margin: 0; padding: 0; } }
  </style>
</head>
<body>
  <main class="invoice">
    <section class="center">
      <h1>${escapeHtml(shop?.name ?? 'Bloomia Florist')}</h1>
      <div class="muted">${escapeHtml(shop?.phone ?? '')}</div>
      <div class="muted">${escapeHtml(shop?.address ?? '')}</div>
    </section>

    <h2 class="center">${documentTitle}</h2>
    <div class="status${isPending ? ' pending' : isCancelled ? ' cancelled' : ''}">${escapeHtml(statusText)}</div>
    <div class="muted">Mã: ${sale.sale.invoice_code}</div>
    <div class="muted">Ngày tạo: ${new Date(sale.sale.sale_date).toLocaleString('vi-VN')}</div>
    ${sale.sale.finalized_at ? `<div class="muted">Ngày chốt: ${new Date(sale.sale.finalized_at).toLocaleString('vi-VN')}</div>` : ''}
    <div class="muted">Khách: ${escapeHtml(sale.sale.customer_name ?? 'Khách lẻ')}</div>
    ${sale.sale.customer_phone ? `<div class="muted">SĐT: ${escapeHtml(sale.sale.customer_phone)}</div>` : ''}

    <table>
      <thead><tr><th>Sản phẩm</th><th>SL</th><th>Tiền</th></tr></thead>
      <tbody>${sale.items.map((item) => `<tr><td>${escapeHtml(item.item_name)}<div class="muted">${formatCurrency(item.unit_price)}</div></td><td>${item.quantity}</td><td>${formatCurrency(item.line_total)}</td></tr>`).join('')}</tbody>
    </table>

    <section class="totals">
      <div class="row"><span>Tạm tính</span><span>${formatCurrency(sale.sale.subtotal)}</span></div>
      <div class="row"><span>Chiết khấu</span><span>-${formatCurrency(sale.sale.discount_amount)}</span></div>
      <div class="row"><span>Phí giao</span><span>${formatCurrency(sale.sale.shipping_fee)}</span></div>
      <div class="row total"><span>Tổng thanh toán</span><span>${formatCurrency(sale.sale.total)}</span></div>
      <div class="row"><span>Phương thức</span><span>${paymentMethod ? paymentLabels[paymentMethod] : 'Chưa rõ'}</span></div>
      <div class="row"><span>Đã thu</span><span>${formatCurrency(paidAmount)}</span></div>
      ${receivedAmount > paidAmount ? `<div class="row"><span>Khách đưa</span><span>${formatCurrency(receivedAmount)}</span></div>` : ''}
      ${returnedAmount > 0 ? `<div class="row"><span>Tiền thừa</span><span>${formatCurrency(returnedAmount)}</span></div>` : ''}
      ${remainingAmount > 0 ? `<div class="row remaining"><span>Còn phải thu</span><span>${formatCurrency(remainingAmount)}</span></div>` : ''}
    </section>

    ${showTransferImage ? `<section class="transfer-image"><strong>Quét mã để thanh toán</strong><img src="${escapeHtml(payment.qr_image_url ?? '')}" alt="Mã chuyển khoản" /><div class="muted">${escapeHtml(payment.bank_name ?? payment.bank_code ?? '')} • ${escapeHtml(payment.account_number ?? '')}</div><div class="muted">${escapeHtml(payment.account_name ?? '')}</div><div class="muted">Nội dung: ${escapeHtml(payment.transfer_reference ?? '')}</div></section>` : ''}

    ${isPending ? '<section class="footer"><p>Phiếu này dùng để thanh toán, chưa phải hóa đơn đã thu tiền.</p></section>' : `<section class="footer"><p>${escapeHtml(shop?.invoice_footer ?? 'Cảm ơn quý khách đã ghé Bloomia.')}</p></section>`}
  </main>
  ${autoPrintScript}
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
