import { useEffect, useMemo, useState } from 'react';

import { Badge, Button, Dialog, EmptyState, SelectField, SoftCard, TextField } from '../../components/ui';
import {
  createAdjustment,
  createStockOut,
  listInventoryOverview,
  listPurchaseBatches,
  listStockMovements,
  type InventoryOverviewRecord,
  type PurchaseBatchRecord,
  type StockMovementRecord,
} from '../../db/repositories/inventoryRepository';
import { formatCurrency } from '../../utils/format';

type StockOutType = 'waste' | 'sample' | 'event' | 'internal';
type InventoryDialog = 'stock-out' | 'adjustment' | 'batches' | 'movements' | null;

const stockOutOptions = [
  { label: 'Hao hụt / hư hỏng', value: 'waste' },
  { label: 'Mẫu trưng bày', value: 'sample' },
  { label: 'Dùng cho sự kiện', value: 'event' },
  { label: 'Sử dụng nội bộ', value: 'internal' },
];

const movementLabels: Record<string, string> = {
  purchase: 'Nhập hàng',
  sale: 'Bán hàng',
  waste: 'Hao hụt',
  sample: 'Mẫu trưng bày',
  event: 'Sự kiện',
  internal: 'Nội bộ',
  adjustment: 'Điều chỉnh',
  refund: 'Hoàn kho',
};

