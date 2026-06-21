import { getDatabase } from '../client';
import { createLocalId } from '../../utils/id';
import { allocateFifo, getItemStock } from './inventoryRepository';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'debt';
export type SaleStatus = 'pending_payment' | 'completed' | 'cancelled';
export type RefundStatus = 'not_required' | 'required' | 'refunded';

export interface SaleLineDraft {
  itemId?: string | null;
  itemName: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  note?: string;
}

export interface SaleStockWarning {
  itemId: string;
  itemName: string;
  requestedQuantity: number;
  availableQuantity: number;
  shortfallQuantity: number;
}

export interface PaymentQrSnapshotInput {
  bankBin?: string;
  bankCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  transferReference?: string;
  qrAmount?: number;
  qrImageUrl?: string;
  transferConfirmedAt?: string | null;
}

export interface CreateSaleInput {
  invoiceCode?: string;
  customerId?: string | null;
  customerName?: string;
  customerPhone?: string;
  note?: string;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  receivedAmount: number;
  returnedAmount: number;
  paymentQr?: PaymentQrSnapshotInput | null;
  lines: SaleLineDraft[];
}

export interface SaleRecord {
  id: string;
  invoice_code: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone?: string | null;
  sale_date: string;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total: number;
  payment_status: string;
  sale_status: SaleStatus;
  finalized_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  refund_status: RefundStatus;
  refunded_at: string | null;
  revision_no: number;
  print_count: number;
  last_printed_at: string | null;
  replaces_sale_id: string | null;
  replaced_by_sale_id: string | null;
  note: string | null;
}

export interface SaleItemRecord {
  id: string;
  sale_id: string;
  item_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  line_total: number;
  note: string | null;
}

export interface PaymentRecord {
  id: string;
  sale_id: string;
  method: PaymentMethod;
  amount: number;
  received_amount: number;
  returned_amount: number;
  bank_bin: string | null;
  bank_code: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  transfer_reference: string | null;
  qr_amount: number;
  qr_image_url: string | null;
  transfer_confirmed_at: string | null;
  paid_at: string;
  note: string | null;
}

export interface HydratedSale {
  sale: SaleRecord;
  items: SaleItemRecord[];
  payments: PaymentRecord[];
}

interface SaleMovementCleanupRecord {
  batch_id: string | null;
  quantity_out: number;
}

const saleListSelect = `SELECT
  sales.*,
  customers.name AS customer_name,
  customers.phone AS customer_phone
FROM sales
LEFT JOIN customers ON customers.id = sales.customer_id`;

