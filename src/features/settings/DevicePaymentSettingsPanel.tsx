import { useEffect, useMemo, useState } from 'react';

import { Badge, Button, SelectField, SoftCard, TextField } from '../../components/ui';
import {
  defaultDevicePaymentSettings,
  getDevicePaymentSettings,
  saveDevicePaymentSettings,
  type DevicePaymentSettings,
} from '../../db/repositories/devicePaymentSettingsRepository';
import {
  getPrinterTestDiagnostics,
  savePrinterTestDiagnostics,
  type PrinterTestDiagnostics,
} from '../../db/repositories/printerDiagnosticsRepository';
import {
  getPrinterSettings,
  savePrinterSettings,
  type PaperSize,
} from '../../db/repositories/printerRepository';
import { listLocalPrinters, testPrint } from '../../services/printing/printerService';
import { buildVietQrSnapshot, validatePaymentQrSettings } from '../../services/payment/vietQrService';
import { formatCurrency } from '../../utils/format';

const paperOptions = [
  { label: '58 mm', value: '58mm' },
  { label: '80 mm', value: '80mm' },
  { label: 'A4', value: 'A4' },
];

const qrSizeOptions = [
  { label: 'Nhỏ', value: 'small' },
  { label: 'Vừa', value: 'medium' },
  { label: 'Lớn', value: 'large' },
];

