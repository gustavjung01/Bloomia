import { getDatabase } from '../client';
import type { StockMovementType } from '../schema';
import { createLocalId } from '../../utils/id';

export interface PurchaseLineInput {
  itemId: string;
  quantity: number;
  unitCost: number;
  expiryDate?: string;
  note?: string;
}

export interface CreatePurchaseInput {
  supplierId?: string;
  purchaseDate: string;
  lines: PurchaseLineInput[];
}

export interface InventoryOverviewRecord {
  item_id: string;
  item_name: string;
  item_type: string;
  unit_symbol: string | null;
  total_quantity: number;
  latest_unit_cost: number | null;
  nearest_expiry_date: string | null;
  batch_count: number;
}

export interface PurchaseBatchRecord {
  id: string;
  item_id: string;
  item_name: string;
  supplier_id: string | null;
  supplier_name: string | null;
  batch_code: string | null;
  purchase_date: string;
  expiry_date: string | null;
  quantity: number;
  remaining_quantity: number;
  unit_cost: number;
  note: string | null;
}

export interface StockMovementRecord {
  id: string;
  item_id: string;
  item_name: string;
  batch_id: string | null;
  movement_type: StockMovementType;
  quantity_in: number;
  quantity_out: number;
  unit_cost: number;
  reference_type: string | null;
  reference_id: string | null;
  reason: string | null;
  note: string | null;
  created_at: string;
}

export interface StockOutInput {
  itemId: string;
  quantity: number;
  movementType: Extract<StockMovementType, 'waste' | 'sample' | 'event' | 'internal'>;
  reason?: string;
  note?: string;
  referenceType?: string;
  referenceId?: string;
}

export interface AdjustmentInput {
  itemId: string;
  quantityDelta: number;
  unitCost?: number;
  reason?: string;
  note?: string;
}

export interface FifoAllocation {
  batchId: string | null;
  quantity: number;
  unitCost: number;
}

