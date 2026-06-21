import { useEffect, useState } from 'react';
import { Badge, Button, SoftCard } from '../../components/ui';
import { getBloomiaAppStatus } from '../../services/system/systemService';
import {
  buildTechnicalDiagnosticReport,
  getPrinterDiagnosticSummary,
  openOperatingSystemPrinterSettings,
  runPrinterTestFromDiagnostics,
  type PrinterDiagnosticSummary,
} from '../../services/system/printerDiagnosticsService';

export function PrinterDiagnosticsPanel() {
  const [summary, setSummary] = useState<PrinterDiagnosticSummary | null>(null);
  const [appVersion, setAppVersion] = useState('');
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { void refresh(); }, []);

  async function refresh() {
    try {
      const [next, app] = await Promise.all([getPrinterDiagnosticSummary(), getBloomiaAppStatus()]);
      setSummary(next);
      setAppVersion(app.app_version);
      setMessage('');
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : String(caught));
    }
  }

  async function testPrinter() {
    if (!summary) return;
    try {
      setTesting(true);
      await runPrinterTestFromDiagnostics(summary);
      setMessage('Đã gửi job in thử.');
    } catch (caught) {
      setMessage(`In thử lỗi: ${caught instanceof Error ? caught.message : String(caught)}`);
    } finally {
      setTesting(false);
      await refresh();
    }
  }

  async function copyTechnicalReport() {
    if (!summary) return;
    const text = buildTechnicalDiagnosticReport(summary, null, appVersion);
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Đã sao chép báo cáo kỹ thuật.');
    } catch {
      setMessage('Không sao chép được báo cáo kỹ thuật.');
    }
  }

  return (
    <SoftCard className="span-5" title="Máy in & thanh toán" description="Trạng thái thiết bị đã lưu và kết quả test gần nhất.">
      <div className="diagnostic-summary">
        <Badge tone={summary?.selectedPrinterAvailable ? 'sage' : 'peach'}>{summary?.selectedPrinterAvailable ? 'Máy in khả dụng' : 'Không thấy máy in'}</Badge>
        <Badge tone={summary?.lastTest?.ok ? 'sage' : summary?.lastTest ? 'peach' : 'lavender'}>{summary?.lastTest ? (summary.lastTest.ok ? 'Test đạt' : 'Test lỗi') : 'Chưa test'}</Badge>
        <Badge tone={summary?.qrConfigurationValid ? 'sage' : 'peach'}>{summary?.qrEnabled ? 'VietQR bật' : 'VietQR tắt'}</Badge>
      </div>
      {message && <p className="setup-muted">{message}</p>}
      <div className="system-info-list">
        <div><span>Máy in đang dùng</span><strong>{summary?.selectedPrinter || 'Mặc định hệ điều hành'}</strong></div>
        <div><span>Khổ giấy</span><strong>{summary?.paperSize ?? '—'}</strong></div>
        <div><span>Số máy in nhận diện</span><strong>{summary?.printers.length ?? 0}</strong></div>
        <div><span>Danh sách</span><code>{summary?.printers.join(' | ') || 'Không tìm thấy'}</code></div>
        <div><span>Test gần nhất</span><strong>{summary?.lastTest ? new Date(summary.lastTest.testedAt).toLocaleString('vi-VN') : 'Chưa test'}</strong></div>
        <div><span>Kết quả test</span><code>{summary?.lastTest?.message ?? '—'}</code></div>
        <div><span>Cấu hình QR</span><strong>{summary?.qrConfigurationMessage ?? '—'}</strong></div>
      </div>
      <div className="setup-row-actions diagnostic-actions">
        <Button onClick={testPrinter} disabled={!summary || testing}>{testing ? 'Đang in...' : 'In thử lại'}</Button>
        <Button variant="soft" onClick={openOperatingSystemPrinterSettings}>Mở Printer Settings</Button>
        <Button variant="ghost" onClick={copyTechnicalReport} disabled={!summary}>Sao chép lỗi kỹ thuật</Button>
      </div>
      <p className="setup-muted diagnostic-note">Driver, port và hàng đợi chi tiết được kiểm tra trong Printer Settings của hệ điều hành.</p>
    </SoftCard>
  );
}
