import type { Migration } from './schema';

export const checkoutMigrations: Migration[] = [
  {
    id: '0007_checkout_amount_details',
    description: 'Track received and returned amounts for checkout records',
    statements: [
      'ALTER TABLE payments ADD COLUMN received_amount INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE payments ADD COLUMN returned_amount INTEGER NOT NULL DEFAULT 0',
    ],
  },
];
