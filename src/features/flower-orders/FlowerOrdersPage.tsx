import { useEffect, useMemo, useState } from 'react';

import { Badge, Button, SelectField, SoftCard, TextArea, TextField } from '../../components/ui';
import { listFlowerOrders, listTodayDeliveries, saveFlowerOrder, updateFlowerOrderStatus, type FlowerOrderRecord, type FlowerOrderStatus } from '../../db/repositories/ordersRepository';
import { formatCurrency } from '../../utils/format';

interface OrderFormState {
  customerName: string;
  customerPhone: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAt: string;
  deliveryAddress: string;
  occasion: string;
  colorTone: string;
  budgetAmount: string;
  cardMessage: string;
  internalNote: string;
}

const emptyForm: OrderFormState = { customerName: '', customerPhone: '', recipientName: '', recipientPhone: '', deliveryAt: '', deliveryAddress: '', occasion: '', colorTone: '', budgetAmount: '500000', cardMessage: '', internalNote: '' };

const statusLabels: Record<FlowerOrderStatus, string> = {
  new: 'Mới nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  ready: 'Đã xong',
  delivering: 'Đang giao',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({ value, label }));

export function FlowerOrdersPage() {
  const [orders, setOrders] = useState<FlowerOrderRecord[]>([]);
  const [todayDeliveries, setTodayDeliveries] = useState<FlowerOrderRecord[]>([]);
  const [form, setForm] = useState<OrderFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { void refreshOrders(); }, []);

  const openOrders = useMemo(() => orders.filter((order) => !['completed', 'cancelled'].includes(order.status)), [orders]);

  async function refreshOrders() {
    try {
      setError('');
      const data = await Promise.all([listFlowerOrders(), listTodayDeliveries()]);
      setOrders(data[0]);
      setTodayDeliveries(data[1]);
    } catch (caught) {
      console.error(caught);
      setError('Không tải được đơn hoa. Cần chạy trong Tauri runtime.');
    }
  }

  async function handleSaveOrder() {
    try {
      setStatus('Đang lưu đơn...');
      setError('');
      await saveFlowerOrder({
        id: editingId,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        recipientName: form.recipientName,
        recipientPhone: form.recipientPhone,
        deliveryAt: form.deliveryAt,
        deliveryAddress: form.deliveryAddress,
        occasion: form.occasion,
        colorTone: form.colorTone,
        budgetAmount: Number(form.budgetAmount || 0),
        cardMessage: form.cardMessage,
        internalNote: form.internalNote,
        status: 'new',
        paymentStatus: 'unpaid',
      });
      setForm(emptyForm);
      setEditingId(undefined);
      setStatus('Đã lưu đơn hoa.');
      await refreshOrders();
    } catch (caught) {
      console.error(caught);
      setStatus('');
      setError('Không lưu được đơn hoa.');
    }
  }

  async function handleStatusChange(id: string, nextStatus: FlowerOrderStatus) {
    await updateFlowerOrderStatus(id, nextStatus);
    await refreshOrders();
  }

  function editOrder(order: FlowerOrderRecord) {
    setEditingId(order.id);
    setForm({
      customerName: order.customer_name ?? '',
      customerPhone: '',
      recipientName: order.recipient_name ?? '',
      recipientPhone: order.recipient_phone ?? '',
      deliveryAt: order.delivery_at ?? '',
      deliveryAddress: order.delivery_address ?? '',
      occasion: order.occasion ?? '',
      colorTone: order.color_tone ?? '',
      budgetAmount: String(order.budget_amount ?? 0),
      cardMessage: order.card_message ?? '',
      internalNote: order.internal_note ?? '',
    });
  }

  return (
    <>
      <div className="page-title-row">
        <div><span className="eyebrow">Đơn hoa</span><h2>Đơn đặt trước & giao hoa</h2></div>
        <Button variant="soft" onClick={refreshOrders}>Làm mới</Button>
      </div>

      {(status || error) && <div className="setup-status-row">{status && <Badge tone="sage">{status}</Badge>}{error && <Badge tone="peach">{error}</Badge>}</div>}

      <div className="page-grid">
        <SoftCard className="span-5" title={editingId ? 'Sửa đơn hoa' : 'Tạo đơn hoa'} description="Lưu tone màu, ngân sách, lời nhắn và lịch giao.">
          <div className="setup-form-grid">
            <TextField label="Khách hàng" value={form.customerName} onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} />
            <TextField label="SĐT khách" value={form.customerPhone} onChange={(event) => setForm((current) => ({ ...current, customerPhone: event.target.value }))} />
            <TextField label="Người nhận" value={form.recipientName} onChange={(event) => setForm((current) => ({ ...current, recipientName: event.target.value }))} />
            <TextField label="SĐT người nhận" value={form.recipientPhone} onChange={(event) => setForm((current) => ({ ...current, recipientPhone: event.target.value }))} />
            <TextField label="Giờ giao" type="datetime-local" value={form.deliveryAt} onChange={(event) => setForm((current) => ({ ...current, deliveryAt: event.target.value }))} />
            <TextField label="Địa chỉ giao" value={form.deliveryAddress} onChange={(event) => setForm((current) => ({ ...current, deliveryAddress: event.target.value }))} />
            <TextField label="Dịp tặng" value={form.occasion} onChange={(event) => setForm((current) => ({ ...current, occasion: event.target.value }))} />
            <TextField label="Tone màu" value={form.colorTone} onChange={(event) => setForm((current) => ({ ...current, colorTone: event.target.value }))} />
            <TextField label="Ngân sách" type="number" min={0} value={form.budgetAmount} onChange={(event) => setForm((current) => ({ ...current, budgetAmount: event.target.value }))} />
            <TextArea label="Lời nhắn thiệp" value={form.cardMessage} onChange={(event) => setForm((current) => ({ ...current, cardMessage: event.target.value }))} rows={3} />
            <TextArea label="Ghi chú nội bộ" value={form.internalNote} onChange={(event) => setForm((current) => ({ ...current, internalNote: event.target.value }))} rows={3} />
            <Button onClick={handleSaveOrder}>{editingId ? 'Cập nhật đơn' : 'Lưu đơn hoa'}</Button>
          </div>
        </SoftCard>

        <SoftCard className="span-7" title="Đơn cần giao hôm nay" description="Các đơn chưa hoàn tất và có lịch giao hôm nay.">
          <OrderList orders={todayDeliveries} onEdit={editOrder} onStatusChange={handleStatusChange} compact />
        </SoftCard>

        <SoftCard className="span-12" title="Tất cả đơn đang mở" description={`${openOrders.length} đơn chưa hoàn tất`}>
          <OrderList orders={orders} onEdit={editOrder} onStatusChange={handleStatusChange} />
        </SoftCard>
      </div>
    </>
  );
}

function OrderList({ orders, onEdit, onStatusChange, compact = false }: { orders: FlowerOrderRecord[]; onEdit: (order: FlowerOrderRecord) => void; onStatusChange: (id: string, status: FlowerOrderStatus) => void; compact?: boolean }) {
  if (orders.length === 0) return <p className="setup-muted">Chưa có đơn.</p>;
  return <div className={compact ? 'order-list order-list-compact' : 'order-list'}>{orders.map((order) => <div className="order-row" key={order.id}><div><strong>{order.order_code}</strong><span>{order.recipient_name ?? order.customer_name ?? 'Khách'} • {order.delivery_at ?? 'Chưa lịch giao'}</span><span>{order.color_tone ?? 'Chưa tone'} • {order.budget_amount ? formatCurrency(order.budget_amount) : 'Chưa ngân sách'}</span></div><SelectField label="Trạng thái" value={order.status} options={statusOptions} onChange={(event) => onStatusChange(order.id, event.target.value as FlowerOrderStatus)} /><Button variant="ghost" onClick={() => onEdit(order)}>Sửa</Button></div>)}</div>;
}
