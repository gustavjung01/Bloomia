import { getDatabase } from '../client';
import type { ItemType } from '../schema';
import { createLocalId } from '../../utils/id';

export interface CategoryRecord {
  id: string;
  name: string;
  sort_order: number;
  is_active: number;
}

export interface UnitRecord {
  id: string;
  name: string;
  symbol: string;
  is_active: number;
}

export interface SupplierRecord {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  is_active: number;
}

export interface ItemRecord {
  id: string;
  name: string;
  sku: string | null;
  item_type: ItemType;
  category_id: string | null;
  category_name: string | null;
  unit_id: string | null;
  unit_symbol: string | null;
  default_sale_price: number;
  default_purchase_price: number;
  is_stock_tracked: number;
  is_active: number;
  note: string | null;
}

export interface ShopSettingsRecord {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  logo_path: string | null;
  invoice_footer: string | null;
}

export interface SaveCategoryInput {
  id?: string;
  name: string;
  sortOrder?: number;
}

export interface SaveUnitInput {
  id?: string;
  name: string;
  symbol: string;
}

export interface SaveSupplierInput {
  id?: string;
  name: string;
  phone?: string;
  address?: string;
  note?: string;
}

export interface SaveItemInput {
  id?: string;
  name: string;
  sku?: string;
  itemType: ItemType;
  categoryId?: string;
  unitId?: string;
  defaultSalePrice: number;
  defaultPurchasePrice: number;
  isStockTracked: boolean;
  note?: string;
}

export interface SaveShopSettingsInput {
  name: string;
  phone?: string;
  address?: string;
  logoPath?: string;
  invoiceFooter?: string;
}

export async function listCategories(includeInactive = false) {
  const db = await getDatabase();
  return db.select<CategoryRecord>(
    `SELECT id, name, sort_order, is_active
     FROM item_categories
     ${includeInactive ? '' : 'WHERE is_active = 1'}
     ORDER BY sort_order ASC, name ASC`,
  );
}

export async function saveCategory(input: SaveCategoryInput) {
  const db = await getDatabase();
  const id = input.id ?? createLocalId('cat');

  if (input.id) {
    await db.execute(
      `UPDATE item_categories
       SET name = ?, sort_order = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [input.name.trim(), input.sortOrder ?? 0, id],
    );
  } else {
    await db.execute(
      `INSERT INTO item_categories (id, name, sort_order, is_active)
       VALUES (?, ?, ?, 1)`,
      [id, input.name.trim(), input.sortOrder ?? 0],
    );
  }

  return id;
}

export async function archiveCategory(id: string) {
  const db = await getDatabase();
  await db.execute('UPDATE item_categories SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
}

export async function listUnits(includeInactive = false) {
  const db = await getDatabase();
  return db.select<UnitRecord>(
    `SELECT id, name, symbol, is_active
     FROM units
     ${includeInactive ? '' : 'WHERE is_active = 1'}
     ORDER BY name ASC`,
  );
}

export async function saveUnit(input: SaveUnitInput) {
  const db = await getDatabase();
  const id = input.id ?? createLocalId('unit');

  if (input.id) {
    await db.execute(
      `UPDATE units
       SET name = ?, symbol = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [input.name.trim(), input.symbol.trim(), id],
    );
  } else {
    await db.execute(
      `INSERT INTO units (id, name, symbol, is_active)
       VALUES (?, ?, ?, 1)`,
      [id, input.name.trim(), input.symbol.trim()],
    );
  }

  return id;
}

