import type { Migration } from './schema';

export const recipeMigrations: Migration[] = [
  {
    id: '0003_recipes',
    description: 'Recipe tables',
    statements: [
      'CREATE TABLE IF NOT EXISTS recipes (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, occasion TEXT, color_tone TEXT, size_label TEXT, suggested_sale_price INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)',
      'CREATE TABLE IF NOT EXISTS recipe_items (id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL, item_id TEXT NOT NULL, quantity REAL NOT NULL DEFAULT 1, note TEXT, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)',
      'CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe ON recipe_items(recipe_id)',
      'CREATE INDEX IF NOT EXISTS idx_recipe_items_item ON recipe_items(item_id)',
    ],
  },
];
