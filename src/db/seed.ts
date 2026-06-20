import type { QueryableDatabase, SeedItem } from './schema';

const categories = ['Hoa tươi', 'Lá phụ', 'Phụ liệu', 'Bao bì', 'Dịch vụ', 'Sản phẩm mẫu'];
const units = [
  { id: 'unit-stem', name: 'Cành', symbol: 'cành' },
  { id: 'unit-bunch', name: 'Bó', symbol: 'bó' },
  { id: 'unit-sheet', name: 'Tờ', symbol: 'tờ' },
  { id: 'unit-piece', name: 'Cái', symbol: 'cái' },
  { id: 'unit-service', name: 'Lần', symbol: 'lần' },
  { id: 'unit-trip', name: 'Chuyến', symbol: 'chuyến' },
];

const items: SeedItem[] = [
  { name: 'Hoa hồng pastel', type: 'flower', unit: 'unit-stem', category: 'Hoa tươi', defaultSalePrice: 18000, isStockTracked: true },
  { name: 'Baby trắng', type: 'flower', unit: 'unit-bunch', category: 'Hoa tươi', defaultSalePrice: 65000, isStockTracked: true },
  { name: 'Lá bạc hà', type: 'material', unit: 'unit-stem', category: 'Lá phụ', defaultSalePrice: 6000, isStockTracked: true },
  { name: 'Giấy gói Hàn Quốc', type: 'material', unit: 'unit-sheet', category: 'Bao bì', defaultSalePrice: 8000, isStockTracked: true },
  { name: 'Ruy băng', type: 'material', unit: 'unit-piece', category: 'Phụ liệu', defaultSalePrice: 5000, isStockTracked: true },
  { name: 'Công cắm hoa', type: 'service', unit: 'unit-service', category: 'Dịch vụ', defaultSalePrice: 50000, isStockTracked: false },
  { name: 'Phí giao hàng', type: 'service', unit: 'unit-trip', category: 'Dịch vụ', defaultSalePrice: 30000, isStockTracked: false },
  { name: 'Thiệp chúc mừng', type: 'service', unit: 'unit-piece', category: 'Dịch vụ', defaultSalePrice: 10000, isStockTracked: false },
];

export async function seedDevelopmentData(db: QueryableDatabase) {
  await db.execute(
    `INSERT OR IGNORE INTO shops (id, name, phone, address, invoice_footer)
     VALUES ('shop-default', 'Bloomia Florist', '09xx xxx xxx', 'Địa chỉ shop', 'Cảm ơn quý khách đã ghé Bloomia.')`,
  );

  await db.execute(`INSERT OR IGNORE INTO users (id, name, role) VALUES ('user-owner', 'Chủ tiệm', 'owner')`);

  for (const category of categories) {
    await db.execute('INSERT OR IGNORE INTO item_categories (id, name) VALUES (?, ?)', [slugId('cat', category), category]);
  }

  for (const unit of units) {
    await db.execute('INSERT OR IGNORE INTO units (id, name, symbol) VALUES (?, ?, ?)', [unit.id, unit.name, unit.symbol]);
  }

  await db.execute(`INSERT OR IGNORE INTO suppliers (id, name, phone, note) VALUES ('supplier-hoky', 'Chợ hoa Hồ Thị Kỷ', '', 'Seed data')`);

  for (const item of items) {
    await db.execute(
      `INSERT OR IGNORE INTO items (
        id, name, item_type, category_id, unit_id, default_sale_price, is_stock_tracked
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        slugId('item', item.name),
        item.name,
        item.type,
        slugId('cat', item.category),
        item.unit,
        item.defaultSalePrice,
        item.isStockTracked ? 1 : 0,
      ],
    );
  }

  await db.execute(`INSERT OR IGNORE INTO printer_settings (id, paper_size, is_default) VALUES ('printer-default', '80mm', 1)`);
}

function slugId(prefix: string, value: string) {
  return `${prefix}-${value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;
}
