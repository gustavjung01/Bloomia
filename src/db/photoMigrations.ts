import type { Migration } from './schema';

export const photoMigrations: Migration[] = [
  {
    id: '0005_item_photo',
    description: 'Item photo path',
    statements: [
      'ALTER TABLE items ADD COLUMN image_path TEXT',
    ],
  },
];
