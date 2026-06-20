import type { HydratedSale } from '../../db/repositories/salesRepository';
import type { PrinterSettingsRecord } from '../../db/repositories/printerRepository';
import type { ShopSettingsRecord } from '../../db/repositories/manualSetupRepository';
import { formatCurrency } from '../../utils/format';

export function renderInvoiceHtml(sale: HydratedSale, shop: ShopSettingsRecord | null, printer: PrinterSettingsRecord | null) {
  const paperSize = printer?.paper_size ?? '80mm';
  const width = paperSize === '58mm' ? '58mm' : paperSize === 'A4' ? '190mm' : '80mm';
  const paidAmount = sale.payments.reduce((sum, payment) => sum + payment.amount, 0);

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${sale.sale.invoice_code}</title>
  <style>
    @page { size: ${paperSize === 'A4' ? 'A4' : width} auto; margin: 8mm; }
    body { font-family: Arial, sans-serif; color: #2e2630; margin: 0; }
    .invoice { width: ${width}; margin: 0 auto; }
    .center { text-align: center; }
    .muted { color: #6f6270; font-size: 12px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    h2 { font-size: 15px; margin: 12px 0 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px dashed #cfc2ce; padding: 6px 0; text-align: left; vertical-align: top; }
    th:last-child, td:last-child { text-align: right; }
    .totals { margin-top: 10px; font-size: 13px; }
    .row { display: flex; justify-content: space-between; gap: 12px; margin: 4px 0; }
    .total { font-weight: 700; font-size: 16px; }
    .footer { border-top: 1px dashed #cfc2ce; margin-top: 14px; padding-top: 10px; text-align: center; }
    @media print { button { display: none; } .invoice { margin: 0; } }
  </style>
</head>
<body>
  <main class="invoice">
    <section class="center">
      <h1>${escapeHtml(shop?.name ?? 'Bloomia Florist')}</h1>
      <div class="muted">${escapeHtml(shop?.phone ?? '')}</div>
      <div class="muted">${escapeHtml(shop?.address ?? '')}</div>
    </section>

    <h2 class="center">HÓA ĐƠN BÁN LẺ</h2>
    <div class="muted">Mã: ${sale.sale.invoice_code}</div>
    <div class="muted">Ngày: ${new Date(sale.sale.sale_date).toLocaleString('vi-VN')}</div>
    <div class="muted">Khách: ${escapeHtml(sale.sale.customer_name ?? 'Khách lẻ')}</div>

    <table>
      <thead>
        <tr><th>Sản phẩm</th><th>SL</th><th>Tiền</th></tr>
      </thead>
      <tbody>
        ${sale.items
          .map(
            (item) => `<tr>
              <td>${escapeHtml(item.item_name)}<div class="muted">${formatCurrency(item.unit_price)}</div></td>
              <td>${item.quantity}</td>
              <td>${formatCurrency(item.line_total)}</td>
            </tr>`,
          )
          .join('')}
      </tbody>
    </table>

    <section class="totals">
      <div class="row"><span>Tạm tính</span><span>${formatCurrency(sale.sale.subtotal)}</span></div>
      <div class="row"><span>Chiết khấu</span><span>${formatCurrency(sale.sale.discount_amount)}</span></div>
      <div class="row"><span>Phí giao</span><span>${formatCurrency(sale.sale.shipping_fee)}</span></div>
      <div class="row total"><span>Tổng cộng</span><span>${formatCurrency(sale.sale.total)}</span></div>
      <div class="row"><span>Đã thanh toán</span><span>${formatCurrency(paidAmount)}</span></div>
    </section>

    <section class="footer">
      <p>${escapeHtml(shop?.invoice_footer ?? 'Cảm ơn quý khách đã ghé Bloomia.')}</p>
    </section>
  </main>
  <script>window.onload = () => setTimeout(() => window.print(), 150);</script>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
