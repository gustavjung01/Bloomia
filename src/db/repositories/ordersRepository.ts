import { getDatabase } from '../client';
import { createLocalId } from '../../utils/id';

export type FlowerOrderStatus = 'new' | 'confirmed' | 'preparing' | 'ready' | 'delivering' | 'completed' | 'cancelled';

export interface FlowerOrderRecord {
  id: string;
  order_code: string;
  customer_id: string | null;
  customer_name: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  delivery_at: string | null;
  delivery_address: string | null;
  occasion: string | null;
  color_tone: string | null;
  budget_amount: number | null;
  card_message: string | null;
  internal_note: string | null;
  status: FlowerOrderStatus;
  payment_status: string;
  created_at: string;
  updated_at: string;
}

export interface SaveFlowerOrderInput {
  id?: string;
  customerName?: string;
  customerPhone?: string;
  recipientName?: string;
  recipientPhone?: string;
  deliveryAt?: string;
  deliveryAddress?: string;
  occasion?: string;
  colorTone?: string;
  budgetAmount?: number;
  cardMessage?: string;
  internalNote?: string;
  status?: FlowerOrderStatus;
  paymentStatus?: string;
}

export async function saveFlowerOrder(input: SaveFlowerOrderInput) {
  const db = await getDatabase();
  const customerId = await createCustomerIfNeeded(input.customerName, input.customerPhone);

  if (input.id) {
    await db.execute(
      `UPDATE orders SET customer_id = ?, recipient_name = ?, recipient_phone = ?, delivery_at = ?, delivery_address = ?, occasion = ?, color_tone = ?, budget_amount = ?, card_message = ?, internal_note = ?, status = ?, payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [
        customerId,
        cleanOptional(input.recipientName),
        cleanOptional(input.recipientPhone),
        cleanOptional(input.deliveryAt),
        cleanOptional(input.deliveryAddress),
        cleanOptional(input.occasion),
        cleanOptional(input.colorTone),
        input.budgetAmount ?? null,
        cleanOptional(input.cardMessage),
        cleanOptional(input.internalNote),
        input.status ?? 'new',
        input.paymentStatus ?? 'unpaid',
        input.id,
      ],
    );
    return input.id;
  }

  const id = createLocalId('order');
  await db.execute(
    `INSERT INTO orders (id, order_code, customer_id, recipient_name, recipient_phone, delivery_at, delivery_address, occasion, color_tone, budget_amount, card_message, internal_note, status, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      createOrderCode(),
      customerId,
      cleanOptional(input.recipientName),
      cleanOptional(input.recipientPhone),
      cleanOptional(input.deliveryAt),
      cleanOptional(input.deliveryAddress),
      cleanOptional(input.occasion),
      cleanOptional(input.colorTone),
      input.budgetAmount ?? null,
      cleanOptional(input.cardMessage),
      cleanOptional(input.internalNote),
      input.status ?? 'new',
      input.paymentStatus ?? 'unpaid',
    ],
  );
  return id;
}

export async function listFlowerOrders() {
  const db = await getDatabase();
  return db.select<FlowerOrderRecord>(
    `SELECT orders.*, customers.name AS customer_name FROM orders LEFT JOIN customers ON customers.id = orders.customer_id ORDER BY orders.delivery_at IS NULL, orders.delivery_at ASC, orders.created_at DESC`,
  );
}

export async function listTodayDeliveries() {
  const db = await getDatabase();
  return db.select<FlowerOrderRecord>(
    `SELECT orders.*, customers.name AS customer_name FROM orders LEFT JOIN customers ON customers.id = orders.customer_id WHERE DATE(orders.delivery_at) = DATE('now', 'localtime') AND orders.status NOT IN ('completed', 'cancelled') ORDER BY orders.delivery_at ASC`,
  );
}

export async function updateFlowerOrderStatus(id: string, status: FlowerOrderStatus) {
  const db = await getDatabase();
  await db.execute('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);
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

function createOrderCode() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `ORD-${date}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function cleanOptional(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}
