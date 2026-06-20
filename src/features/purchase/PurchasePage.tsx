import { useEffect, useMemo, useState } from 'react';

import { Badge, Button, SelectField, SoftCard, TextArea, TextField } from '../../components/ui';
import { listItems, listSuppliers, type ItemRecord, type SupplierRecord } from '../../db/repositories/manualSetupRepository';
import { createPurchase, listPurchaseBatches, type PurchaseBatchRecord } from '../../db/repositories/inventoryRepository';
import { createLocalId } from '../../utils/id';
import { formatCurrency } from '../../utils/format';

interface PurchaseLineState {
  id: string;
  itemId: string;
  quantity: string;
  unitCost: string;
  expiryDate: string;
  note: string;
}

function emptyLine(): PurchaseLineState {
  return { id: createLocalId('purchase-line'), itemId: '', quantity: '1', unitCost: '0', expiryDate: '', note: '' };
}

export function PurchasePage() {
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [batches, setBatches] = useState<PurchaseBatchRecord[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<PurchaseLineState[]>([emptyLine()]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void refreshData();
  }, []);

  const itemOptions = useMemo(
    () => [
      { label: 'Chọn hoa/phụ liệu', value: '' },
      ...items.filter((item) => Boolean(item.is_stock_tracked)).map((item) => ({ label: `${item.name} • ${item.unit_symbol ?? 'đơn vị'}`, value: item.id })),
    ],
    [items],
  );

  const supplierOptions = useMemo(
    () => [{ label: 'Không chọn NCC', value: '' }, ...suppliers.map((supplier) => ({ label: supplier.name, value: supplier.id }))],
    [suppliers],
  );

  const purchaseTotal = useMemo(
    () => lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitCost || 0), 0),
    [lines],
  );

  async function refreshData() {
    try {
      setError('');
      const [itemRows, supplierRows, batchRows] = await Promise.all([listItems(), listSuppliers(), listPurchaseBatches()]);
      setItems(itemRows);
      setSuppliers(supplierRows);
      setBatches(batchRows.slice(0, 12));
    } catch (caught) {
      console.error(caught);
      setError('Không tải được dữ liệu nhập hàng. Cần chạy trong Tauri runtime để SQLite hoạt động.');
    }
  }

  function updateLine(id: string, patch: Partial<PurchaseLineState>) {
    setLines((current) => current.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  }

  function removeLine(id: string) {
    setLines((current) => (current.length === 1 ? current : current.filter((line) => line.id !== id)));
  }

  async function handleSavePurchase() {
    const validLines = lines.filter((line) => line.itemId && Number(line.quantity) > 0);
    if (validLines.length === 0) {
      setError('Phiếu nhập cần ít nhất một dòng hàng hợp lệ.');
      return;
    }

    try {
      setStatus('Đang lưu phiếu nhập...');
      setError('');
      await createPurchase({
        supplierId,
        purchaseDate,
        lines: validLines.map((line) => ({
          itemId: line.itemId,
          quantity: Number(line.quantity),
          unitCost: Number(line.unitCost),
          expiryDate: line.expiryDate,
          note: line.note,
        })),
      });
      setLines([emptyLine()]);
      setStatus('Đã lưu phiếu nhập và cập nhật tồn kho.');
      await refreshData();
    } catch (caught) {
      console.error(caught);
      setStatus('');
      setError('Không lưu được phiếu nhập. Kiểm tra số lượng và giá nhập.');
    }
  }

  return (
    <>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Nhập hàng</span>
          <h2>Nhập hoa theo lô</h2>
        </div>
        <Button onClick={() => setLines((current) => [...current, emptyLine()])}>Thêm dòng</Button>
      </div>

      {(status || error) && (
        <div className="setup-status-row">
          {status && <Badge tone="sage">{status}</Badge>}
          {error && <Badge tone="peach">{error}</Badge>}
        </div>
      )}

      <div className="page-grid">
        <SoftCard className="span-12" title="Phiếu nhập" description="Giá nhập lưu theo từng lô, không ghi đè giá bán gợi ý của item.">
          <div className="page-grid">
            <div className="span-4">
              <SelectField label="Nhà cung cấp" value={supplierId} options={supplierOptions} onChange={(event) => setSupplierId(event.target.value)} />
            </div>
            <div className="span-4">
              <TextField label="Ngày nhập" type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} />
            </div>
            <div className="span-4 purchase-total-pill">
              <span>Tổng tiền nhập</span>
              <strong>{formatCurrency(purchaseTotal)}</strong>
            </div>
          </div>

          <div className="purchase-line-list">
            {lines.map((line) => (
              <div className="purchase-line-row" key={line.id}>
                <SelectField label="Hàng" value={line.itemId} options={itemOptions} onChange={(event) => updateLine(line.id, { itemId: event.target.value })} />
                <TextField label="SL" type="number" min={0.01} step={0.01} value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} />
                <TextField label="Giá nhập" type="number" min={0} value={line.unitCost} onChange={(event) => updateLine(line.id, { unitCost: event.target.value })} />
                <TextField label="Dự kiến héo" type="date" value={line.expiryDate} onChange={(event) => updateLine(line.id, { expiryDate: event.target.value })} />
                <TextArea label="Ghi chú" value={line.note} onChange={(event) => updateLine(line.id, { note: event.target.value })} rows={2} />
                <Button variant="ghost" onClick={() => removeLine(line.id)}>Xóa</Button>
              </div>
            ))}
          </div>

          <Button onClick={handleSavePurchase}>Lưu phiếu nhập</Button>
        </SoftCard>

        <SoftCard className="span-12" title="Lô nhập gần đây" description="Theo dõi batch, tồn còn lại và giá nhập từng lần.">
          <div className="inventory-table">
            <div className="inventory-table-head">
              <span>Hàng</span><span>NCC</span><span>Ngày nhập</span><span>Dự kiến héo</span><span>Còn lại</span><span>Giá nhập</span>
            </div>
            {batches.map((batch) => (
              <div className="inventory-table-row" key={batch.id}>
                <strong>{batch.item_name}</strong>
                <span>{batch.supplier_name ?? '—'}</span>
                <span>{batch.purchase_date}</span>
                <span>{batch.expiry_date ?? '—'}</span>
                <span>{batch.remaining_quantity}</span>
                <span>{formatCurrency(batch.unit_cost)}</span>
              </div>
            ))}
          </div>
        </SoftCard>
      </div>
    </>
  );
}