export async function createPurchase(input: CreatePurchaseInput) {
  if (input.lines.length === 0) {
    throw new Error('Purchase must have at least one line.');
  }

  const db = await getDatabase();
  const purchaseRef = createLocalId('purchase');

  for (const line of input.lines) {
    const quantity = normalizePositive(line.quantity);
    const unitCost = normalizeMoney(line.unitCost);
    const batchId = createLocalId('batch');
    const batchCode = createBatchCode();

    await db.execute(
      `INSERT INTO purchase_batches (
        id, item_id, supplier_id, batch_code, purchase_date, expiry_date, quantity, remaining_quantity, unit_cost, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        batchId,
        line.itemId,
        cleanOptional(input.supplierId),
        batchCode,
        input.purchaseDate,
        cleanOptional(line.expiryDate),
        quantity,
        quantity,
        unitCost,
        cleanOptional(line.note),
      ],
    );

    await db.execute(
      `INSERT INTO stock_movements (
        id, item_id, batch_id, movement_type, quantity_in, quantity_out, unit_cost, reference_type, reference_id, reason, note
      ) VALUES (?, ?, ?, 'purchase', ?, 0, ?, 'purchase', ?, ?, ?)`,
      [createLocalId('move'), line.itemId, batchId, quantity, unitCost, purchaseRef, 'Nhập hàng', cleanOptional(line.note)],
    );
  }

  return purchaseRef;
}

export async function listInventoryOverview() {
  const db = await getDatabase();
  return db.select<InventoryOverviewRecord>(
    `SELECT
       items.id AS item_id,
       items.name AS item_name,
       items.item_type,
       units.symbol AS unit_symbol,
       COALESCE((
         SELECT SUM(stock_movements.quantity_in - stock_movements.quantity_out)
         FROM stock_movements
         WHERE stock_movements.item_id = items.id
       ), 0) AS total_quantity,
       (
         SELECT pb.unit_cost
         FROM purchase_batches pb
         WHERE pb.item_id = items.id
         ORDER BY pb.purchase_date DESC, pb.created_at DESC
         LIMIT 1
       ) AS latest_unit_cost,
       MIN(CASE WHEN purchase_batches.remaining_quantity > 0 THEN purchase_batches.expiry_date ELSE NULL END) AS nearest_expiry_date,
       COUNT(CASE WHEN purchase_batches.remaining_quantity > 0 THEN purchase_batches.id ELSE NULL END) AS batch_count
     FROM items
     LEFT JOIN units ON units.id = items.unit_id
     LEFT JOIN purchase_batches ON purchase_batches.item_id = items.id
     WHERE items.is_active = 1 AND items.is_stock_tracked = 1
     GROUP BY items.id
     ORDER BY nearest_expiry_date IS NULL, nearest_expiry_date ASC, items.name ASC`,
  );
}

export async function listPurchaseBatches(itemId?: string) {
  const db = await getDatabase();
  const where = itemId ? 'WHERE purchase_batches.item_id = ?' : '';
  const params = itemId ? [itemId] : [];

  return db.select<PurchaseBatchRecord>(
    `SELECT
       purchase_batches.*,
       items.name AS item_name,
       suppliers.name AS supplier_name
     FROM purchase_batches
     INNER JOIN items ON items.id = purchase_batches.item_id
     LEFT JOIN suppliers ON suppliers.id = purchase_batches.supplier_id
     ${where}
     ORDER BY purchase_batches.purchase_date DESC, purchase_batches.created_at DESC`,
    params,
  );
}

export async function listStockMovements(limit = 80) {
  const db = await getDatabase();
  return db.select<StockMovementRecord>(
    `SELECT
       stock_movements.*,
       items.name AS item_name
     FROM stock_movements
     INNER JOIN items ON items.id = stock_movements.item_id
     ORDER BY stock_movements.created_at DESC
     LIMIT ?`,
    [limit],
  );
}

export async function createStockOut(input: StockOutInput) {
  const allocations = await allocateFifo(input.itemId, input.quantity, {
    movementType: input.movementType,
    referenceType: input.referenceType ?? input.movementType,
    referenceId: input.referenceId ?? createLocalId(input.movementType),
    reason: input.reason,
    note: input.note,
  });

  return allocations;
}

export async function createAdjustment(input: AdjustmentInput) {
  const db = await getDatabase();
  const quantity = Math.abs(input.quantityDelta);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Adjustment quantity must not be zero.');
  }

  if (input.quantityDelta < 0) {
    return allocateFifo(input.itemId, quantity, {
      movementType: 'adjustment',
      referenceType: 'adjustment',
      referenceId: createLocalId('adjustment'),
      reason: input.reason ?? 'Điều chỉnh giảm kho',
      note: input.note,
    });
  }

  const batchId = createLocalId('batch-adjustment');
  const unitCost = normalizeMoney(input.unitCost ?? 0);
  await db.execute(
    `INSERT INTO purchase_batches (
      id, item_id, supplier_id, batch_code, purchase_date, expiry_date, quantity, remaining_quantity, unit_cost, note
    ) VALUES (?, ?, NULL, ?, DATE('now'), NULL, ?, ?, ?, ?)`,
    [batchId, input.itemId, createBatchCode('ADJ'), quantity, quantity, unitCost, cleanOptional(input.note)],
  );

  await db.execute(
    `INSERT INTO stock_movements (
      id, item_id, batch_id, movement_type, quantity_in, quantity_out, unit_cost, reference_type, reference_id, reason, note
    ) VALUES (?, ?, ?, 'adjustment', ?, 0, ?, 'adjustment', ?, ?, ?)`,
    [createLocalId('move'), input.itemId, batchId, quantity, unitCost, createLocalId('adjustment'), input.reason ?? 'Điều chỉnh tăng kho', cleanOptional(input.note)],
  );

  return [{ batchId, quantity, unitCost }];
}

export async function allocateFifo(
  itemId: string,
  requestedQuantity: number,
  options: {
    movementType: Extract<StockMovementType, 'sale' | 'waste' | 'sample' | 'event' | 'internal' | 'adjustment'>;
    referenceType?: string;
    referenceId?: string;
    reason?: string;
    note?: string;
    allowShortfall?: boolean;
    shortfallUnitCost?: number;
  },
): Promise<FifoAllocation[]> {
  const quantity = normalizePositive(requestedQuantity);
  const db = await getDatabase();
  const batches = await db.select<{ id: string; remaining_quantity: number; unit_cost: number }>(
    `SELECT id, remaining_quantity, unit_cost
     FROM purchase_batches
     WHERE item_id = ? AND remaining_quantity > 0
     ORDER BY purchase_date ASC, created_at ASC`,
    [itemId],
  );

  const available = batches.reduce((sum, batch) => sum + batch.remaining_quantity, 0);
  if (available < quantity && !options.allowShortfall) {
    throw new Error(`Không đủ tồn kho. Cần ${quantity}, hiện còn ${available}.`);
  }

  let remaining = quantity;
  const allocations: FifoAllocation[] = [];

  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.remaining_quantity, remaining);
    await db.execute(
      'UPDATE purchase_batches SET remaining_quantity = remaining_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [take, batch.id],
    );

    await db.execute(
      `INSERT INTO stock_movements (
        id, item_id, batch_id, movement_type, quantity_in, quantity_out, unit_cost, reference_type, reference_id, reason, note
      ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
      [
        createLocalId('move'),
        itemId,
        batch.id,
        options.movementType,
        take,
        batch.unit_cost,
        cleanOptional(options.referenceType),
        cleanOptional(options.referenceId),
        cleanOptional(options.reason),
        cleanOptional(options.note),
      ],
    );

    allocations.push({ batchId: batch.id, quantity: take, unitCost: batch.unit_cost });
    remaining -= take;
  }

  if (remaining > 0 && options.allowShortfall) {
    const fallbackCost = normalizeMoney(options.shortfallUnitCost ?? 0);
    const shortfallReason = `${options.reason ?? 'Xuất kho'} • Bán vượt tồn`;
    await db.execute(
      `INSERT INTO stock_movements (
        id, item_id, batch_id, movement_type, quantity_in, quantity_out, unit_cost, reference_type, reference_id, reason, note
      ) VALUES (?, ?, NULL, ?, 0, ?, ?, ?, ?, ?, ?)`,
      [
        createLocalId('move-shortfall'),
        itemId,
        options.movementType,
        remaining,
        fallbackCost,
        cleanOptional(options.referenceType),
        cleanOptional(options.referenceId),
        shortfallReason,
        cleanOptional(options.note),
      ],
    );
    allocations.push({ batchId: null, quantity: remaining, unitCost: fallbackCost });
  }

  return allocations;
}

export async function getItemStock(itemId: string) {
  const db = await getDatabase();
  const rows = await db.select<{ quantity: number }>(
    `SELECT COALESCE(SUM(quantity_in - quantity_out), 0) AS quantity
     FROM stock_movements
     WHERE item_id = ?`,
    [itemId],
  );
  return rows[0]?.quantity ?? 0;
}

function createBatchCode(prefix = 'BATCH') {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${date}-${random}`;
}

function normalizePositive(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Quantity must be greater than zero.');
  }
  return Math.round(value * 100) / 100;
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
