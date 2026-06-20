import { getDatabase } from '../client';
import { createLocalId } from '../../utils/id';

export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'debt';

export interface SaleLineDraft {
  itemId?: string | null;
  itemName: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  note?: string;
}

export interface CreateSaleInput {
  customerName?: string;
  customerPhone?: string;
  note?: string;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  lines: SaleLineDraft[];
}

export interface SaleRecord {
  id: string;
  invoice_code: string;
  customer_id: string | null;
  customer_name: string | null;
  sale_date: string;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total: number;
  payment_status: string;
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
  paid_at: string;
  note: string | null;
}

export interface HydratedSale {
  sale: SaleRecord;
  items: SaleItemRecord[];
  payments: PaymentRecord[];
}

export async function createSale(input: CreateSaleInput) {
  if (input.lines.length === 0) {
    throw new Error('Cannot create sale without line items.');
  }

  const db = await getDatabase();
  const saleId = createLocalId('sale');
  const invoiceCode = createInvoiceCode();
  const customerId = await createCustomerIfNeeded(input.customerName, input.customerPhone);
  const paymentStatus = input.paidAmount >= input.total ? 'paid' : input.paidAmount > 0 ? 'partial' : 'unpaid';

  await db.execute(
    `INSERT INTO sales (
      id, invoice_code, customer_id, subtotal, discount_amount, shipping_fee, total, payment_status, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      saleId,
      invoiceCode,
      customerId,
      input.subtotal,
      input.discountAmount,
      input.shippingFee,
      input.total,
      paymentStatus,
      cleanOptional(input.note),
    ],
  );

  for (const line of input.lines) {
    const lineTotal = Math.round(line.quantity * line.unitPrice);
    await db.execute(
      `INSERT INTO sale_items (
        id, sale_id, item_id, item_name, quantity, unit_price, cost_price, line_total, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        createLocalId('sale-item'),
        saleId,
        line.itemId ?? null,
        line.itemName.trim(),
        line.quantity,
        line.unitPrice,
        line.costPrice ?? 0,
        lineTotal,
        cleanOptional(line.note),
      ],
    );
  }

  await db.execute(
    `INSERT INTO payments (id, sale_id, method, amount, note)
     VALUES (?, ?, ?, ?, ?)`,
    [createLocalId('payment'), saleId, input.paymentMethod, input.paidAmount, null],
  );

  return getSaleById(saleId);
}

export async function getSaleById(id: string): Promise<HydratedSale> {
  const db = await getDatabase();
  const saleRows = await db.select<SaleRecord>(
    `SELECT sales.*, customers.name AS customer_name
     FROM sales
     LEFT JOIN customers ON customers.id = sales.customer_id
     WHERE sales.id = ?
     LIMIT 1`,
    [id],
  );

  const sale = saleRows[0];
  if (!sale) {
    throw new Error(`Sale not found: ${id}`);
  }

  const [items, payments] = await Promise.all([
    db.select<SaleItemRecord>('SELECT * FROM sale_items WHERE sale_id = ? ORDER BY created_at ASC', [id]),
    db.select<PaymentRecord>('SELECT * FROM payments WHERE sale_id = ? ORDER BY paid_at ASC', [id]),
  ]);

  return { sale, items, payments };
}

export async function listRecentSales(limit = 12) {
  const db = await getDatabase();
  return db.select<SaleRecord>(
    `SELECT sales.*, customers.name AS customer_name
     FROM sales
     LEFT JOIN customers ON customers.id = sales.customer_id
     ORDER BY sales.sale_date DESC
     LIMIT ?`,
    [limit],
  );
}

async function createCustomerIfNeeded(name?: string, phone?: string) {
  const cleanName = cleanOptional(name);
  const cleanPhone = cleanOptional(phone);

  if (!cleanName && !cleanPhone) {
    return null;
  }

  const db = await getDatabase();
  if (cleanPhone) {
    const rows = await db.select<{ id: string }>('SELECT id FROM customers WHERE phone = ? LIMIT 1', [cleanPhone]);
    if (rows[0]?.id) {
      return rows[0].id;
    }
  }

  const id = createLocalId('customer');
  await db.execute(
    `INSERT INTO customers (id, name, phone)
     VALUES (?, ?, ?)`,
    [id, cleanName ?? 'Khách lẻ', cleanPhone],
  );
  return id;
}

function createInvoiceCode() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = `${now.getHours()}`.padStart(2, '0') + `${now.getMinutes()}`.padStart(2, '0') + `${now.getSeconds()}`.padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BLM-${date}-${time}-${random}`;
}

function cleanOptional(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}
