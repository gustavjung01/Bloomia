import { invoke } from '@tauri-apps/api/core';

import type { PaperSize } from '../../db/repositories/printerRepository';

export async function listLocalPrinters() {
  try {
    return await invoke<string[]>('list_local_printers');
  } catch (error) {
    console.warn('Unable to list local printers', error);
    return [];
  }
}

export async function printInvoiceHtml(
  markup: string,
  printerName?: string | null,
  paperSize: PaperSize = '80mm',
  imageUrl?: string | null,
  copyCount = 1,
) {
  if (imageUrl?.trim()) {
    openPrintWindow(markup);
    return;
  }

  const copies = Math.min(5, Math.max(1, Math.round(copyCount || 1)));
  for (let index = 0; index < copies; index += 1) {
    await invoke('print_invoice_html', {
      html: markup,
      printerName: printerName?.trim() ? printerName.trim() : null,
      paperSize,
    });
  }
}

export async function testPrint(
  printerName?: string | null,
  paperSize: PaperSize = '80mm',
  _imageUrl?: string | null,
) {
  await invoke('test_print', {
    printerName: printerName?.trim() ? printerName.trim() : null,
    paperSize,
  });
}

export function openPrintWindow(markup: string) {
  const printWindow = window.open('', '_blank', 'width=520,height=760');
  if (!printWindow) throw new Error('Không mở được cửa sổ in. Hãy kiểm tra popup blocker.');
  const parsed = new DOMParser().parseFromString(markup, 'text/html');
  printWindow.document.replaceChild(printWindow.document.importNode(parsed.documentElement, true), printWindow.document.documentElement);
}