export async function createSale(input: CreateSaleInput) {
  if (input.lines.length === 0) throw new Error('Sale needs line items.');

  const db = await getDatabase();
  const saleId = createLocalId('sale');
  const invoiceCode = cleanOptional(input.invoiceCode) ?? createSaleInvoiceCode();
  const paidAmount = Math.max(0, Math.min(input.total, Math.round(input.paidAmount)));
  const receivedAmount = Math.max(paidAmount, Math.round(input.receivedAmount));
  const returnedAmount = Math.max(0, Math.round(input.returnedAmount));
  const paymentStatus = paidAmount >= input.total ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';
  const qr = input.paymentQr;

  try {
    const selectedCustomerId = cleanOptional(input.customerId);
    const customerId = selectedCustomerId ?? await createCustomerIfNeeded(input.customerName, input.customerPhone);

    await db.execute(
      `INSERT INTO sales (
        id, invoice_code, customer_id, subtotal, discount_amount, shipping_fee, total,
        payment_status, sale_status, finalized_at, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', CURRENT_TIMESTAMP, ?)`,
      [saleId, invoiceCode, customerId, input.subtotal, input.discountAmount, input.shippingFee, input.total, paymentStatus, cleanOptional(input.note)],
    );

    for (const line of input.lines) {
      const costPrice = await allocateLineCost(line, saleId);
      await db.execute(
        'INSERT INTO sale_items (id, sale_id, item_id, item_name, quantity, unit_price, cost_price, line_total, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [createLocalId('sale-item'), saleId, line.itemId ?? null, line.itemName.trim(), line.quantity, line.unitPrice, costPrice, Math.round(line.quantity * line.unitPrice), cleanOptional(line.note)],
      );
    }

    await db.execute(
      `INSERT INTO payments (
        id, sale_id, method, amount, received_amount, returned_amount,
        bank_bin, bank_code, bank_name, account_number, account_name,
        transfer_reference, qr_amount, qr_image_url, transfer_confirmed_at, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        createLocalId('payment'), saleId, input.paymentMethod, paidAmount, receivedAmount, returnedAmount,
        cleanOptional(qr?.bankBin), cleanOptional(qr?.bankCode), cleanOptional(qr?.bankName), cleanOptional(qr?.accountNumber), cleanOptional(qr?.accountName),
        cleanOptional(qr?.transferReference), Math.max(0, Math.round(qr?.qrAmount ?? 0)), cleanOptional(qr?.qrImageUrl), cleanOptional(qr?.transferConfirmedAt), null,
      ],
    );
  } catch (error) {
    try {
      await cleanupFailedSale(saleId);
    } catch (cleanupError) {
      console.error('Bloomia could not fully clean up a failed sale save.', cleanupError);
    }
    throw error;
  }

  return getSaleById(saleId);
}

export async function getSaleStockWarnings(lines: SaleLineDraft[]): Promise<SaleStockWarning[]> {
  const totals = new Map<string, { itemName: string; quantity: number }>();
  for (const line of lines) {
    if (!line.itemId || !(await isItemStockTracked(line.itemId))) continue;
    const current = totals.get(line.itemId);
    totals.set(line.itemId, { itemName: current?.itemName ?? line.itemName, quantity: (current?.quantity ?? 0) + line.quantity });
  }

  const warnings: SaleStockWarning[] = [];
  for (const [itemId, item] of totals) {
    const availableQuantity = Number(await getItemStock(itemId));
    if (availableQuantity >= item.quantity) continue;
    warnings.push({ itemId, itemName: item.itemName, requestedQuantity: item.quantity, availableQuantity, shortfallQuantity: Math.round((item.quantity - availableQuantity) * 100) / 100 });
  }
  return warnings;
}

export async function getSaleById(id: string): Promise<HydratedSale> {
  const db = await getDatabase();
  const saleRows = await db.select<SaleRecord>(`${saleListSelect} WHERE sales.id = ? LIMIT 1`, [id]);
  const sale = saleRows[0];
  if (!sale) throw new Error(`Sale not found: ${id}`);
  const items = await db.select<SaleItemRecord>('SELECT * FROM sale_items WHERE sale_id = ? ORDER BY created_at ASC', [id]);
  const payments = await db.select<PaymentRecord>('SELECT * FROM payments WHERE sale_id = ? ORDER BY paid_at ASC', [id]);
  return { sale, items, payments };
}

export async function listRecentSales(limit = 50) {
  const db = await getDatabase();
  return db.select<SaleRecord>(`${saleListSelect} ORDER BY sales.sale_date DESC LIMIT ?`, [limit]);
}

export async function searchSales(query: string, limit = 80) {
  const cleanQuery = query.trim();
  if (!cleanQuery) return listRecentSales(limit);
  const db = await getDatabase();
  const pattern = `%${cleanQuery}%`;
  return db.select<SaleRecord>(
    `${saleListSelect}
     WHERE sales.invoice_code LIKE ? COLLATE NOCASE
        OR customers.name LIKE ? COLLATE NOCASE
        OR customers.phone LIKE ? COLLATE NOCASE
        OR sales.sale_status LIKE ? COLLATE NOCASE
     ORDER BY sales.sale_date DESC
     LIMIT ?`,
    [pattern, pattern, pattern, pattern, limit],
  );
}

export function createSaleInvoiceCode() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = `${now.getHours()}`.padStart(2, '0') + `${now.getMinutes()}`.padStart(2, '0') + `${now.getSeconds()}`.padStart(2, '0');
  return `BLM-${date}-${time}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function cleanupFailedSale(saleId: string) {
  const db = await getDatabase();
  const movements = await db.select<SaleMovementCleanupRecord>(
    `SELECT batch_id, quantity_out FROM stock_movements WHERE reference_type = 'sale' AND reference_id = ?`,
    [saleId],
  );
  for (const movement of movements) {
    if (!movement.batch_id || movement.quantity_out <= 0) continue;
    await db.execute('UPDATE purchase_batches SET remaining_quantity = remaining_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [movement.quantity_out, movement.batch_id]);
  }
  await db.execute("DELETE FROM stock_movements WHERE reference_type = 'sale' AND reference_id = ?", [saleId]);
  await db.execute('DELETE FROM payments WHERE sale_id = ?', [saleId]);
  await db.execute('DELETE FROM sale_items WHERE sale_id = ?', [saleId]);
  await db.execute('DELETE FROM sales WHERE id = ?', [saleId]);
}

async function allocateLineCost(line: SaleLineDraft, saleId: string) {
  if (!line.itemId || !(await isItemStockTracked(line.itemId))) return line.costPrice ?? 0;
  const fallbackCost = Math.max(0, Math.round(line.costPrice ?? 0));
  const allocations = await allocateFifo(line.itemId, line.quantity, {
    movementType: 'sale', referenceType: 'sale', referenceId: saleId, reason: 'Bán hàng', note: line.itemName, allowShortfall: true, shortfallUnitCost: fallbackCost,
  });
  const totalCost = allocations.reduce((sum, allocation) => sum + allocation.quantity * allocation.unitCost, 0);
  return Math.round(totalCost / line.quantity);
}

async function isItemStockTracked(itemId: string) {
  const db = await getDatabase();
  const rows = await db.select<{ is_stock_tracked: number }>('SELECT is_stock_tracked FROM items WHERE id = ? LIMIT 1', [itemId]);
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

function cleanOptional(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}
