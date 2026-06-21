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
  {
    id: '0009_sale_lifecycle',
    description: 'Track pending payment, completion, cancellation, corrections and print history',
    statements: [
      "ALTER TABLE sales ADD COLUMN sale_status TEXT NOT NULL DEFAULT 'completed'",
      'ALTER TABLE sales ADD COLUMN finalized_at TEXT',
      'ALTER TABLE sales ADD COLUMN cancelled_at TEXT',
      'ALTER TABLE sales ADD COLUMN cancel_reason TEXT',
      "ALTER TABLE sales ADD COLUMN refund_status TEXT NOT NULL DEFAULT 'not_required'",
      'ALTER TABLE sales ADD COLUMN refunded_at TEXT',
      'ALTER TABLE sales ADD COLUMN revision_no INTEGER NOT NULL DEFAULT 1',
      'ALTER TABLE sales ADD COLUMN print_count INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE sales ADD COLUMN last_printed_at TEXT',
      'ALTER TABLE sales ADD COLUMN replaces_sale_id TEXT',
      'ALTER TABLE sales ADD COLUMN replaced_by_sale_id TEXT',
      "UPDATE sales SET sale_status = 'completed', finalized_at = COALESCE(finalized_at, sale_date) WHERE sale_status IS NULL OR sale_status = ''",
      'CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(sale_status, sale_date)',
    ],
  },
];