export function InventoryPage() {
  const [overview, setOverview] = useState<InventoryOverviewRecord[]>([]);
  const [batches, setBatches] = useState<PurchaseBatchRecord[]>([]);
  const [movements, setMovements] = useState<StockMovementRecord[]>([]);
  const [activeDialog, setActiveDialog] = useState<InventoryDialog>(null);
  const [stockOutItemId, setStockOutItemId] = useState('');
  const [movementType, setMovementType] = useState<StockOutType>('waste');
  const [quantity, setQuantity] = useState('1');
  const [adjustmentItemId, setAdjustmentItemId] = useState('');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('0');
  const [adjustmentCost, setAdjustmentCost] = useState('0');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { void refreshInventory(); }, []);

  const itemOptions = useMemo(
    () => [{ label: 'Chọn hàng', value: '' }, ...overview.map((item) => ({ label: item.item_name, value: item.item_id }))],
    [overview],
  );

  const activeBatches = useMemo(() => batches.filter((batch) => batch.remaining_quantity > 0), [batches]);
  const outOfStockCount = useMemo(() => overview.filter((item) => item.total_quantity <= 0).length, [overview]);
  const expiringBatchCount = useMemo(() => activeBatches.filter((batch) => isExpiringSoon(batch.expiry_date)).length, [activeBatches]);

  async function refreshInventory() {
    try {
      setError('');
      const [overviewRows, batchRows, movementRows] = await Promise.all([listInventoryOverview(), listPurchaseBatches(), listStockMovements()]);
      setOverview(overviewRows);
      setBatches(batchRows.slice(0, 80));
      setMovements(movementRows.slice(0, 80));
    } catch (caught) {
      console.error(caught);
      setError('Không tải được tồn kho. Cần chạy trong Tauri runtime.');
    }
  }

  function openDialog(dialog: InventoryDialog) {
    setStatus('');
    setError('');
    setActiveDialog(dialog);
  }

  async function handleStockOut() {
    if (!stockOutItemId) { setError('Chọn hàng cần xuất kho.'); return; }
    if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) { setError('Số lượng xuất phải lớn hơn 0.'); return; }
    try {
      setStatus('Đang ghi nhận...');
      setError('');
      await createStockOut({ itemId: stockOutItemId, quantity: Number(quantity), movementType, reason: movementType });
      setStatus('Đã ghi nhận xuất kho theo FIFO.');
      setQuantity('1');
      setActiveDialog(null);
      await refreshInventory();
    } catch (caught) {
      console.error(caught);
      setStatus('');
      setError('Không ghi nhận được. Kiểm tra số lượng tồn hiện tại.');
    }
  }

  async function handleAdjustment() {
    if (!adjustmentItemId) { setError('Chọn hàng cần điều chỉnh.'); return; }
    if (!Number.isFinite(Number(adjustmentQuantity)) || Number(adjustmentQuantity) === 0) { setError('Số lượng điều chỉnh phải khác 0.'); return; }
    try {
      setStatus('Đang điều chỉnh...');
      setError('');
      await createAdjustment({ itemId: adjustmentItemId, quantityDelta: Number(adjustmentQuantity), unitCost: Number(adjustmentCost), reason: 'Điều chỉnh sau kiểm kê' });
      setStatus('Đã ghi nhận điều chỉnh kho.');
      setAdjustmentQuantity('0');
      setAdjustmentCost('0');
      setActiveDialog(null);
      await refreshInventory();
    } catch (caught) {
      console.error(caught);
      setStatus('');
      setError('Không điều chỉnh được. Kiểm tra số lượng và giá vốn.');
    }
  }

  return (
    <>
      <div className="page-title-row">
        <div><span className="eyebrow">Kho</span><h2>Tồn kho dễ hiểu, thao tác đúng mục đích</h2></div>
        <Button variant="soft" onClick={refreshInventory}>Làm mới</Button>
      </div>

      {(status || error) && <div className="setup-status-row">{status && <Badge tone="sage">{status}</Badge>}{error && <Badge tone="peach">{error}</Badge>}</div>}

      <div className="inventory-summary-grid">
        <SummaryCard label="Mặt hàng theo dõi" value={String(overview.length)} detail="Hoa và phụ liệu có quản lý tồn" />
        <SummaryCard label="Đang hết hàng" value={String(outOfStockCount)} detail="Cần cân nhắc nhập thêm" tone={outOfStockCount > 0 ? 'peach' : 'sage'} />
        <SummaryCard label="Lô còn tồn" value={String(activeBatches.length)} detail="Các lô vẫn còn số lượng" />
        <SummaryCard label="Lô sắp héo" value={String(expiringBatchCount)} detail="Trong hôm nay hoặc 3 ngày tới" tone={expiringBatchCount > 0 ? 'peach' : 'sage'} />
      </div>

      <SoftCard className="inventory-stock-card" title="Tồn kho hiện tại" description="Mỗi dòng là một mặt hàng. Tồn được cộng từ nhập hàng, bán hàng, hao hụt và điều chỉnh.">
        {overview.length === 0 ? (
          <EmptyState title="Chưa có dữ liệu tồn kho" description="Hãy tạo mặt hàng có theo dõi tồn và nhập lô đầu tiên." />
        ) : (
          <div className="inventory-stock-table">
            <div className="inventory-stock-head"><span>Hàng</span><span>Trạng thái</span><span>Tồn hiện tại</span><span>Lô còn</span><span>Giá nhập gần nhất</span><span>Héo gần nhất</span></div>
            {overview.map((item) => (
              <div className="inventory-stock-row" key={item.item_id}>
                <strong>{item.item_name}</strong>
                <Badge tone={item.total_quantity > 0 ? 'sage' : 'peach'}>{item.total_quantity > 0 ? 'Đang còn' : 'Hết hàng'}</Badge>
                <span className="inventory-stock-quantity">{item.total_quantity} {item.unit_symbol ?? ''}</span>
                <span>{item.batch_count}</span>
                <span>{item.latest_unit_cost === null ? '—' : formatCurrency(item.latest_unit_cost)}</span>
                <span>{item.nearest_expiry_date ?? '—'}</span>
              </div>
            ))}
          </div>
        )}
      </SoftCard>

      <div className="inventory-action-grid">
        <InventoryActionCard
          eyebrow="Ngoài bán hàng"
          title="Ghi nhận hao hụt / sử dụng"
          description="Dùng khi hoa hỏng, làm mẫu, đi sự kiện hoặc dùng nội bộ. Hệ thống trừ lô cũ trước theo FIFO."
          action="Mở phiếu xuất"
          onClick={() => openDialog('stock-out')}
        />
        <InventoryActionCard
          eyebrow="Sau kiểm kê"
          title="Điều chỉnh số tồn"
          description="Chỉ dùng khi số đếm thực tế khác hệ thống. Số dương tăng tồn, số âm giảm tồn."
          action="Mở điều chỉnh"
          onClick={() => openDialog('adjustment')}
        />
        <InventoryActionCard
          eyebrow={`${activeBatches.length} lô`}
          title="Chi tiết các lô còn tồn"
          description="Xem nhà cung cấp, ngày nhập, hạn héo, số còn lại và giá nhập của từng lô."
          action="Xem danh sách"
          onClick={() => openDialog('batches')}
        />
        <InventoryActionCard
          eyebrow={`${movements.length} bản ghi gần nhất`}
          title="Lịch sử nhập / xuất"
          description="Kiểm tra mọi biến động kho: nhập hàng, bán, hao hụt, hoàn kho và điều chỉnh."
          action="Xem nhật ký"
          onClick={() => openDialog('movements')}
        />
      </div>

      <Dialog open={activeDialog === 'stock-out'} title="Ghi nhận xuất kho ngoài bán hàng" onClose={() => setActiveDialog(null)}>
        <div className="inventory-dialog-note">
          <strong>Khi nào dùng?</strong>
          <span>Hoa hỏng, cắm mẫu, dùng cho sự kiện hoặc sử dụng nội bộ. Đơn bán hàng phải thực hiện tại POS, không ghi lại ở đây.</span>
        </div>
        <div className="setup-form-grid">
          <SelectField label="Hàng cần xuất" value={stockOutItemId} options={itemOptions} onChange={(event) => setStockOutItemId(event.target.value)} />
          <SelectField label="Lý do xuất" value={movementType} options={stockOutOptions} onChange={(event) => setMovementType(event.target.value as StockOutType)} />
          <TextField label="Số lượng" type="number" min={0.01} step={0.01} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          <Button onClick={handleStockOut}>Ghi nhận xuất kho</Button>
        </div>
      </Dialog>

      <Dialog open={activeDialog === 'adjustment'} title="Điều chỉnh kho sau kiểm kê" onClose={() => setActiveDialog(null)}>
        <div className="inventory-dialog-note">
          <strong>Cách nhập số lượng</strong>
          <span>Ví dụ hệ thống có 10 nhưng thực tế có 8: nhập -2. Thực tế có 12: nhập +2. Khi tăng tồn, nhập thêm giá vốn.</span>
        </div>
        <div className="setup-form-grid">
          <SelectField label="Hàng cần điều chỉnh" value={adjustmentItemId} options={itemOptions} onChange={(event) => setAdjustmentItemId(event.target.value)} />
          <TextField label="Chênh lệch số lượng" type="number" step={0.01} value={adjustmentQuantity} onChange={(event) => setAdjustmentQuantity(event.target.value)} />
          <TextField label="Giá vốn nếu tăng tồn" type="number" min={0} value={adjustmentCost} onChange={(event) => setAdjustmentCost(event.target.value)} />
          <Button variant="soft" onClick={handleAdjustment}>Ghi nhận điều chỉnh</Button>
        </div>
      </Dialog>

      <Dialog open={activeDialog === 'batches'} title="Các lô còn tồn" className="inventory-detail-dialog" onClose={() => setActiveDialog(null)}>
        <BatchTable batches={activeBatches} />
      </Dialog>

      <Dialog open={activeDialog === 'movements'} title="Lịch sử nhập / xuất kho" className="inventory-detail-dialog" onClose={() => setActiveDialog(null)}>
        <MovementTable movements={movements} />
      </Dialog>
    </>
  );
}

