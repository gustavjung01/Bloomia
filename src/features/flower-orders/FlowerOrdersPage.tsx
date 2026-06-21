import { useEffect, useMemo, useState } from 'react';

import { Badge, Button, Dialog, EmptyState, SelectField, SoftCard, TextArea, TextField } from '../../components/ui';
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

type FlowerOrderDialog = 'form' | 'today' | null;

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
  const [activeDialog, setActiveDialog] = useState<FlowerOrderDialog>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { void refreshOrders(); }, []);

  const openOrders = useMemo(() => orders.filter((order) => !['completed', 'cancelled'].includes(order.status)), [orders]);
  const preparingCount = useMemo(() => openOrders.filter((order) => ['confirmed', 'preparing'].includes(order.status)).length, [openOrders]);
  const readyCount = useMemo(() => openOrders.filter((order) => ['ready', 'delivering'].includes(order.status)).length, [openOrders]);

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

  function openCreateDialog() {
    setEditingId(undefined);
    setForm(emptyForm);
    setError('');
    setActiveDialog('form');
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
      setActiveDialog(null);
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
    setActiveDialog('form');
  }

  return (
    <>
      <div className="page-title-row">
        <div><span className="eyebrow">Đơn hoa</span><h2>Đơn đặt trước & giao hoa</h2></div>
        <Button onClick={openCreateDialog}>Tạo đơn hoa</Button>
      </div>

      {(status || error) && <div className="setup-status-row">{status && <Badge tone="sage">{status}</Badge>}{error && <Badge tone="peach">{error}</Badge>}</div>}

      <div className="flower-order-summary-grid">
        <FlowerOrderSummaryCard label="Đơn đang mở" value={String(openOrders.length)} detail="Chưa hoàn thành hoặc hủy" />
        <FlowerOrderSummaryCard label="Giao hôm nay" value={String(todayDeliveries.length)} detail="Có lịch giao trong ngày" />
        <FlowerOrderSummaryCard label="Đang chuẩn bị" value={String(preparingCount)} detail="Đã xác nhận hoặc đang cắm" />
        <FlowerOrderSummaryCard label="Sẵn sàng giao" value={String(readyCount)} detail="Đã xong hoặc đang giao" />
      </div>

      <div className="flower-order-action-grid">
        <button className="flower-order-action-card" type="button" onClick={openCreateDialog}>
          <span>Tạo mới</span>
          <strong>Nhập thông tin đơn trong popup rộng</strong>
          <p>Khách hàng, người nhận, lịch giao, ngân sách, tone màu và lời nhắn được gom vào một biểu mẫu rõ ràng.</p>
          <b>Mở biểu mẫu →</b>
        </button>
        <button className="flower-order-action-card" type="button" onClick={() => setActiveDialog('today')}>
          <span>{todayDeliveries.length} đơn hôm nay</span>
          <strong>Danh sách cần giao hôm nay</strong>
          <p>Xem tập trung các đơn có lịch giao trong ngày và cập nhật trạng thái ngay trong popup.</p>
          <b>Xem lịch giao →</b>
        </button>
      </div>

      <SoftCard className="flower-order-list-card" title="Tất cả đơn đang mở" description={`${openOrders.length} đơn chưa hoàn tất`}>
        <OrderList orders={openOrders} onEdit={editOrder} onStatusChange={handleStatusChange} />
      </SoftCard>

      <Dialog open={activeDialog === 'form'} title={editingId ? 'Sửa đơn hoa' : 'Tạo đơn hoa'} className="flower-order-form-dialog" onClose={() => setActiveDialog(null)}>
        <div className="flower-order-form-grid">
          <TextField label="Khách hàng" value={form.customerName} onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} />
          <TextField label="SĐT khách" value={form.customerPhone} onChange={(event) => setForm((current) => ({ ...current, customerPhone: event.target.value }))} />
          <TextField label="Người nhận" value={form.recipientName} onChange={(event) => setForm((current) => ({ ...current, recipientName: event.target.value }))} />
          <TextField label="SĐT người nhận" value={form.recipientPhone} onChange={(event) => setForm((current) => ({ ...current, recipientPhone: event.target.value }))} />
          <TextField label="Giờ giao" type="datetime-local" value={form.deliveryAt} onChange={(event) => setForm((current) => ({ ...current, deliveryAt: event.target.value }))} />
          <TextField label="Địa chỉ giao" value={form.deliveryAddress} onChange={(event) => setForm((current) => ({ ...current, deliveryAddress: event.target.value }))} />
          <TextField label="Dịp tặng" value={form.occasion} onChange={(event) => setForm((current) => ({ ...current, occasion: event.target.value }))} />
          <TextField label="Tone màu" value={form.colorTone} onChange={(event) => setForm((current) => ({ ...current, colorTone: event.target.value }))} />
          <TextField label="Ngân sách" type="number" min={0} value={form.budgetAmount} onChange={(event) => setForm((current) => ({ ...current, budgetAmount: event.target.value }))} />
          <div className="flower-order-field-wide"><TextArea label="Lời nhắn thiệp" value={form.cardMessage} onChange={(event) => setForm((current) => ({ ...current, cardMessage: event.target.value }))} rows={3} /></div>
          <div className="flower-order-field-wide"><TextArea label="Ghi chú nội bộ" value={form.internalNote} onChange={(event) => setForm((current) => ({ ...current, internalNote: event.target.value }))} rows={3} /></div>
          <div className="flower-order-field-wide"><Button onClick={handleSaveOrder}>{editingId ? 'Cập nhật đơn' : 'Lưu đơn hoa'}</Button></div>
        </div>
      </Dialog>

      <Dialog open={activeDialog === 'today'} title="Đơn cần giao hôm nay" className="flower-order-today-dialog" onClose={() => setActiveDialog(null)}>
        <OrderList orders={todayDeliveries} onEdit={editOrder} onStatusChange={handleStatusChange} />
      </Dialog>
    </>
  );
}

function FlowerOrderSummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="flower-order-summary-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function OrderList({ orders, onEdit, onStatusChange }: { orders: FlowerOrderRecord[]; onEdit: (order: FlowerOrderRecord) => void; onStatusChange: (id: string, status: FlowerOrderStatus) => void }) {
  if (orders.length === 0) return <EmptyState title="Chưa có đơn" description="Tạo đơn hoa mới để bắt đầu theo dõi lịch giao." />;
  return <div className="order-list flower-order-list">{orders.map((order) => <div className="order-row" key={order.id}><div><strong>{order.order_code}</strong><span>{order.recipient_name ?? order.customer_name ?? 'Khách'} • {order.delivery_at ?? 'Chưa lịch giao'}</span><span>{order.color_tone ?? 'Chưa tone'} • {order.budget_amount ? formatCurrency(order.budget_amount) : 'Chưa ngân sách'}</span></div><SelectField label="Trạng thái" value={order.status} options={statusOptions} onChange={(event) => onStatusChange(order.id, event.target.value as FlowerOrderStatus)} /><Button variant="ghost" onClick={() => onEdit(order)}>Sửa</Button></div>)}</div>;
}
