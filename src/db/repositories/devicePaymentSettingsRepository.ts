import { getDatabase } from '../client';

const KEY = 'device_payment_settings';

export type QrSize = 'small' | 'medium' | 'large';

export interface DevicePaymentSettings {
  autoPrintAfterPayment: boolean;
  copies: number;
  printLogo: boolean;
  printQr: boolean;
  qrEnabled: boolean;
  bankBin: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  transferContentTemplate: string;
  showQrAtCheckout: boolean;
  showQrOnInvoice: boolean;
  qrSize: QrSize;
}

export const defaultDevicePaymentSettings: DevicePaymentSettings = {
  autoPrintAfterPayment: false,
  copies: 1,
  printLogo: true,
  printQr: true,
  qrEnabled: false,
  bankBin: '',
  bankCode: '',
  bankName: '',
  accountNumber: '',
  accountName: '',
  transferContentTemplate: 'BLOOMIA {invoiceCode}',
  showQrAtCheckout: true,
  showQrOnInvoice: true,
  qrSize: 'medium',
};

export async function getDevicePaymentSettings() {
  const db = await getDatabase();
  const rows = await db.select<{ value_json: string }>('SELECT value_json FROM settings WHERE key = ? LIMIT 1', [KEY]);
  if (!rows[0]?.value_json) return defaultDevicePaymentSettings;
  try {
    return { ...defaultDevicePaymentSettings, ...JSON.parse(rows[0].value_json) } as DevicePaymentSettings;
  } catch {
    return defaultDevicePaymentSettings;
  }
}

export async function saveDevicePaymentSettings(settings: DevicePaymentSettings) {
  const db = await getDatabase();
  const normalized: DevicePaymentSettings = {
    ...settings,
    copies: Math.min(5, Math.max(1, Math.round(settings.copies || 1))),
    bankBin: settings.bankBin.trim(),
    bankCode: settings.bankCode.trim(),
    bankName: settings.bankName.trim(),
    accountNumber: settings.accountNumber.replace(/\s+/g, '').trim(),
    accountName: settings.accountName.trim(),
    transferContentTemplate: settings.transferContentTemplate.trim() || defaultDevicePaymentSettings.transferContentTemplate,
  };

  await db.execute(
    'INSERT OR REPLACE INTO settings (key, value_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
    [KEY, JSON.stringify(normalized)],
  );

  const persisted = await getDevicePaymentSettings();
  const criticalKeys: (keyof DevicePaymentSettings)[] = [
    'qrEnabled',
    'bankBin',
    'bankCode',
    'bankName',
    'accountNumber',
    'accountName',
    'transferContentTemplate',
    'showQrAtCheckout',
    'showQrOnInvoice',
    'printQr',
    'qrSize',
  ];
  const mismatch = criticalKeys.find((key) => persisted[key] !== normalized[key]);
  if (mismatch) {
    throw new Error(`Cấu hình QR chưa được lưu đúng trường ${String(mismatch)}.`);
  }

  return persisted;
}
