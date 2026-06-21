import { openPrintWindow } from './printerService';

export function openQrInvoicePrint(markup: string) {
  openPrintWindow(markup);
}
