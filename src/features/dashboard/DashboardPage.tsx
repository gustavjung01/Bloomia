import { useEffect, useState } from 'react';

import { Badge, Button, SoftCard } from '../../components/ui';
import { getDashboardSummary, getSalesReport, type DashboardSummary, type SalesReportRow } from '../../db/repositories/reportsRepository';
import { listTodayDeliveries, type FlowerOrderRecord } from '../../db/repositories/ordersRepository';
import { formatCurrency } from '../../utils/format';

const emptySummary: DashboardSummary = { todayRevenue: 0, todayOrders: 0, openFlowerOrders: 0, deliveryToday: 0, estimatedProfit: 0, wasteCost: 0 };

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [sales, setSales] = useState<SalesReportRow[]>([]);
  const [deliveries, setDeliveries] = useState<FlowerOrderRecord[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    void refreshDashboard();
  }, []);

  async function refreshDashboard() {
    try {
      setError('');
      const [summaryData, salesRows, deliveryRows] = await Promise.all([getDashboardSummary(), getSalesReport(7), listTodayDeliveries()]);
      setSummary(summaryData);
      setSales(salesRows);
      setDeliveries(deliveryRows);
    } catch (caught) {
      console.error(caught);
      setError('Không tải được dashboard. Cần chạy trong Tauri runtime.');
    }
  }

  const stats = [
    { label: 'Doanh thu hôm nay', value: formatCurrency(summary.todayRevenue), tone: 'pink' as const },
    { label: 'Hóa đơn hôm nay', value: String(summary.todayOrders), tone: 'lavender' as const },
    { label: 'Đơn hoa mở', value: String(summary.openFlowerOrders), tone: 'peach' as const },
    { label: 'Lợi nhuận tạm tính', value: formatCurrency(summary.estimatedProfit), tone: 'sage' as const },
  ];

  return (
    <>
      <div className="page-title-row">
        <div><span className="eyebrow">Tổng quan</span><h2>Nhịp tiệm hoa hôm nay</h2></div>
        <Button variant="soft" onClick={refreshDashboard}>Làm mới</Button>
      </div>

      {error && <div className="setup-status-row"><Badge tone="peach">{error}</Badge></div>}

      <div className="page-grid">
        {stats.map((stat) => <SoftCard key={stat.label} className="span-3"><Badge tone={stat.tone}>{stat.label}</Badge><h2 style={{ marginTop: 16 }}>{stat.value}</h2></SoftCard>)}

        <SoftCard className="span-8" title="Doanh thu 7 ngày" description="Đọc từ bảng sales và sale_items.">
          <div className="report-mini-list">
            {sales.length === 0 && <p className="setup-muted">Chưa có hóa đơn.</p>}
            {sales.map((row) => <div className="report-mini-row" key={row.day}><strong>{row.day}</strong><span>{row.orders} đơn</span><span>{formatCurrency(row.revenue)}</span><span>Lời tạm: {formatCurrency(row.estimated_profit)}</span></div>)}
          </div>
        </SoftCard>

        <SoftCard className="span-4" title="Đơn cần giao hôm nay" description={`${summary.deliveryToday} đơn chưa hoàn tất`}>
          <div className="report-mini-list">
            {deliveries.length === 0 && <p className="setup-muted">Không có đơn cần giao hôm nay.</p>}
            {deliveries.map((order) => <Badge key={order.id} tone="lavender">{order.delivery_at ?? 'Chưa giờ'} — {order.recipient_name ?? order.customer_name ?? 'Khách'}</Badge>)}
          </div>
        </SoftCard>
      </div>
    </>
  );
}