export function DevicePaymentSettingsPanel() {
  const [printers, setPrinters] = useState<string[]>([]);
  const [printerName, setPrinterName] = useState('');
  const [paperSize, setPaperSize] = useState<PaperSize>('80mm');
  const [settings, setSettings] = useState<DevicePaymentSettings>(defaultDevicePaymentSettings);
  const [lastTest, setLastTest] = useState<PrinterTestDiagnostics | null>(null);
  const [testAmount, setTestAmount] = useState('250000');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [testingPrinter, setTestingPrinter] = useState(false);

  useEffect(() => {
    void refresh();
  }, []);

  const printerOptions = useMemo(
    () => [
      { label: 'Máy in mặc định của hệ điều hành', value: '' },
      ...printers.map((name) => ({ label: name, value: name })),
    ],
    [printers],
  );

  const preview = useMemo(
    () => buildVietQrSnapshot(settings, Number(testAmount), 'BLM-QR-TEST', settings.qrSize === 'large' ? 'print' : 'qr_only'),
    [settings, testAmount],
  );

  const selectedPrinterAvailable = !printerName || printers.includes(printerName);

  async function refresh() {
    try {
      setError('');
      const [printerRows, printer, deviceSettings, testDiagnostics] = await Promise.all([
        listLocalPrinters(),
        getPrinterSettings(),
        getDevicePaymentSettings(),
        getPrinterTestDiagnostics(),
      ]);
      setPrinters(printerRows);
      setPrinterName(printer?.printer_name ?? '');
      setPaperSize(printer?.paper_size ?? '80mm');
      setSettings(deviceSettings);
      setLastTest(testDiagnostics);
      setMessage('Đã tải cấu hình thiết bị và thanh toán.');
    } catch (caught) {
      console.error(caught);
      setError('Không tải được cấu hình máy in hoặc thanh toán. Hãy chạy bằng Tauri runtime.');
    }
  }

  async function handleSave() {
    const qrError = validatePaymentQrSettings(settings);
    if (qrError) {
      setError(qrError);
      return;
    }
    if (!selectedPrinterAvailable) {
      setError('Máy in đã lưu không còn trong danh sách của hệ điều hành. Hãy chọn lại máy in.');
      return;
    }

    try {
      setError('');
      setMessage('Đang lưu cấu hình...');
      await Promise.all([
        savePrinterSettings(printerName, paperSize),
        saveDevicePaymentSettings(settings),
      ]);
      setMessage('Đã lưu máy in và tài khoản nhận chuyển khoản.');
    } catch (caught) {
      console.error(caught);
      setMessage('');
      setError('Không lưu được cấu hình thiết bị và thanh toán.');
    }
  }

  async function handleTestPrinter() {
    const testedAt = new Date().toISOString();
    const targetLabel = printerName || 'Máy in mặc định';
    try {
      setTestingPrinter(true);
      setError('');
      setMessage('Đang gửi bản in thử...');
      await testPrint(printerName, paperSize, preview?.imageUrl ?? null);
      const result = await savePrinterTestDiagnostics({
        testedAt,
        printerName: targetLabel,
        paperSize,
        ok: true,
        message: 'Đã gửi job in thử tới Windows spooler.',
      });
      setLastTest(result);
      setMessage('Đã gửi bản in thử tới máy in đã chọn.');
    } catch (caught) {
      console.error(caught);
      const detail = caught instanceof Error ? caught.message : String(caught);
      const result = await savePrinterTestDiagnostics({
        testedAt,
        printerName: targetLabel,
        paperSize,
        ok: false,
        message: detail || 'Không gửi được job in thử.',
      }).catch(() => null);
      if (result) setLastTest(result);
      setMessage('');
      setError('Không in thử được. Kiểm tra máy in, driver và khổ giấy.');
    } finally {
      setTestingPrinter(false);
    }
  }

  return (
    <>
      {(message || error) && (
        <div className="setup-status-row">
          {message && <Badge tone="sage">{message}</Badge>}
          {error && <Badge tone="peach">{error}</Badge>}
        </div>
      )}

      <div className="page-grid">
        <SoftCard className="span-6" title="Máy in hóa đơn" description="Chọn máy in thật của hệ điều hành, lưu khổ giấy và gửi bản in kiểm tra.">
          <div className="setup-status-row" style={{ marginBottom: 12 }}>
            <Badge tone={selectedPrinterAvailable ? 'sage' : 'peach'}>{selectedPrinterAvailable ? 'Máy in khả dụng' : 'Máy in đã bị đổi/gỡ'}</Badge>
            <Badge tone={lastTest?.ok ? 'sage' : lastTest ? 'peach' : 'lavender'}>{lastTest ? (lastTest.ok ? 'Test gần nhất đạt' : 'Test gần nhất lỗi') : 'Chưa test máy in'}</Badge>
          </div>
          <div className="setup-form-grid">
            <SelectField label="Máy in" value={printerName} options={printerOptions} onChange={(event) => setPrinterName(event.target.value)} />
            <SelectField label="Khổ giấy" value={paperSize} options={paperOptions} onChange={(event) => setPaperSize(event.target.value as PaperSize)} />
            <TextField label="Số bản mặc định" type="number" min={1} max={5} value={settings.copies} onChange={(event) => setSettings((current) => ({ ...current, copies: Number(event.target.value) }))} />
            <label className="setup-checkbox"><input type="checkbox" checked={settings.autoPrintAfterPayment} onChange={(event) => setSettings((current) => ({ ...current, autoPrintAfterPayment: event.target.checked }))} />Tự in sau khi thanh toán</label>
            <label className="setup-checkbox"><input type="checkbox" checked={settings.printLogo} onChange={(event) => setSettings((current) => ({ ...current, printLogo: event.target.checked }))} />In logo shop khi renderer hỗ trợ</label>
            <label className="setup-checkbox"><input type="checkbox" checked={settings.printQr} onChange={(event) => setSettings((current) => ({ ...current, printQr: event.target.checked }))} />In QR chuyển khoản trên hóa đơn</label>
            {lastTest && (
              <div className="system-info-list">
                <div><span>Lần test gần nhất</span><strong>{new Date(lastTest.testedAt).toLocaleString('vi-VN')}</strong></div>
                <div><span>Thiết bị / khổ giấy</span><strong>{lastTest.printerName} • {lastTest.paperSize}</strong></div>
                <div><span>Kết quả</span><code>{lastTest.message}</code></div>
              </div>
            )}
            <div className="setup-row-actions">
              <Button variant="soft" onClick={refresh}>Làm mới danh sách</Button>
              <Button onClick={handleTestPrinter} disabled={testingPrinter}>{testingPrinter ? 'Đang in thử...' : 'In thử máy đã chọn'}</Button>
            </div>
          </div>
        </SoftCard>

        <SoftCard className="span-6" title="Tài khoản nhận chuyển khoản" description="Thông tin công khai để tạo VietQR theo đúng số tiền thực của hóa đơn.">
          <div className="setup-form-grid">
            <label className="setup-checkbox"><input type="checkbox" checked={settings.qrEnabled} onChange={(event) => setSettings((current) => ({ ...current, qrEnabled: event.target.checked }))} />Bật thanh toán bằng VietQR</label>
            <div className="page-grid">
              <div className="span-6"><TextField label="Tên ngân hàng" value={settings.bankName} placeholder="Ví dụ: Vietcombank" onChange={(event) => setSettings((current) => ({ ...current, bankName: event.target.value }))} /></div>
              <div className="span-3"><TextField label="Mã BIN" value={settings.bankBin} placeholder="970436" onChange={(event) => setSettings((current) => ({ ...current, bankBin: event.target.value }))} /></div>
              <div className="span-3"><TextField label="Mã ngân hàng" value={settings.bankCode} placeholder="VCB" onChange={(event) => setSettings((current) => ({ ...current, bankCode: event.target.value }))} /></div>
            </div>
            <TextField label="Số tài khoản" value={settings.accountNumber} onChange={(event) => setSettings((current) => ({ ...current, accountNumber: event.target.value }))} />
            <TextField label="Tên chủ tài khoản" value={settings.accountName} onChange={(event) => setSettings((current) => ({ ...current, accountName: event.target.value.toUpperCase() }))} />
            <TextField label="Mẫu nội dung chuyển khoản" value={settings.transferContentTemplate} placeholder="BLOOMIA {invoiceCode}" onChange={(event) => setSettings((current) => ({ ...current, transferContentTemplate: event.target.value }))} />
            <SelectField label="Kích thước QR" value={settings.qrSize} options={qrSizeOptions} onChange={(event) => setSettings((current) => ({ ...current, qrSize: event.target.value as DevicePaymentSettings['qrSize'] }))} />
            <label className="setup-checkbox"><input type="checkbox" checked={settings.showQrAtCheckout} onChange={(event) => setSettings((current) => ({ ...current, showQrAtCheckout: event.target.checked }))} />Hiện QR trong màn hình thanh toán</label>
            <label className="setup-checkbox"><input type="checkbox" checked={settings.showQrOnInvoice} onChange={(event) => setSettings((current) => ({ ...current, showQrOnInvoice: event.target.checked }))} />Hiện QR trên hóa đơn chưa thanh toán</label>
          </div>
        </SoftCard>

        <SoftCard className="span-12" title="Kiểm tra QR theo số tiền thực" description="QR thử dùng đúng ngân hàng, tài khoản, số tiền và nội dung chuyển khoản hiện tại.">
          <div className="device-payment-preview">
            <div className="setup-form-grid">
              <TextField label="Số tiền thử" type="number" min={1} value={testAmount} onChange={(event) => setTestAmount(event.target.value)} />
              <div className="system-info-list">
                <div><span>Người nhận</span><strong>{settings.accountName || 'Chưa nhập'}</strong></div>
                <div><span>Tài khoản</span><strong>{settings.accountNumber || 'Chưa nhập'}</strong></div>
                <div><span>Số tiền</span><strong>{formatCurrency(Number(testAmount))}</strong></div>
                <div><span>Nội dung</span><strong>{preview?.transferReference || 'Chưa tạo được QR'}</strong></div>
              </div>
            </div>
            <div className="payment-qr-preview">
              {preview ? <img src={preview.imageUrl} alt="VietQR kiểm tra" /> : <p className="setup-muted">Bật VietQR và nhập mã ngân hàng, số tài khoản để xem trước.</p>}
            </div>
          </div>
          <div className="setup-row-actions" style={{ marginTop: 16 }}><Button onClick={handleSave}>Lưu thiết bị & thanh toán</Button></div>
        </SoftCard>
      </div>
    </>
  );
}
