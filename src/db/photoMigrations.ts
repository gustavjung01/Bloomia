import type { Migration } from './schema';

export const photoMigrations: Migration[] = [
  {
    id: '0005_item_photo',
    description: 'Item photo path',
    statements: [
      'ALTER TABLE items ADD COLUMN image_path TEXT',
    ],
  },
  {
    id: '0006_item_default_purchase_price',
    description: 'Default purchase price for item setup',
    statements: [
      'ALTER TABLE items ADD COLUMN default_purchase_price INTEGER NOT NULL DEFAULT 0',
    ],
  },
];
