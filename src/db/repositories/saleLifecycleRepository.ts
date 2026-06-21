import { getDatabase } from '../client';
import { createLocalId } from '../../utils/id';
import { allocateFifo } from './inventoryRepository';
import {
  createSaleInvoiceCode,
  getSaleById,
  type CreateSaleInput,
  type HydratedSale,
  type PaymentQrSnapshotInput,
  type SaleLineDraft,
} from './salesRepository';

export interface PendingSaleInput {
  invoiceCode?: string;
  customerId?: string | null;
  customerName?: string;
  customerPhone?: string;
  note?: string;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  total: number;
  paymentMethod: CreateSaleInput['paymentMethod'];
  paymentQr?: PaymentQrSnapshotInput | null;
  replacesSaleId?: string | null;
  lines: SaleLineDraft[];
}

export interface FinalizeSalePaymentInput {
  paidAmount: number;
  receivedAmount: number;
  returnedAmount: number;
  transferConfirmedAt?: string | null;
}

interface SaleMovementRow {
  batch_id: string | null;
  quantity_out: number;
}

interface ItemTrackingRow {
  is_stock_tracked: number;
}

export async function createPendingSale(input: PendingSaleInput) {
  if (!input.lines.length) throw new Error('Đơn chờ thanh toán phải có ít nhất một sản phẩm.');
  const db = await getDatabase();
  const saleId = createLocalId('sale');
  const invoiceCode = cleanOptional(input.invoiceCode) ?? createSaleInvoiceCode();
  const qr = input.paymentQr;

  try {
    const customerId = cleanOptional(input.customerId) ?? await createCustomerIfNeeded(input.customerName, input.customerPhone);
    await db.execute(
      `INSERT INTO sales (
        id, invoice_code, customer_id, subtotal, discount_amount, shipping_fee, total,
        payment_status, sale_status, replaces_sale_id, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'unpaid', 'pending_payment', ?, ?)`,
      [saleId, invoiceCode, customerId, input.subtotal, input.discountAmount, input.shippingFee, input.total, cleanOptional(input.replacesSaleId), cleanOptional(input.note)],
    );

    await insertSaleLines(saleId, input.lines, false);
    await insertPlannedPayment(saleId, input.paymentMethod, qr);

    if (input.replacesSaleId) {
      await db.execute('UPDATE sales SET replaced_by_sale_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [saleId, input.replacesSaleId]);
    }
  } catch (error) {
    await deletePendingArtifacts(saleId).catch(() => undefined);
    throw error;
  }

  return getSaleById(saleId);
}

export async function updatePendingSale(saleId: string, input: PendingSaleInput) {
  const current = await getSaleById(saleId);
  assertPending(current);
  const db = await getDatabase();
  const snapshot = current;

  try {
    const customerId = cleanOptional(input.customerId) ?? await createCustomerIfNeeded(input.customerName, input.customerPhone);
    await db.execute(
      `UPDATE sales SET
        customer_id = ?, subtotal = ?, discount_amount = ?, shipping_fee = ?, total = ?,
        note = ?, revision_no = revision_no + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [customerId, input.subtotal, input.discountAmount, input.shippingFee, input.total, cleanOptional(input.note), saleId],
    );
    await db.execute('DELETE FROM sale_items WHERE sale_id = ?', [saleId]);
    await db.execute('DELETE FROM payments WHERE sale_id = ?', [saleId]);
    await insertSaleLines(saleId, input.lines, false);
    await insertPlannedPayment(saleId, input.paymentMethod, input.paymentQr);
  } catch (error) {
    await restorePendingSnapshot(snapshot).catch((restoreError) => console.error('Could not restore pending sale snapshot', restoreError));
    throw error;
  }

  return getSaleById(saleId);
}

export async function finalizePendingSale(saleId: string, input: FinalizeSalePaymentInput) {
  const sale = await getSaleById(saleId);
  assertPending(sale);
  const db = await getDatabase();
  const paidAmount = Math.max(0, Math.min(sale.sale.total, Math.round(input.paidAmount)));
  const receivedAmount = Math.max(paidAmount, Math.round(input.receivedAmount));
  const returnedAmount = Math.max(0, Math.round(input.returnedAmount));
  const paymentStatus = paidAmount >= sale.sale.total ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';
  const originalCosts = new Map(sale.items.map((item) => [item.id, item.cost_price]));

  try {
    for (const item of sale.items) {
      const costPrice = await allocateLineCost({
        itemId: item.item_id,
        itemName: item.item_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        costPrice: item.cost_price,
        note: item.note ?? undefined,
      }, saleId);
      await db.execute('UPDATE sale_items SET cost_price = ? WHERE id = ?', [costPrice, item.id]);
    }

    const payment = sale.payments[0];
    if (!payment) throw new Error('Đơn chờ thanh toán không có payment dự kiến.');
    await db.execute(
      `UPDATE payments SET
        amount = ?, received_amount = ?, returned_amount = ?,
        transfer_confirmed_at = COALESCE(?, transfer_confirmed_at), paid_at = CURRENT_TIMESTAMP,
        note = NULL
       WHERE id = ?`,
      [paidAmount, receivedAmount, returnedAmount, cleanOptional(input.transferConfirmedAt), payment.id],
    );
    await db.execute(
      `UPDATE sales SET
        payment_status = ?, sale_status = 'completed', finalized_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [paymentStatus, saleId],
    );
  } catch (error) {
    await reverseSaleInventory(saleId).catch(() => undefined);
    for (const [itemId, cost] of originalCosts) {
      await db.execute('UPDATE sale_items SET cost_price = ? WHERE id = ?', [cost, itemId]).catch(() => undefined);
    }
    throw error;
  }

  return getSaleById(saleId);
}

export async function cancelSale(saleId: string, reason: string) {
  const sale = await getSaleById(saleId);
  if (sale.sale.sale_status === 'cancelled') return sale;
  const db = await getDatabase();

  if (sale.sale.sale_status === 'completed') {
    await reverseSaleInventory(saleId);
  }

  const paidAmount = sale.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const refundStatus = paidAmount > 0 ? 'required' : 'not_required';
  await db.execute(
    `UPDATE sales SET
      sale_status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, cancel_reason = ?,
      refund_status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [cleanOptional(reason) ?? 'Khách hủy hoặc thao tác sai', refundStatus, saleId],
  );
  return getSaleById(saleId);
}

export async function markSaleRefunded(saleId: string) {
  const sale = await getSaleById(saleId);
  if (sale.sale.sale_status !== 'cancelled') throw new Error('Chỉ hóa đơn đã hủy mới có thể đánh dấu hoàn tiền.');
  const db = await getDatabase();
  await db.execute(
    "UPDATE sales SET refund_status = 'refunded', refunded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [saleId],
  );
  return getSaleById(saleId);
}

export async function recordSalePrint(saleId: string) {
  const db = await getDatabase();
  await db.execute(
    'UPDATE sales SET print_count = print_count + 1, last_printed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [saleId],
  );
}

async function insertSaleLines(saleId: string, lines: SaleLineDraft[], allocateStock: boolean) {
  const db = await getDatabase();
  for (const line of lines) {
    const costPrice = allocateStock ? await allocateLineCost(line, saleId) : Math.max(0, Math.round(line.costPrice ?? 0));
    await db.execute(
      'INSERT INTO sale_items (id, sale_id, item_id, item_name, quantity, unit_price, cost_price, line_total, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        createLocalId('sale-item'), saleId, line.itemId ?? null, line.itemName.trim(), line.quantity,
        Math.round(line.unitPrice), costPrice, Math.round(line.quantity * line.unitPrice), cleanOptional(line.note),
      ],
    );
  }
}

async function insertPlannedPayment(
  saleId: string,
  method: CreateSaleInput['paymentMethod'],
  qr?: PaymentQrSnapshotInput | null,
) {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO payments (
      id, sale_id, method, amount, received_amount, returned_amount,
      bank_bin, bank_code, bank_name, account_number, account_name,
      transfer_reference, qr_amount, qr_image_url, transfer_confirmed_at, note
    ) VALUES (?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'Chờ thanh toán')`,
    [
      createLocalId('payment'), saleId, method,
      cleanOptional(qr?.bankBin), cleanOptional(qr?.bankCode), cleanOptional(qr?.bankName),
      cleanOptional(qr?.accountNumber), cleanOptional(qr?.accountName), cleanOptional(qr?.transferReference),
      Math.max(0, Math.round(qr?.qrAmount ?? 0)), cleanOptional(qr?.qrImageUrl),
    ],
  );
}

async function restorePendingSnapshot(snapshot: HydratedSale) {
  const db = await getDatabase();
  await db.execute('DELETE FROM sale_items WHERE sale_id = ?', [snapshot.sale.id]);
  await db.execute('DELETE FROM payments WHERE sale_id = ?', [snapshot.sale.id]);
  await db.execute(
    `UPDATE sales SET customer_id = ?, subtotal = ?, discount_amount = ?, shipping_fee = ?, total = ?,
      note = ?, revision_no = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [
      snapshot.sale.customer_id, snapshot.sale.subtotal, snapshot.sale.discount_amount,
      snapshot.sale.shipping_fee, snapshot.sale.total, snapshot.sale.note,
      snapshot.sale.revision_no, snapshot.sale.id,
    ],
  );
  await insertSaleLines(snapshot.sale.id, snapshot.items.map((item) => ({
    itemId: item.item_id,
    itemName: item.item_name,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    costPrice: item.cost_price,
    note: item.note ?? undefined,
  })), false);
  const payment = snapshot.payments[0];
  if (payment) {
    await insertPlannedPayment(snapshot.sale.id, payment.method, {
      bankBin: payment.bank_bin ?? undefined,
      bankCode: payment.bank_code ?? undefined,
      bankName: payment.bank_name ?? undefined,
      accountNumber: payment.account_number ?? undefined,
      accountName: payment.account_name ?? undefined,
      transferReference: payment.transfer_reference ?? undefined,
      qrAmount: payment.qr_amount,
      qrImageUrl: payment.qr_image_url ?? undefined,
    });
  }
}

async function reverseSaleInventory(saleId: string) {
  const db = await getDatabase();
  const movements = await db.select<SaleMovementRow>(
    "SELECT batch_id, quantity_out FROM stock_movements WHERE reference_type = 'sale' AND reference_id = ?",
    [saleId],
  );
  for (const movement of movements) {
    if (!movement.batch_id || movement.quantity_out <= 0) continue;
    await db.execute(
      'UPDATE purchase_batches SET remaining_quantity = remaining_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [movement.quantity_out, movement.batch_id],
    );
  }
  await db.execute("DELETE FROM stock_movements WHERE reference_type = 'sale' AND reference_id = ?", [saleId]);
}

async function deletePendingArtifacts(saleId: string) {
  const db = await getDatabase();
  await db.execute('DELETE FROM payments WHERE sale_id = ?', [saleId]);
  await db.execute('DELETE FROM sale_items WHERE sale_id = ?', [saleId]);
  await db.execute('DELETE FROM sales WHERE id = ?', [saleId]);
}

async function allocateLineCost(line: SaleLineDraft, saleId: string) {
  if (!line.itemId || !(await isItemStockTracked(line.itemId))) return Math.max(0, Math.round(line.costPrice ?? 0));
  const allocations = await allocateFifo(line.itemId, line.quantity, {
    movementType: 'sale',
    referenceType: 'sale',
    referenceId: saleId,
    reason: 'Bán hàng',
    note: line.itemName,
    allowShortfall: true,
    shortfallUnitCost: Math.max(0, Math.round(line.costPrice ?? 0)),
  });
  const totalCost = allocations.reduce((sum, allocation) => sum + allocation.quantity * allocation.unitCost, 0);
  return Math.round(totalCost / line.quantity);
}

async function isItemStockTracked(itemId: string) {
  const db = await getDatabase();
  const rows = await db.select<ItemTrackingRow>('SELECT is_stock_tracked FROM items WHERE id = ? LIMIT 1', [itemId]);
  return Boolean(rows[0]?.is_stock_tracked);
}

async function createCustomerIfNeeded(name?: string, phone?: string) {
  const cleanName = cleanOptional(name);
  const cleanPhone = cleanOptional(phone);
  if (!cleanName && !cleanPhone) return null;
  const db = await getDatabase();
  if (cleanPhone) {
    const rows = await db.select<{ id: string }>('SELECT id FROM customers WHERE phone = ? LIMIT 1', [cleanPhone]);
    if (rows[0]?.id) return rows[0].id;
  }
  const id = createLocalId('customer');
  await db.execute('INSERT INTO customers (id, name, phone) VALUES (?, ?, ?)', [id, cleanName ?? 'Khách lẻ', cleanPhone]);
  return id;
}

function assertPending(sale: HydratedSale) {
  if (sale.sale.sale_status !== 'pending_payment') {
    throw new Error('Chỉ đơn đang chờ thanh toán mới có thể sửa hoặc chốt.');
  }
}

function cleanOptional(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}
