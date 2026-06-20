import { invoke } from '@tauri-apps/api/core';

export async function listLocalPrinters() {
  try {
    return await invoke<string[]>('list_local_printers');
  } catch (error) {
    console.warn('Unable to list local printers', error);
    return [];
  }
}

export function openPrintWindow(html: string) {
  const printWindow = window.open('', '_blank', 'width=420,height=720');

  if (!printWindow) {
    throw new Error('Không mở được cửa sổ in. Hãy kiểm tra popup blocker.');
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
