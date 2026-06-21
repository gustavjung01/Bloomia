import { getDatabase } from '../client';
import type { PaperSize } from './printerRepository';

const KEY = 'printer_test_diagnostics';

export interface PrinterTestDiagnostics {
  testedAt: string;
  printerName: string;
  paperSize: PaperSize;
  ok: boolean;
  message: string;
}

export async function getPrinterTestDiagnostics() {
  const db = await getDatabase();
  const rows = await db.select<{ value_json: string }>('SELECT value_json FROM settings WHERE key = ? LIMIT 1', [KEY]);
  if (!rows[0]?.value_json) return null;
  try {
    return JSON.parse(rows[0].value_json) as PrinterTestDiagnostics;
  } catch {
    return null;
  }
}

export async function savePrinterTestDiagnostics(value: PrinterTestDiagnostics) {
  const db = await getDatabase();
  await db.execute(
    'INSERT OR REPLACE INTO settings (key, value_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
    [KEY, JSON.stringify(value)],
  );
  return value;
}
