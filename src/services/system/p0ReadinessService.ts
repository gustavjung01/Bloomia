import { getDatabase } from '../../db/client';
import { getDevicePaymentSettings } from '../../db/repositories/devicePaymentSettingsRepository';
import { getPrinterTestDiagnostics } from '../../db/repositories/printerDiagnosticsRepository';
import { getPrinterSettings } from '../../db/repositories/printerRepository';
import { buildVietQrSnapshot, validatePaymentQrSettings } from '../payment/vietQrService';
import { listLocalPrinters } from '../printing/printerService';

export type ReadinessStatus = 'pass' | 'warn' | 'fail';

export interface ReadinessCheck {
  id: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
}

export interface P0ReadinessReport {
  checkedAt: string;
  checks: ReadinessCheck[];
  passed: number;
  warnings: number;
  failed: number;
  ready: boolean;
}

interface ColumnRow {
  name: string;
}

interface CountRow {
  count: number;
}

const requiredPaymentColumns = [
  'received_amount',
  'returned_amount',
  'bank_bin',
  'bank_code',
  'bank_name',
  'account_number',
  'account_name',
  'transfer_reference',
  'qr_amount',
  'qr_image_url',
  'transfer_confirmed_at',
];

export async function runP0ReadinessAudit(): Promise<P0ReadinessReport> {
  const checks: ReadinessCheck[] = [];
  const db = await getDatabase();

  try {
    const migrationRows = await db.select<{ id: string }>(
      "SELECT id FROM schema_migrations WHERE id IN ('0007_checkout_amount_details', '0008_payment_qr_snapshot')",
    );
    const applied = new Set(migrationRows.map((row) => row.id));
    const missing = ['0007_checkout_amount_details', '0008_payment_qr_snapshot'].filter((id) => !applied.has(id));
    checks.push({
      id: 'migrations',
      label: 'Migration thanh toán & QR',
      status: missing.length === 0 ? 'pass' : 'fail',
      detail: missing.length === 0 ? 'Đã áp dụng đầy đủ migration 0007 và 0008.' : `Thiếu migration: ${missing.join(', ')}.`,
    });
  } catch (error) {
    checks.push({ id: 'migrations', label: 'Migration thanh toán & QR', status: 'fail', detail: errorText(error) });
  }

  try {
    const columns = await db.select<ColumnRow>('PRAGMA table_info(payments)');
    const available = new Set(columns.map((row) => row.name));
    const missingColumns = requiredPaymentColumns.filter((name) => !available.has(name));
    checks.push({
      id: 'payment-schema',
      label: 'Cấu trúc bảng payment',
      status: missingColumns.length === 0 ? 'pass' : 'fail',
      detail: missingColumns.length === 0 ? 'Đủ trường tiền nhận, tiền thừa và snapshot VietQR.' : `Thiếu cột: ${missingColumns.join(', ')}.`,
    });
  } catch (error) {
    checks.push({ id: 'payment-schema', label: 'Cấu trúc bảng payment', status: 'fail', detail: errorText(error) });
  }

  const probeKey = `p0_write_probe_${Date.now()}`;
  try {
    await db.execute(
      'INSERT INTO settings (key, value_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [probeKey, JSON.stringify({ checkedAt: new Date().toISOString() })],
    );
    const rows = await db.select<{ value_json: string }>('SELECT value_json FROM settings WHERE key = ? LIMIT 1', [probeKey]);
    if (!rows[0]?.value_json) throw new Error('Đã ghi nhưng không đọc lại được dữ liệu kiểm tra.');
    await db.execute('DELETE FROM settings WHERE key = ?', [probeKey]);
    checks.push({
      id: 'sqlite-write',
      label: 'Quyền ghi SQLite',
      status: 'pass',
      detail: 'Đã ghi, đọc lại và xóa dữ liệu kiểm tra thành công.',
    });
  } catch (error) {
    await db.execute('DELETE FROM settings WHERE key = ?', [probeKey]).catch(() => undefined);
    checks.push({ id: 'sqlite-write', label: 'Quyền ghi SQLite', status: 'fail', detail: errorText(error) });
  }

  const [deviceSettings, printerSettings, printers, lastTest] = await Promise.all([
    getDevicePaymentSettings(),
    getPrinterSettings(),
    listLocalPrinters(),
    getPrinterTestDiagnostics(),
  ]);

  const selectedPrinter = printerSettings?.printer_name?.trim() ?? '';
  const printerAvailable = selectedPrinter ? printers.includes(selectedPrinter) : printers.length > 0;
  checks.push({
    id: 'printer-availability',
    label: 'Máy in đã chọn',
    status: printerAvailable ? 'pass' : 'warn',
    detail: selectedPrinter
      ? (printerAvailable ? `${selectedPrinter} đang có trong danh sách hệ điều hành.` : `${selectedPrinter} không còn trong danh sách máy in.`)
      : (printers.length > 0 ? `Đang dùng máy in mặc định; hệ điều hành có ${printers.length} máy in.` : 'Không tìm thấy máy in local.'),
  });

  checks.push({
    id: 'printer-test',
    label: 'Bản in thử gần nhất',
    status: lastTest?.ok ? 'pass' : lastTest ? 'fail' : 'warn',
    detail: lastTest
      ? `${lastTest.ok ? 'Đạt' : 'Lỗi'} lúc ${new Date(lastTest.testedAt).toLocaleString('vi-VN')} — ${lastTest.message}`
      : 'Chưa có lần in thử nào được ghi nhận.',
  });

  if (!deviceSettings.qrEnabled) {
    checks.push({ id: 'qr-config', label: 'Cấu hình VietQR', status: 'warn', detail: 'VietQR đang tắt; thanh toán chuyển khoản sẽ không có QR.' });
    checks.push({ id: 'qr-image', label: 'Khả năng tải ảnh QR', status: 'warn', detail: 'Bỏ qua vì VietQR đang tắt.' });
  } else {
    const validationError = validatePaymentQrSettings(deviceSettings);
    checks.push({
      id: 'qr-config',
      label: 'Cấu hình VietQR',
      status: validationError ? 'fail' : 'pass',
      detail: validationError || `${deviceSettings.bankName || deviceSettings.bankCode || deviceSettings.bankBin} • ${maskAccount(deviceSettings.accountNumber)}.`,
    });

    const snapshot = validationError ? null : buildVietQrSnapshot(deviceSettings, 150000, 'BLM-AUDIT-TEST', 'qr_only');
    if (!snapshot) {
      checks.push({ id: 'qr-image', label: 'Khả năng tải ảnh QR', status: 'fail', detail: 'Không tạo được URL QR thử.' });
    } else {
      const imageOk = await probeImage(snapshot.imageUrl);
      checks.push({
        id: 'qr-image',
        label: 'Khả năng tải ảnh QR',
        status: imageOk ? 'pass' : 'fail',
        detail: imageOk ? 'Đã tải được QR thử 150.000đ từ dịch vụ VietQR.' : 'Không tải được ảnh QR; kiểm tra Internet, BIN và số tài khoản.',
      });
    }
  }

  try {
    const transferRows = await db.select<CountRow>("SELECT COUNT(*) AS count FROM payments WHERE method = 'bank_transfer'");
    const invalidRows = await db.select<CountRow>(
      `SELECT COUNT(*) AS count
       FROM payments
       WHERE method = 'bank_transfer'
         AND (qr_amount <= 0 OR qr_image_url IS NULL OR transfer_reference IS NULL OR transfer_confirmed_at IS NULL)`,
    );
    const total = Number(transferRows[0]?.count ?? 0);
    const invalid = Number(invalidRows[0]?.count ?? 0);
    checks.push({
      id: 'transfer-snapshots',
      label: 'Snapshot chuyển khoản đã lưu',
      status: invalid > 0 ? 'warn' : 'pass',
      detail: total === 0 ? 'Chưa có hóa đơn chuyển khoản để đối chiếu.' : `${total - invalid}/${total} payment có đầy đủ QR và thời điểm xác nhận.`,
    });
  } catch (error) {
    checks.push({ id: 'transfer-snapshots', label: 'Snapshot chuyển khoản đã lưu', status: 'fail', detail: errorText(error) });
  }

  const passed = checks.filter((check) => check.status === 'pass').length;
  const warnings = checks.filter((check) => check.status === 'warn').length;
  const failed = checks.filter((check) => check.status === 'fail').length;
  return {
    checkedAt: new Date().toISOString(),
    checks,
    passed,
    warnings,
    failed,
    ready: failed === 0,
  };
}

