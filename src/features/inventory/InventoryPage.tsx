import { useEffect, useMemo, useState } from 'react';

import { Badge, Button, SelectField, SoftCard, TextField } from '../../components/ui';
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

const stockOutOptions = [
  { label: 'Hao hụt', value: 'waste' },
  { label: 'Mẫu trưng bày', value: 'sample' },
  { label: 'Sự kiện', value: 'event' },
  { label: 'Nội bộ', value: 'internal' },
];

export function InventoryPage() {
  const [overview, setOverview] = useState<InventoryOverviewRecord[]>([]);
  const [batches, setBatches] = useState<PurchaseBatchRecord[]>([]);
  const [movements, setMovements] = useState<StockMovementRecord[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [movementType, setMovementType] = useState<StockOutType>('waste');
  const [quantity, setQuantity] = useState('1');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('0');
  const [adjustmentCost, setAdjustmentCost] = useState('0');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { void refreshInventory(); }, []);

  const itemOptions = useMemo(
    () => [{ label: 'Chọn hàng', value: '' }, ...overview.map((item) => ({ label: item.item_name, value: item.item_id }))],
    [overview],
  );

  async function refreshInventory() {
    try {
      setError('');
      const [overviewRows, batchRows, movementRows] = await Promise.all([listInventoryOverview(), listPurchaseBatches(), listStockMovements()]);
      setOverview(overviewRows);
      setBatches(batchRows.slice(0, 20));
      setMovements(movementRows.slice(0, 20));
    } catch (caught) {
      console.error(caught);
      setError('Không tải được tồn kho. Cần chạy trong Tauri runtime.');
    }
  }

  async function handleStockOut() {
    if (!selectedItemId) { setError('Chọn hàng cần xuất kho.'); return; }
    try {
      setStatus('Đang ghi nhận...');
      setError('');
      await createStockOut({ itemId: selectedItemId, quantity: Number(quantity), movementType, reason: movementType });
      setStatus('Đã ghi nhận xuất kho theo FIFO.');
      await refreshInventory();
    } catch (caught) {
      console.error(caught);
      setStatus('');
      setError('Không ghi nhận được. Kiểm tra tồn kho còn đủ hay không.');
    }
  }

  async function handleAdjustment() {
    if (!selectedItemId) { setError('Chọn hàng cần điều chỉnh.'); return; }
    try {
      setStatus('Đang điều chỉnh...');
      setError('');
      await createAdjustment({ itemId: selectedItemId, quantityDelta: Number(adjustmentQuantity), unitCost: Number(adjustmentCost), reason: 'Điều chỉnh thủ công' });
      setStatus('Đã ghi nhận điều chỉnh kho.');
      await refreshInventory();
    } catch (caught) {
      console.error(caught);
      setStatus('');
      setError('Không điều chỉnh được.');
    }
  }

  return (
    <>
      <div className="page-title-row">
        <div><span className="eyebrow">Kho</span><h2>Tồn kho & lô nhập</h2></div>
        <Button variant="soft" onClick={refreshInventory}>Làm mới</Button>
      </div>

      {(status || error) && <div className="setup-status-row">{status && <Badge tone="sage">{status}</Badge>}{error && <Badge tone="peach">{error}</Badge>}</div>}

      <div className="page-grid">
        <SoftCard className="span-12" title="Tồn kho hiện tại" description="Tổng tồn tính từ các lô còn lại.">
          <div className="inventory-overview-grid">
            {overview.map((item) => <article className="inventory-overview-card" key={item.item_id}>
              <Badge tone={item.total_quantity > 0 ? 'sage' : 'peach'}>{item.total_quantity > 0 ? 'Đang còn' : 'Hết hàng'}</Badge>
              <h3>{item.item_name}</h3>
              <strong>{item.total_quantity} {item.unit_symbol ?? ''}</strong>
              <span>Giá nhập gần nhất: {item.latest_unit_cost === null ? '—' : formatCurrency(item.latest_unit_cost)}</span>
              <span>Dự kiến héo gần nhất: {item.nearest_expiry_date ?? '—'}</span>
            </article>)}
          </div>
        </SoftCard>

        <SoftCard className="span-5" title="Ghi nhận xuất kho" description="Dùng FIFO để trừ lô cũ trước.">
          <div className="setup-form-grid">
            <SelectField label="Hàng" value={selectedItemId} options={itemOptions} onChange={(event) => setSelectedItemId(event.target.value)} />
            <SelectField label="Loại" value={movementType} options={stockOutOptions} onChange={(event) => setMovementType(event.target.value as StockOutType)} />
            <TextField label="Số lượng" type="number" min={0.01} step={0.01} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            <Button onClick={handleStockOut}>Ghi nhận</Button>
          </div>
        </SoftCard>

        <SoftCard className="span-7" title="Điều chỉnh kho" description="Số dương tăng tồn, số âm giảm tồn theo FIFO.">
          <div className="page-grid">
            <div className="span-4"><SelectField label="Hàng" value={selectedItemId} options={itemOptions} onChange={(event) => setSelectedItemId(event.target.value)} /></div>
            <div className="span-4"><TextField label="SL điều chỉnh" type="number" step={0.01} value={adjustmentQuantity} onChange={(event) => setAdjustmentQuantity(event.target.value)} /></div>
            <div className="span-4"><TextField label="Giá vốn nếu tăng" type="number" min={0} value={adjustmentCost} onChange={(event) => setAdjustmentCost(event.target.value)} /></div>
          </div>
          <div style={{ marginTop: 16 }}><Button variant="soft" onClick={handleAdjustment}>Ghi nhận điều chỉnh</Button></div>
        </SoftCard>

        <InventoryTable title="Lô còn tồn" batches={batches.filter((batch) => batch.remaining_quantity > 0)} />
        <MovementTable movements={movements} />
      </div>
    </>
  );
}

function InventoryTable({ title, batches }: { title: string; batches: PurchaseBatchRecord[] }) {
  return <SoftCard className="span-12" title={title}><div className="inventory-table"><div className="inventory-table-head"><span>Hàng</span><span>NCC</span><span>Ngày nhập</span><span>Dự kiến héo</span><span>Còn lại</span><span>Giá nhập</span></div>{batches.map((batch) => <div className="inventory-table-row" key={batch.id}><strong>{batch.item_name}</strong><span>{batch.supplier_name ?? '—'}</span><span>{batch.purchase_date}</span><span>{batch.expiry_date ?? '—'}</span><span>{batch.remaining_quantity}</span><span>{formatCurrency(batch.unit_cost)}</span></div>)}</div></SoftCard>;
}

function MovementTable({ movements }: { movements: StockMovementRecord[] }) {
  return <SoftCard className="span-12" title="Lịch sử nhập/xuất"><div className="inventory-table"><div className="inventory-table-head inventory-table-head-movement"><span>Hàng</span><span>Loại</span><span>Nhập</span><span>Xuất</span><span>Giá vốn</span><span>Lý do</span></div>{movements.map((movement) => <div className="inventory-table-row inventory-table-row-movement" key={movement.id}><strong>{movement.item_name}</strong><span>{movement.movement_type}</span><span>{movement.quantity_in}</span><span>{movement.quantity_out}</span><span>{formatCurrency(movement.unit_cost)}</span><span>{movement.reason ?? '—'}</span></div>)}</div></SoftCard>;
}