function SummaryCard({ label, value, detail, tone = 'pink' }: { label: string; value: string; detail: string; tone?: 'pink' | 'sage' | 'peach' }) {
  return <article className={`inventory-summary-card inventory-summary-card-${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function InventoryActionCard({ eyebrow, title, description, action, onClick }: { eyebrow: string; title: string; description: string; action: string; onClick: () => void }) {
  return <button className="inventory-action-card" type="button" onClick={onClick}><span className="inventory-action-eyebrow">{eyebrow}</span><strong>{title}</strong><p>{description}</p><span className="inventory-action-link">{action} →</span></button>;
}

function BatchTable({ batches }: { batches: PurchaseBatchRecord[] }) {
  if (batches.length === 0) return <EmptyState title="Không có lô còn tồn" description="Các lô đã hết hoặc chưa nhập hàng." />;
  return <div className="inventory-detail-table inventory-detail-table-batches"><div className="inventory-detail-head"><span>Hàng</span><span>NCC</span><span>Ngày nhập</span><span>Dự kiến héo</span><span>Còn lại</span><span>Giá nhập</span></div>{batches.map((batch) => <div className="inventory-detail-row" key={batch.id}><strong>{batch.item_name}</strong><span>{batch.supplier_name ?? '—'}</span><span>{batch.purchase_date}</span><span>{batch.expiry_date ?? '—'}</span><span>{batch.remaining_quantity}</span><span>{formatCurrency(batch.unit_cost)}</span></div>)}</div>;
}

function MovementTable({ movements }: { movements: StockMovementRecord[] }) {
  if (movements.length === 0) return <EmptyState title="Chưa có biến động kho" description="Nhập hàng hoặc bán hàng sẽ tạo nhật ký tại đây." />;
  return <div className="inventory-detail-table inventory-detail-table-movements"><div className="inventory-detail-head"><span>Thời gian</span><span>Hàng</span><span>Loại</span><span>Nhập</span><span>Xuất</span><span>Lý do</span></div>{movements.map((movement) => <div className="inventory-detail-row" key={movement.id}><span>{movement.created_at}</span><strong>{movement.item_name}</strong><span>{movementLabels[movement.movement_type] ?? movement.movement_type}</span><span>{movement.quantity_in || '—'}</span><span>{movement.quantity_out || '—'}</span><span>{movement.reason ?? '—'}</span></div>)}</div>;
}

function isExpiringSoon(value: string | null) {
  if (!value) return false;
  const expiry = new Date(`${value}T00:00:00`);
  if (Number.isNaN(expiry.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.floor((expiry.getTime() - today.getTime()) / 86400000);
  return days >= 0 && days <= 3;
}