export function readinessReportText(report: P0ReadinessReport) {
  const lines = [
    `Bloomia P0 readiness — ${new Date(report.checkedAt).toLocaleString('vi-VN')}`,
    `Đạt: ${report.passed} | Cảnh báo: ${report.warnings} | Lỗi: ${report.failed}`,
    '',
  ];
  for (const check of report.checks) {
    const marker = check.status === 'pass' ? 'PASS' : check.status === 'warn' ? 'WARN' : 'FAIL';
    lines.push(`[${marker}] ${check.label}: ${check.detail}`);
  }
  return lines.join('\n');
}

function probeImage(url: string) {
  return new Promise<boolean>((resolve) => {
    const image = new Image();
    const timeout = window.setTimeout(() => resolve(false), 8000);
    image.onload = () => { window.clearTimeout(timeout); resolve(true); };
    image.onerror = () => { window.clearTimeout(timeout); resolve(false); };
    image.src = `${url}${url.includes('?') ? '&' : '?'}audit=${Date.now()}`;
  });
}

function maskAccount(value: string) {
  const clean = value.replace(/\s+/g, '');
  if (clean.length <= 4) return clean || 'Chưa nhập tài khoản';
  return `${'*'.repeat(Math.max(4, clean.length - 4))}${clean.slice(-4)}`;
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
