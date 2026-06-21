import { getDevicePaymentSettings } from '../../db/repositories/devicePaymentSettingsRepository';
import { getPrinterTestDiagnostics, savePrinterTestDiagnostics } from '../../db/repositories/printerDiagnosticsRepository';
import { getPrinterSettings, type PaperSize } from '../../db/repositories/printerRepository';
import { validatePaymentQrSettings } from '../payment/vietQrService';
import { listLocalPrinters, testPrint } from '../printing/printerService';
import type { P0ReadinessReport } from './p0ReadinessService';

export interface PrinterDiagnosticSummary {
  printers: string[];
  selectedPrinter: string;
  selectedPrinterAvailable: boolean;
  usingSystemDefault: boolean;
  paperSize: PaperSize;
  lastTest: Awaited<ReturnType<typeof getPrinterTestDiagnostics>>;
  qrEnabled: boolean;
  qrConfigurationValid: boolean;
  qrConfigurationMessage: string;
  platform: string;
}

export async function getPrinterDiagnosticSummary(): Promise<PrinterDiagnosticSummary> {
  const [printers, printer, lastTest, paymentSettings] = await Promise.all([
    listLocalPrinters(),
    getPrinterSettings(),
    getPrinterTestDiagnostics(),
    getDevicePaymentSettings(),
  ]);
  const selectedPrinter = printer?.printer_name?.trim() ?? '';
  const qrMessage = validatePaymentQrSettings(paymentSettings);
  return {
    printers,
    selectedPrinter,
    selectedPrinterAvailable: selectedPrinter ? printers.includes(selectedPrinter) : printers.length > 0,
    usingSystemDefault: !selectedPrinter,
    paperSize: printer?.paper_size ?? '80mm',
    lastTest,
    qrEnabled: paymentSettings.qrEnabled,
    qrConfigurationValid: !paymentSettings.qrEnabled || !qrMessage,
    qrConfigurationMessage: paymentSettings.qrEnabled ? (qrMessage || 'Cấu hình VietQR đầy đủ.') : 'VietQR đang tắt.',
    platform: navigator.userAgent,
  };
}

export async function runPrinterTestFromDiagnostics(summary: PrinterDiagnosticSummary) {
  const testedAt = new Date().toISOString();
  const label = summary.selectedPrinter || 'Máy in mặc định';
  try {
    await testPrint(summary.selectedPrinter, summary.paperSize);
    return savePrinterTestDiagnostics({
      testedAt,
      printerName: label,
      paperSize: summary.paperSize,
      ok: true,
      message: 'Đã gửi job in thử tới hệ điều hành.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await savePrinterTestDiagnostics({
      testedAt,
      printerName: label,
      paperSize: summary.paperSize,
      ok: false,
      message,
    }).catch(() => undefined);
    throw error;
  }
}

export function openOperatingSystemPrinterSettings() {
  const userAgent = navigator.userAgent.toLowerCase();
  const url = userAgent.includes('windows')
    ? 'ms-settings:printers'
    : userAgent.includes('mac')
      ? 'x-apple.systempreferences:com.apple.Print-Scan-Settings.extension'
      : 'system-config-printer:';
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function buildTechnicalDiagnosticReport(
  summary: PrinterDiagnosticSummary,
  readiness: P0ReadinessReport | null,
  appVersion?: string,
) {
  const lines = [
    'BLOOMIA — BÁO CÁO THIẾT BỊ & THANH TOÁN',
    `Thời gian: ${new Date().toLocaleString('vi-VN')}`,
    `Phiên bản: ${appVersion ?? '—'}`,
    `Nền tảng: ${summary.platform}`,
    '',
    `Máy in đã chọn: ${summary.selectedPrinter || 'Mặc định hệ điều hành'}`,
    `Khổ giấy: ${summary.paperSize}`,
    `Máy in khả dụng: ${summary.selectedPrinterAvailable ? 'Có' : 'Không'}`,
    `Danh sách máy in: ${summary.printers.length ? summary.printers.join(' | ') : 'Không tìm thấy'}`,
    `Lần test gần nhất: ${summary.lastTest ? `${summary.lastTest.ok ? 'Đạt' : 'Lỗi'} — ${summary.lastTest.testedAt} — ${summary.lastTest.message}` : 'Chưa test'}`,
    '',
    `VietQR: ${summary.qrEnabled ? 'Bật' : 'Tắt'}`,
    `Cấu hình QR: ${summary.qrConfigurationMessage}`,
  ];

  if (readiness) {
    lines.push('', `P0 readiness: ${readiness.ready ? 'Sẵn sàng' : 'Có lỗi'} — ${readiness.passed} đạt, ${readiness.warnings} cảnh báo, ${readiness.failed} lỗi`);
    for (const check of readiness.checks) lines.push(`[${check.status.toUpperCase()}] ${check.label}: ${check.detail}`);
  }
  return lines.join('\n');
}
