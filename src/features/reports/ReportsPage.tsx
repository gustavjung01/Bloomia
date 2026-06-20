import { useEffect, useMemo, useState } from 'react';

import { Badge, Button, PillTabs, SoftCard } from '../../components/ui';
import { getInventoryReport, getSalesReport, getWasteReport, type InventoryReportRow, type SalesReportRow, type WasteReportRow } from '../../db/repositories/reportsRepository';
import { formatCurrency } from '../../utils/format';

type ReportTab = 'sales' | 'inventory' | 'waste';
type CsvCell = string | number | null | undefined;

export function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('sales');
  const [sales, setSales] = useState<SalesReportRow[]>([]);
  const [inventory, setInventory] = useState<InventoryReportRow[]>([]);
  const [waste, setWaste] = useState<WasteReportRow[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { void refreshReports(); }, []);

  async function refreshReports() {
    try {
      setError('');
      setStatus('Đang tải báo cáo...');
      const data = await Promise.all([getSalesReport(30), getInventoryReport(), getWasteReport(30)]);
      setSales(data[0]);
      setInventory(data[1]);
      setWaste(data[2]);
      setStatus('Báo cáo đã được cập nhật.');
    } catch (caught) {
      console.error(caught);
      setStatus('');
      setError('Không tải được báo cáo. Cần chạy trong Tauri runtime.');
    }
  }

  function handleExportReport() {
    const date = new Date().toISOString().slice(0, 10);
    if (tab === 'sales') {
      exportCsv(`bloomia-doanh-thu-${date}.csv`, ['Ngày', 'Số đơn', 'Doanh thu', 'Tạm tính', 'Chiết khấu', 'Phí giao', 'Giá vốn', 'Lời tạm'], sales.map((row) => [row.day, row.orders, row.revenue, row.subtotal, row.discount_amount, row.shipping_fee, row.estimated_cost, row.estimated_profit]));
      setStatus('Đã xuất báo cáo doanh thu CSV.');
      return;
    }
    if (tab === 'inventory') {
      exportCsv(`bloomia-ton-kho-${date}.csv`, ['Hàng', 'Loại', 'Tồn', 'Đơn vị', 'Giá nhập gần nhất', 'Giá trị tồn', 'Dự kiến héo'], inventory.map((row) => [row.item_name, row.item_type, row.quantity, row.unit_symbol ?? '', row.latest_unit_cost ?? '', row.inventory_value, row.nearest_expiry_date ?? '']));
      setStatus('Đã xuất báo cáo tồn kho CSV.');
      return;
    }
    exportCsv(`bloomia-hao-hut-${date}.csv`, ['Hàng', 'Số lượng', 'Giá vốn', 'Thành tiền', 'Lý do', 'Ngày'], waste.map((row) => [row.item_name, row.quantity, row.unit_cost, row.amount, row.reason ?? '', row.created_at]));
    setStatus('Đã xuất báo cáo hao hụt CSV.');
  }

  const totals = useMemo(() => ({
    revenue: sales.reduce((sum, row) => sum + row.revenue, 0),
    profit: sales.reduce((sum, row) => sum + row.estimated_profit, 0),
    stockValue: inventory.reduce((sum, row) => sum + row.inventory_value, 0),
    wasteValue: waste.reduce((sum, row) => sum + row.amount, 0),
  }), [sales, inventory, waste]);

  return (
    <>
      <div className="page-title-row">
        <div><span className="eyebrow">Báo cáo</span><h2>Doanh thu, tồn kho và hao hụt</h2></div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <PillTabs value={tab} onChange={setTab} options={[{ label: 'Doanh thu', value: 'sales' }, { label: 'Tồn kho', value: 'inventory' }, { label: 'Hao hụt', value: 'waste' }]} />
          <Button variant="soft" onClick={handleExportReport}>Xuất CSV</Button>
          <Button variant="soft" onClick={refreshReports}>Làm mới</Button>
        </div>
      </div>

      {(status || error) && <div className="setup-status-row">{status && <Badge tone="sage">{status}</Badge>}{error && <Badge tone="peach">{error}</Badge>}</div>}

      <div className="page-grid">
        <Metric label="Doanh thu 30 ngày" value={formatCurrency(totals.revenue)} tone="pink" />
        <Metric label="Lời tạm tính" value={formatCurrency(totals.profit)} tone="sage" />
        <Metric label="Giá trị tồn" value={formatCurrency(totals.stockValue)} tone="lavender" />
        <Metric label="Hao hụt 30 ngày" value={formatCurrency(totals.wasteValue)} tone="peach" />
        {tab === 'sales' && <SalesTable rows={sales} />}
        {tab === 'inventory' && <InventoryTable rows={inventory} />}
        {tab === 'waste' && <WasteTable rows={waste} />}
      </div>
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'pink' | 'sage' | 'lavender' | 'peach' }) {
  return <SoftCard className="span-3"><Badge tone={tone}>{label}</Badge><h2 style={{ marginTop: 16 }}>{value}</h2></SoftCard>;
}

function SalesTable({ rows }: { rows: SalesReportRow[] }) {
  return <SoftCard className="span-12" title="Doanh thu theo ngày"><div className="report-table"><div className="report-table-head"><span>Ngày</span><span>Đơn</span><span>Doanh thu</span><span>Giá vốn</span><span>Lời tạm</span></div>{rows.map((row) => <div className="report-table-row" key={row.day}><strong>{row.day}</strong><span>{row.orders}</span><span>{formatCurrency(row.revenue)}</span><span>{formatCurrency(row.estimated_cost)}</span><span>{formatCurrency(row.estimated_profit)}</span></div>)}</div></SoftCard>;
}

function InventoryTable({ rows }: { rows: InventoryReportRow[] }) {
  return <SoftCard className="span-12" title="Tồn kho"><div className="report-table"><div className="report-table-head"><span>Hàng</span><span>Tồn</span><span>Giá gần nhất</span><span>Giá trị</span><span>Dự kiến héo</span></div>{rows.map((row) => <div className="report-table-row" key={row.item_id}><strong>{row.item_name}</strong><span>{row.quantity} {row.unit_symbol ?? ''}</span><span>{row.latest_unit_cost === null ? '—' : formatCurrency(row.latest_unit_cost)}</span><span>{formatCurrency(row.inventory_value)}</span><span>{row.nearest_expiry_date ?? '—'}</span></div>)}</div></SoftCard>;
}

function WasteTable({ rows }: { rows: WasteReportRow[] }) {
  return <SoftCard className="span-12" title="Hao hụt"><div className="report-table"><div className="report-table-head"><span>Hàng</span><span>SL</span><span>Giá vốn</span><span>Thành tiền</span><span>Ngày</span></div>{rows.map((row) => <div className="report-table-row" key={`${row.item_name}-${row.created_at}`}><strong>{row.item_name}</strong><span>{row.quantity}</span><span>{formatCurrency(row.unit_cost)}</span><span>{formatCurrency(row.amount)}</span><span>{row.created_at}</span></div>)}</div></SoftCard>;
}

function exportCsv(filename: string, headers: string[], rows: CsvCell[][]) {
  const body = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${body}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: CsvCell) {
  const raw = String(value ?? '');
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}