export async function archiveUnit(id: string) {
  const db = await getDatabase();
  await db.execute('UPDATE units SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
}

export async function listSuppliers(includeInactive = false) {
  const db = await getDatabase();
  return db.select<SupplierRecord>(
    `SELECT id, name, phone, address, note, is_active
     FROM suppliers
     ${includeInactive ? '' : 'WHERE is_active = 1'}
     ORDER BY name ASC`,
  );
}

export async function saveSupplier(input: SaveSupplierInput) {
  const db = await getDatabase();
  const id = input.id ?? createLocalId('supplier');

  if (input.id) {
    await db.execute(
      `UPDATE suppliers
       SET name = ?, phone = ?, address = ?, note = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [input.name.trim(), cleanOptional(input.phone), cleanOptional(input.address), cleanOptional(input.note), id],
    );
  } else {
    await db.execute(
      `INSERT INTO suppliers (id, name, phone, address, note, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [id, input.name.trim(), cleanOptional(input.phone), cleanOptional(input.address), cleanOptional(input.note)],
    );
  }

  return id;
}

export async function archiveSupplier(id: string) {
  const db = await getDatabase();
  await db.execute('UPDATE suppliers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
}

export async function listItems(includeInactive = false) {
  const db = await getDatabase();
  return db.select<ItemRecord>(
    `SELECT
       items.id,
       items.name,
       items.sku,
       items.item_type,
       items.category_id,
       item_categories.name AS category_name,
       items.unit_id,
       units.symbol AS unit_symbol,
       items.default_sale_price,
       items.default_purchase_price,
       items.is_stock_tracked,
       items.is_active,
       items.note
     FROM items
     LEFT JOIN item_categories ON item_categories.id = items.category_id
     LEFT JOIN units ON units.id = items.unit_id
     ${includeInactive ? '' : 'WHERE items.is_active = 1'}
     ORDER BY items.item_type ASC, items.name ASC`,
  );
}

export async function saveItem(input: SaveItemInput) {
  const db = await getDatabase();
  const id = input.id ?? createLocalId('item');
  const isStockTracked = input.itemType === 'service' ? 0 : input.isStockTracked ? 1 : 0;
  const defaultPurchasePrice = normalizeMoney(input.defaultPurchasePrice);

  if (input.id) {
    await db.execute(
      `UPDATE items
       SET name = ?, sku = ?, item_type = ?, category_id = ?, unit_id = ?, default_sale_price = ?,
           default_purchase_price = ?, is_stock_tracked = ?, note = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        input.name.trim(),
        cleanOptional(input.sku),
        input.itemType,
        cleanOptional(input.categoryId),
        cleanOptional(input.unitId),
        input.defaultSalePrice,
        defaultPurchasePrice,
        isStockTracked,
        cleanOptional(input.note),
        id,
      ],
    );
  } else {
    await db.execute(
      `INSERT INTO items (
        id, name, sku, item_type, category_id, unit_id, default_sale_price, default_purchase_price, is_stock_tracked, note, is_active
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        input.name.trim(),
        cleanOptional(input.sku),
        input.itemType,
        cleanOptional(input.categoryId),
        cleanOptional(input.unitId),
        input.defaultSalePrice,
        defaultPurchasePrice,
        isStockTracked,
        cleanOptional(input.note),
      ],
    );
  }

  return id;
}

export async function archiveItem(id: string) {
  const db = await getDatabase();
  await db.execute('UPDATE items SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
}

export async function getShopSettings() {
  const db = await getDatabase();
  const rows = await db.select<ShopSettingsRecord>(
    `SELECT id, name, phone, address, logo_path, invoice_footer
     FROM shops
     ORDER BY created_at ASC
     LIMIT 1`,
  );

  return rows[0] ?? null;
}

export async function saveShopSettings(input: SaveShopSettingsInput) {
  const db = await getDatabase();
  const current = await getShopSettings();
  const id = current?.id ?? 'shop-default';

  if (current) {
    await db.execute(
      `UPDATE shops
       SET name = ?, phone = ?, address = ?, logo_path = ?, invoice_footer = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [input.name.trim(), cleanOptional(input.phone), cleanOptional(input.address), cleanOptional(input.logoPath), cleanOptional(input.invoiceFooter), id],
    );
  } else {
    await db.execute(
      `INSERT INTO shops (id, name, phone, address, logo_path, invoice_footer)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.name.trim(), cleanOptional(input.phone), cleanOptional(input.address), cleanOptional(input.logoPath), cleanOptional(input.invoiceFooter)],
    );
  }

  return id;
}

function normalizeMoney(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.round(value);
}

function cleanOptional(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}
