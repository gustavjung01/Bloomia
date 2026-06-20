import { getDatabase } from '../client';

export type PaperSize = '58mm' | '80mm' | 'A4';

export interface PrinterSettingsRecord {
  id: string;
  printer_name: string | null;
  paper_size: PaperSize;
  is_default: number;
}

export async function getPrinterSettings() {
  const db = await getDatabase();
  const rows = await db.select<PrinterSettingsRecord>(
    'SELECT id, printer_name, paper_size, is_default FROM printer_settings WHERE is_default = 1 LIMIT 1',
  );
  return rows[0] ?? null;
}

export async function savePrinterSettings(printerName: string, paperSize: PaperSize) {
  const db = await getDatabase();
  const current = await getPrinterSettings();
  const name = printerName.trim() || null;

  if (current) {
    await db.execute('UPDATE printer_settings SET printer_name = ?, paper_size = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name, paperSize, current.id]);
    return current.id;
  }

  await db.execute('INSERT INTO printer_settings (id, printer_name, paper_size, is_default) VALUES (?, ?, ?, 1)', ['printer-default', name, paperSize]);
  return 'printer-default';
}
