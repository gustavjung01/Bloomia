import type { DevicePaymentSettings } from '../../db/repositories/devicePaymentSettingsRepository';

export interface VietQrSnapshot {
  bankBin: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  transferReference: string;
  amount: number;
  imageUrl: string;
}

export function createTransferReference(template: string, invoiceCode: string) {
  const rendered = (template || 'BLOOMIA {invoiceCode}').replace(/\{invoiceCode\}/gi, invoiceCode);
  return sanitizeTransferContent(rendered);
}

export function buildVietQrSnapshot(
  settings: DevicePaymentSettings,
  amount: number,
  invoiceCode: string,
  template: 'qr_only' | 'compact2' | 'print' = 'qr_only',
): VietQrSnapshot | null {
  if (!settings.qrEnabled) return null;
  const bankId = (settings.bankBin || settings.bankCode).trim();
  const accountNumber = settings.accountNumber.replace(/\s+/g, '').trim();
  if (!bankId || !accountNumber || amount <= 0) return null;

  const transferReference = createTransferReference(settings.transferContentTemplate, invoiceCode);
  const path = `${encodeURIComponent(bankId)}-${encodeURIComponent(accountNumber)}-${template}.png`;
  const params = new URLSearchParams({
    amount: String(Math.round(amount)),
    addInfo: transferReference,
  });
  if (settings.accountName.trim()) params.set('accountName', settings.accountName.trim());

  return {
    bankBin: settings.bankBin.trim(),
    bankCode: settings.bankCode.trim(),
    bankName: settings.bankName.trim(),
    accountNumber,
    accountName: settings.accountName.trim(),
    transferReference,
    amount: Math.round(amount),
    imageUrl: `https://img.vietqr.io/image/${path}?${params.toString()}`,
  };
}

export function validatePaymentQrSettings(settings: DevicePaymentSettings) {
  if (!settings.qrEnabled) return '';
  if (!(settings.bankBin.trim() || settings.bankCode.trim())) return 'Nhập mã BIN hoặc mã ngân hàng.';
  if (!settings.accountNumber.replace(/\s+/g, '')) return 'Nhập số tài khoản nhận tiền.';
  if (!settings.accountName.trim()) return 'Nhập tên chủ tài khoản.';
  return '';
}

function sanitizeTransferContent(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, (character) => (character === 'Đ' ? 'D' : 'd'))
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50);
}
