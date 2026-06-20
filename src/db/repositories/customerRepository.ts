import { getDatabase } from '../client';
import { createLocalId } from '../../utils/id';

export interface CustomerRecord {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  total_orders: number;
  total_spent: number;
  last_sale_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveCustomerInput {
  id?: string;
  name: string;
  phone?: string;
  address?: string;
  note?: string;
}

export async function listCustomers() {
  const db = await getDatabase();
  return db.select<CustomerRecord>(
    `SELECT
       customers.id,
       customers.name,
       customers.phone,
       customers.address,
       customers.note,
       COUNT(sales.id) AS total_orders,
       COALESCE(SUM(sales.total), 0) AS total_spent,
       MAX(sales.sale_date) AS last_sale_date,
       customers.created_at,
       customers.updated_at
     FROM customers
     LEFT JOIN sales ON sales.customer_id = customers.id
     GROUP BY customers.id
     ORDER BY customers.updated_at DESC, customers.created_at DESC`,
  );
}

export async function saveCustomer(input: SaveCustomerInput) {
  const db = await getDatabase();
  const id = input.id ?? createLocalId('customer');
  const name = input.name.trim();
  if (!name) throw new Error('Customer name is required.');

  if (input.id) {
    await db.execute(
      `UPDATE customers
       SET name = ?, phone = ?, address = ?, note = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, cleanOptional(input.phone), cleanOptional(input.address), cleanOptional(input.note), id],
    );
  } else {
    await db.execute(
      `INSERT INTO customers (id, name, phone, address, note)
       VALUES (?, ?, ?, ?, ?)`,
      [id, name, cleanOptional(input.phone), cleanOptional(input.address), cleanOptional(input.note)],
    );
  }

  return id;
}

function cleanOptional(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}
