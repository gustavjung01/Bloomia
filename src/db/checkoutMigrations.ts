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
  {
    id: '0008_payment_qr_snapshot',
    description: 'Snapshot bank and VietQR details on each payment',
    statements: [
      'ALTER TABLE payments ADD COLUMN bank_bin TEXT',
      'ALTER TABLE payments ADD COLUMN bank_code TEXT',
      'ALTER TABLE payments ADD COLUMN bank_name TEXT',
      'ALTER TABLE payments ADD COLUMN account_number TEXT',
      'ALTER TABLE payments ADD COLUMN account_name TEXT',
      'ALTER TABLE payments ADD COLUMN transfer_reference TEXT',
      'ALTER TABLE payments ADD COLUMN qr_amount INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE payments ADD COLUMN qr_image_url TEXT',
      'ALTER TABLE payments ADD COLUMN transfer_confirmed_at TEXT',
    ],
  },
];
