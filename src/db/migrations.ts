import type { Migration } from './schema';

export const migrations: Migration[] = [
  {
    id: '0001_core_schema',
    description: 'Core shop, catalog, customer, sales, orders and printer settings schema',
    statements: [
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS shops (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        logo_path TEXT,
        invoice_footer TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'owner',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS item_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS units (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        symbol TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT,
        item_type TEXT NOT NULL CHECK (item_type IN ('flower', 'material', 'service', 'product')),
        category_id TEXT,
        unit_id TEXT,
        default_sale_price INTEGER NOT NULL DEFAULT 0,
        is_stock_tracked INTEGER NOT NULL DEFAULT 1,
        is_active INTEGER NOT NULL DEFAULT 1,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES item_categories(id),
        FOREIGN KEY (unit_id) REFERENCES units(id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_items_type ON items(item_type)`,
      `CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id)`,
      `CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        note TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        invoice_code TEXT NOT NULL UNIQUE,
        customer_id TEXT,
        sale_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        subtotal INTEGER NOT NULL DEFAULT 0,
        discount_amount INTEGER NOT NULL DEFAULT 0,
        shipping_fee INTEGER NOT NULL DEFAULT 0,
        total INTEGER NOT NULL DEFAULT 0,
        payment_status TEXT NOT NULL DEFAULT 'unpaid',
        note TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )`,
      `CREATE TABLE IF NOT EXISTS sale_items (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL,
        item_id TEXT,
        item_name TEXT NOT NULL,
        quantity REAL NOT NULL DEFAULT 1,
        unit_price INTEGER NOT NULL DEFAULT 0,
        cost_price INTEGER NOT NULL DEFAULT 0,
        line_total INTEGER NOT NULL DEFAULT 0,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sale_id) REFERENCES sales(id),
        FOREIGN KEY (item_id) REFERENCES items(id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id)`,
      `CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL,
        method TEXT NOT NULL CHECK (method IN ('cash', 'bank_transfer', 'card', 'debt')),
        amount INTEGER NOT NULL DEFAULT 0,
        paid_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        note TEXT,
        FOREIGN KEY (sale_id) REFERENCES sales(id)
      )`,
      `CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_code TEXT NOT NULL UNIQUE,
        customer_id TEXT,
        recipient_name TEXT,
        recipient_phone TEXT,
        delivery_at TEXT,
        delivery_address TEXT,
        occasion TEXT,
        color_tone TEXT,
        budget_amount INTEGER,
        card_message TEXT,
        internal_note TEXT,
        status TEXT NOT NULL DEFAULT 'new',
        payment_status TEXT NOT NULL DEFAULT 'unpaid',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_delivery_at ON orders(delivery_at)`,
      `CREATE TABLE IF NOT EXISTS printer_settings (
        id TEXT PRIMARY KEY,
        printer_name TEXT,
        paper_size TEXT NOT NULL DEFAULT '80mm',
        is_default INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    ],
  },
  {
    id: '0002_inventory_schema',
    description: 'Purchase batches and stock movement schema for inventory/FIFO',
    statements: [
      `CREATE TABLE IF NOT EXISTS purchase_batches (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        supplier_id TEXT,
        batch_code TEXT,
        purchase_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expiry_date TEXT,
        quantity REAL NOT NULL,
        remaining_quantity REAL NOT NULL,
        unit_cost INTEGER NOT NULL,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES items(id),
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_purchase_batches_item ON purchase_batches(item_id)`,
      `CREATE INDEX IF NOT EXISTS idx_purchase_batches_remaining ON purchase_batches(item_id, remaining_quantity, purchase_date)`,
      `CREATE TABLE IF NOT EXISTS stock_movements (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        batch_id TEXT,
        movement_type TEXT NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'waste', 'sample', 'event', 'internal', 'adjustment')),
        quantity_in REAL NOT NULL DEFAULT 0,
        quantity_out REAL NOT NULL DEFAULT 0,
        unit_cost INTEGER NOT NULL DEFAULT 0,
        reference_type TEXT,
        reference_id TEXT,
        reason TEXT,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES items(id),
        FOREIGN KEY (batch_id) REFERENCES purchase_batches(id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id)`,
      `CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type)`,
      `CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at)`,
    ],
  },
];
