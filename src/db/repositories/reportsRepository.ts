import { getDatabase } from '../client';

export interface DashboardSummary {
  todayRevenue: number;
  todayOrders: number;
  openFlowerOrders: number;
  deliveryToday: number;
  estimatedProfit: number;
  wasteCost: number;
}

export interface SalesReportRow {
  day: string;
  orders: number;
  revenue: number;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  estimated_cost: number;
  estimated_profit: number;
}

export interface InventoryReportRow {
  item_id: string;
  item_name: string;
  item_type: string;
  unit_symbol: string | null;
  quantity: number;
  latest_unit_cost: number | null;
  inventory_value: number;
  nearest_expiry_date: string | null;
}

export interface WasteReportRow {
  item_name: string;
  quantity: number;
  unit_cost: number;
  amount: number;
  reason: string | null;
  created_at: string;
}

const completedSaleFilter = "COALESCE(sale_status, 'completed') = 'completed'";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const db = await getDatabase();
  const rows = await db.select<DashboardSummary>(
    `SELECT
      COALESCE((SELECT SUM(total) FROM sales WHERE DATE(sale_date) = DATE('now', 'localtime') AND ${completedSaleFilter}), 0) AS todayRevenue,
      COALESCE((SELECT COUNT(*) FROM sales WHERE DATE(sale_date) = DATE('now', 'localtime') AND ${completedSaleFilter}), 0) AS todayOrders,
      COALESCE((SELECT COUNT(*) FROM orders WHERE status NOT IN ('completed', 'cancelled')), 0) AS openFlowerOrders,
      COALESCE((SELECT COUNT(*) FROM orders WHERE DATE(delivery_at) = DATE('now', 'localtime') AND status NOT IN ('completed', 'cancelled')), 0) AS deliveryToday,
      COALESCE((
        SELECT SUM(sales.total - COALESCE(costs.estimated_cost, 0))
        FROM sales
        LEFT JOIN (
          SELECT sale_id, SUM(cost_price * quantity) AS estimated_cost
          FROM sale_items
          GROUP BY sale_id
        ) costs ON costs.sale_id = sales.id
        WHERE DATE(sales.sale_date) = DATE('now', 'localtime')
          AND COALESCE(sales.sale_status, 'completed') = 'completed'
      ), 0) AS estimatedProfit,
      COALESCE((SELECT SUM(quantity_out * unit_cost) FROM stock_movements WHERE movement_type = 'waste' AND DATE(created_at) = DATE('now', 'localtime')), 0) AS wasteCost`,
  );

  return rows[0] ?? { todayRevenue: 0, todayOrders: 0, openFlowerOrders: 0, deliveryToday: 0, estimatedProfit: 0, wasteCost: 0 };
}

export async function getSalesReport(days = 30) {
  const db = await getDatabase();
  return db.select<SalesReportRow>(
    `WITH sale_costs AS (
       SELECT sale_id, SUM(cost_price * quantity) AS estimated_cost
       FROM sale_items
       GROUP BY sale_id
     )
     SELECT
       DATE(sales.sale_date) AS day,
       COUNT(sales.id) AS orders,
       COALESCE(SUM(sales.total), 0) AS revenue,
       COALESCE(SUM(sales.subtotal), 0) AS subtotal,
       COALESCE(SUM(sales.discount_amount), 0) AS discount_amount,
       COALESCE(SUM(sales.shipping_fee), 0) AS shipping_fee,
       COALESCE(SUM(sale_costs.estimated_cost), 0) AS estimated_cost,
       COALESCE(SUM(sales.total), 0) - COALESCE(SUM(sale_costs.estimated_cost), 0) AS estimated_profit
      FROM sales
      LEFT JOIN sale_costs ON sale_costs.sale_id = sales.id
      WHERE DATE(sales.sale_date) >= DATE('now', ?)
        AND COALESCE(sales.sale_status, 'completed') = 'completed'
      GROUP BY DATE(sales.sale_date)
      ORDER BY day DESC`,
    [`-${days} days`],
  );
}

export async function getInventoryReport() {
  const db = await getDatabase();
  return db.select<InventoryReportRow>(
    `SELECT
      items.id AS item_id,
      items.name AS item_name,
      items.item_type,
      units.symbol AS unit_symbol,
      COALESCE(SUM(purchase_batches.remaining_quantity), 0) AS quantity,
      (SELECT pb.unit_cost FROM purchase_batches pb WHERE pb.item_id = items.id ORDER BY pb.purchase_date DESC, pb.created_at DESC LIMIT 1) AS latest_unit_cost,
      COALESCE(SUM(purchase_batches.remaining_quantity * purchase_batches.unit_cost), 0) AS inventory_value,
      MIN(CASE WHEN purchase_batches.remaining_quantity > 0 THEN purchase_batches.expiry_date ELSE NULL END) AS nearest_expiry_date
     FROM items
     LEFT JOIN units ON units.id = items.unit_id
     LEFT JOIN purchase_batches ON purchase_batches.item_id = items.id
     WHERE items.is_active = 1 AND items.is_stock_tracked = 1
     GROUP BY items.id
     ORDER BY inventory_value DESC, items.name ASC`,
  );
}

export async function getWasteReport(days = 30) {
  const db = await getDatabase();
  return db.select<WasteReportRow>(
    `SELECT
      items.name AS item_name,
      stock_movements.quantity_out AS quantity,
      stock_movements.unit_cost,
      stock_movements.quantity_out * stock_movements.unit_cost AS amount,
      stock_movements.reason,
      stock_movements.created_at
     FROM stock_movements
     INNER JOIN items ON items.id = stock_movements.item_id
     WHERE stock_movements.movement_type = 'waste' AND DATE(stock_movements.created_at) >= DATE('now', ?)
     ORDER BY stock_movements.created_at DESC`,
    [`-${days} days`],
  );
}
