import type { QueryableDatabase } from './schema';

const defaultCategories = ['Hoa tươi', 'Lá phụ', 'Phụ liệu', 'Bao bì', 'Dịch vụ', 'Sản phẩm mẫu'];
const defaultUnits = [
  { id: 'unit-stem', name: 'Cành', symbol: 'cành' },
  { id: 'unit-bunch', name: 'Bó', symbol: 'bó' },
  { id: 'unit-sheet', name: 'Tờ', symbol: 'tờ' },
  { id: 'unit-piece', name: 'Cái', symbol: 'cái' },
  { id: 'unit-service', name: 'Lần', symbol: 'lần' },
  { id: 'unit-trip', name: 'Chuyến', symbol: 'chuyến' },
];

export async function seedProductionDefaults(db: QueryableDatabase) {
  await db.execute(
    `INSERT OR IGNORE INTO shops (id, name, phone, address, invoice_footer)
     VALUES ('shop-default', 'Tên shop của bạn', NULL, NULL, 'Cảm ơn quý khách.')`,
  );

  await db.execute(`INSERT OR IGNORE INTO users (id, name, role) VALUES ('user-owner', 'Chủ tiệm', 'owner')`);

  for (const category of defaultCategories) {
    await db.execute('INSERT OR IGNORE INTO item_categories (id, name) VALUES (?, ?)', [slugId('cat', category), category]);
  }

  for (const unit of defaultUnits) {
    await db.execute('INSERT OR IGNORE INTO units (id, name, symbol) VALUES (?, ?, ?)', [unit.id, unit.name, unit.symbol]);
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
