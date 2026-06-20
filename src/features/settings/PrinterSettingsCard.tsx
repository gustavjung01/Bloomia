import { useEffect, useState } from 'react';

import { Badge, Button, SelectField, SoftCard, TextField } from '../../components/ui';
import { getPrinterSettings, savePrinterSettings, type PaperSize } from '../../db/repositories/printerRepository';
import { listLocalPrinters } from '../../services/printing/printerService';

const paperSizeOptions = [
  { label: '58mm', value: '58mm' },
  { label: '80mm', value: '80mm' },
  { label: 'A4', value: 'A4' },
];

export function PrinterSettingsCard() {
  const [printerName, setPrinterName] = useState('');
  const [paperSize, setPaperSize] = useState<PaperSize>('80mm');
  const [printers, setPrinters] = useState<string[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    void loadPrinterSettings();
  }, []);

  async function loadPrinterSettings() {
    try {
      const settings = await getPrinterSettings();
      const localPrinters = await listLocalPrinters();
      setPrinterName(settings?.printer_name ?? '');
      setPaperSize(settings?.paper_size ?? '80mm');
      setPrinters(localPrinters);
    } catch (error) {
      console.error(error);
      setStatus('Không tải được cấu hình máy in.');
    }
  }

  async function handleSave() {
    try {
      await savePrinterSettings(printerName, paperSize);
      setStatus('Đã lưu cấu hình máy in.');
    } catch (error) {
      console.error(error);
      setStatus('Không lưu được cấu hình máy in.');
    }
  }

  return (
    <SoftCard className="span-12" title="Máy in" description="Chọn máy in mặc định và khổ giấy hóa đơn.">
      <div className="page-grid">
        <div className="span-4">
          <SelectField
            label="Máy in tìm thấy"
            value={printerName}
            options={[{ label: 'Chọn máy in', value: '' }, ...printers.map((printer) => ({ label: printer, value: printer }))]}
            onChange={(event) => setPrinterName(event.target.value)}
          />
        </div>
        <div className="span-4">
          <TextField label="Tên máy in" value={printerName} onChange={(event) => setPrinterName(event.target.value)} />
        </div>
        <div className="span-2">
          <SelectField label="Khổ giấy" value={paperSize} options={paperSizeOptions} onChange={(event) => setPaperSize(event.target.value as PaperSize)} />
        </div>
        <div className="span-2" style={{ alignSelf: 'end' }}>
          <Button onClick={handleSave}>Lưu</Button>
        </div>
      </div>
      {status && (
        <div className="setup-status-row" style={{ marginTop: 16, marginBottom: 0 }}>
          <Badge tone="lavender">{status}</Badge>
        </div>
      )}
    </SoftCard>
  );
}
