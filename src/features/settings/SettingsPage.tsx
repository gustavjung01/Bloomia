import { useEffect, useMemo, useState } from 'react';

import { Badge, Button, PillTabs, SelectField, SoftCard, TextArea, TextField } from '../../components/ui';
import type { ItemType } from '../../db';
import {
  archiveCategory,
  archiveItem,
  archiveSupplier,
  archiveUnit,
  getShopSettings,
  listCategories,
  listItems,
  listSuppliers,
  listUnits,
  saveCategory,
  saveItem,
  saveShopSettings,
  saveSupplier,
  saveUnit,
  type CategoryRecord,
  type ItemRecord,
  type ShopSettingsRecord,
  type SupplierRecord,
  type UnitRecord,
} from '../../db/repositories/manualSetupRepository';
import { formatCurrency } from '../../utils/format';
import { DevicePaymentSettingsPanel } from './DevicePaymentSettingsPanel';
import { ItemPhotoPanel } from './ItemPhotoPanel';

type SettingsTab = 'shop' | 'catalog' | 'items' | 'devices';
type CatalogKind = 'category' | 'unit' | 'supplier';
type ItemFilter = ItemType | 'all';

interface CategoryFormState { id?: string; name: string; sortOrder: number; }
interface UnitFormState { id?: string; name: string; symbol: string; }
interface SupplierFormState { id?: string; name: string; phone: string; address: string; note: string; }
interface ItemFormState { id?: string; name: string; sku: string; itemType: ItemType; categoryId: string; unitId: string; defaultSalePrice: string; defaultPurchasePrice: string; isStockTracked: boolean; note: string; }

const emptyCategoryForm: CategoryFormState = { name: '', sortOrder: 0 };
const emptyUnitForm: UnitFormState = { name: '', symbol: '' };
const emptySupplierForm: SupplierFormState = { name: '', phone: '', address: '', note: '' };
const emptyItemForm: ItemFormState = { name: '', sku: '', itemType: 'flower', categoryId: '', unitId: '', defaultSalePrice: '0', defaultPurchasePrice: '0', isStockTracked: true, note: '' };

const itemTypeLabels: Record<ItemType, string> = {
  flower: 'Hoa tươi',
  material: 'Nguyên liệu / phụ liệu',
  service: 'Dịch vụ',
  product: 'Sản phẩm mẫu',
};

const itemFilterOptions: { label: string; value: ItemFilter }[] = [
  { label: 'Tất cả', value: 'all' },
  { label: itemTypeLabels.flower, value: 'flower' },
  { label: itemTypeLabels.material, value: 'material' },
  { label: itemTypeLabels.service, value: 'service' },
  { label: itemTypeLabels.product, value: 'product' },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('shop');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [shop, setShop] = useState<ShopSettingsRecord | null>(null);
  const [shopForm, setShopForm] = useState({ name: '', phone: '', address: '', logoPath: '', invoiceFooter: '' });
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [unitForm, setUnitForm] = useState<UnitFormState>(emptyUnitForm);
  const [supplierForm, setSupplierForm] = useState<SupplierFormState>(emptySupplierForm);
  const [itemForm, setItemForm] = useState<ItemFormState>(emptyItemForm);
  const [itemFilter, setItemFilter] = useState<ItemFilter>('all');

  async function refreshManualSetupData() {
    try {
      setError('');
      const [shopRecord, categoryRows, unitRows, supplierRows, itemRows] = await Promise.all([getShopSettings(), listCategories(), listUnits(), listSuppliers(), listItems()]);
      setShop(shopRecord);
      setShopForm({ name: shopRecord?.name ?? '', phone: shopRecord?.phone ?? '', address: shopRecord?.address ?? '', logoPath: shopRecord?.logo_path ?? '', invoiceFooter: shopRecord?.invoice_footer ?? '' });
      setCategories(categoryRows);
      setUnits(unitRows);
      setSuppliers(supplierRows);
      setItems(itemRows);
    } catch (caught) {
      console.error(caught);
      setError('Không tải được dữ liệu cài đặt. Nếu đang chạy bằng browser Vite, hãy dùng npm run tauri:dev để SQLite hoạt động.');
    }
  }

  useEffect(() => { void refreshManualSetupData(); }, []);

  const categoryOptions = useMemo(() => [{ label: 'Không chọn', value: '' }, ...categories.map((category) => ({ label: category.name, value: category.id }))], [categories]);
  const unitOptions = useMemo(() => [{ label: 'Không chọn', value: '' }, ...units.map((unit) => ({ label: `${unit.name} (${unit.symbol})`, value: unit.id }))], [units]);
  const filteredItems = itemFilter === 'all' ? items : items.filter((item) => item.item_type === itemFilter);

  async function handleSaveShop() {
    if (!shopForm.name.trim()) { setError('Tên shop là bắt buộc.'); return; }
    await runAction('Đã lưu thông tin shop.', async () => { await saveShopSettings(shopForm); await refreshManualSetupData(); });
  }

  async function handleSaveCategory() {
    if (!categoryForm.name.trim()) { setError('Tên nhóm hàng là bắt buộc.'); return; }
    await runAction('Đã lưu nhóm hàng.', async () => { await saveCategory(categoryForm); setCategoryForm(emptyCategoryForm); await refreshManualSetupData(); });
  }

  async function handleSaveUnit() {
    if (!unitForm.name.trim() || !unitForm.symbol.trim()) { setError('Tên đơn vị tính và ký hiệu là bắt buộc.'); return; }
    await runAction('Đã lưu đơn vị tính.', async () => { await saveUnit(unitForm); setUnitForm(emptyUnitForm); await refreshManualSetupData(); });
  }

  async function handleSaveSupplier() {
    if (!supplierForm.name.trim()) { setError('Tên nhà cung cấp là bắt buộc.'); return; }
    await runAction('Đã lưu nhà cung cấp.', async () => { await saveSupplier(supplierForm); setSupplierForm(emptySupplierForm); await refreshManualSetupData(); });
  }

  async function handleSaveItem() {
    if (!itemForm.name.trim()) { setError('Tên hàng hóa/dịch vụ là bắt buộc.'); return; }
    const defaultSalePrice = Number(itemForm.defaultSalePrice);
    const defaultPurchasePrice = Number(itemForm.defaultPurchasePrice);
    if (Number.isNaN(defaultSalePrice) || defaultSalePrice < 0) { setError('Giá bán gợi ý phải là số không âm.'); return; }
    if (Number.isNaN(defaultPurchasePrice) || defaultPurchasePrice < 0) { setError('Giá nhập mặc định phải là số không âm.'); return; }
    await runAction('Đã lưu hàng hóa/dịch vụ.', async () => {
      await saveItem({ id: itemForm.id, name: itemForm.name, sku: itemForm.sku, itemType: itemForm.itemType, categoryId: itemForm.categoryId, unitId: itemForm.unitId, defaultSalePrice, defaultPurchasePrice, isStockTracked: itemForm.itemType === 'service' ? false : itemForm.isStockTracked, note: itemForm.note });
      setItemForm(emptyItemForm);
      await refreshManualSetupData();
    });
  }

  async function runAction(successMessage: string, action: () => Promise<void>) {
    try {
      setError('');
      setStatus('Đang lưu...');
      await action();
      setStatus(successMessage);
    } catch (caught) {
      console.error(caught);
      setStatus('');
      setError('Thao tác chưa thành công. Kiểm tra dữ liệu trùng tên hoặc kết nối SQLite.');
    }
  }

  async function handleArchive(kind: CatalogKind, id: string) {
    await runAction('Đã ẩn dữ liệu khỏi danh mục đang dùng.', async () => {
      if (kind === 'category') await archiveCategory(id);
      if (kind === 'unit') await archiveUnit(id);
      if (kind === 'supplier') await archiveSupplier(id);
      await refreshManualSetupData();
    });
  }

  async function handleArchiveItem(id: string) {
    await runAction('Đã ẩn hàng hóa/dịch vụ.', async () => { await archiveItem(id); await refreshManualSetupData(); });
  }

  return (
    <>
      <div className="page-title-row">
        <div><span className="eyebrow">Cài đặt</span><h2>Setup thủ công cho chủ tiệm</h2></div>
        <PillTabs value={activeTab} onChange={setActiveTab} options={[{ label: 'Thông tin shop', value: 'shop' }, { label: 'Danh mục nền', value: 'catalog' }, { label: 'Hàng hóa & dịch vụ', value: 'items' }, { label: 'Thiết bị & thanh toán', value: 'devices' }]} />
      </div>

      {(status || error) && <div className="setup-status-row">{status && <Badge tone="sage">{status}</Badge>}{error && <Badge tone="peach">{error}</Badge>}</div>}

      {activeTab === 'shop' && <ShopSettingsPanel shop={shop} shopForm={shopForm} setShopForm={setShopForm} onSave={handleSaveShop} />}
      {activeTab === 'catalog' && <CatalogSetupPanel categories={categories} units={units} suppliers={suppliers} categoryForm={categoryForm} unitForm={unitForm} supplierForm={supplierForm} setCategoryForm={setCategoryForm} setUnitForm={setUnitForm} setSupplierForm={setSupplierForm} onSaveCategory={handleSaveCategory} onSaveUnit={handleSaveUnit} onSaveSupplier={handleSaveSupplier} onArchive={handleArchive} />}
      {activeTab === 'items' && <><ItemSetupPanel itemForm={itemForm} setItemForm={setItemForm} items={filteredItems} itemFilter={itemFilter} setItemFilter={setItemFilter} categoryOptions={categoryOptions} unitOptions={unitOptions} onSaveItem={handleSaveItem} onArchiveItem={handleArchiveItem} /><div style={{ height: 20 }} /><div className="page-grid"><ItemPhotoPanel /></div></>}
      {activeTab === 'devices' && <DevicePaymentSettingsPanel />}
    </>
  );
}

interface ShopSettingsPanelProps {
  shop: ShopSettingsRecord | null;
  shopForm: { name: string; phone: string; address: string; logoPath: string; invoiceFooter: string };
  setShopForm: React.Dispatch<React.SetStateAction<{ name: string; phone: string; address: string; logoPath: string; invoiceFooter: string }>>;
  onSave: () => void;
}

function ShopSettingsPanel({ shop, shopForm, setShopForm, onSave }: ShopSettingsPanelProps) {
  return <div className="page-grid">
    <SoftCard className="span-7" title="Thông tin shop" description="Dùng cho hóa đơn, phiếu giao hàng và báo cáo.">
      <div className="setup-form-grid">
        <TextField label="Tên shop" value={shopForm.name} onChange={(event) => setShopForm((form) => ({ ...form, name: event.target.value }))} />
        <TextField label="Số điện thoại" value={shopForm.phone} onChange={(event) => setShopForm((form) => ({ ...form, phone: event.target.value }))} />
        <TextField label="Địa chỉ" value={shopForm.address} onChange={(event) => setShopForm((form) => ({ ...form, address: event.target.value }))} />
        <TextField label="Logo path local" value={shopForm.logoPath} placeholder="Tạm thời; sẽ thay bằng upload logo ở batch sau" onChange={(event) => setShopForm((form) => ({ ...form, logoPath: event.target.value }))} />
        <TextArea label="Footer hóa đơn" value={shopForm.invoiceFooter} onChange={(event) => setShopForm((form) => ({ ...form, invoiceFooter: event.target.value }))} />
        <Button onClick={onSave}>Lưu thông tin shop</Button>
      </div>
    </SoftCard>
    <SoftCard className="span-5" title="Preview hóa đơn" description="Thông tin này sẽ đi vào template in.">
      <div className="invoice-preview-card"><strong>{shopForm.name || shop?.name || 'Tên shop'}</strong><span>{shopForm.phone || 'SĐT shop'}</span><span>{shopForm.address || 'Địa chỉ shop'}</span><hr /><p>{shopForm.invoiceFooter || 'Cảm ơn quý khách đã ghé Bloomia.'}</p></div>
    </SoftCard>
  </div>;
}

interface CatalogSetupPanelProps {
  categories: CategoryRecord[]; units: UnitRecord[]; suppliers: SupplierRecord[]; categoryForm: CategoryFormState; unitForm: UnitFormState; supplierForm: SupplierFormState;
  setCategoryForm: React.Dispatch<React.SetStateAction<CategoryFormState>>; setUnitForm: React.Dispatch<React.SetStateAction<UnitFormState>>; setSupplierForm: React.Dispatch<React.SetStateAction<SupplierFormState>>;
  onSaveCategory: () => void; onSaveUnit: () => void; onSaveSupplier: () => void; onArchive: (kind: CatalogKind, id: string) => void;
}

function CatalogSetupPanel({ categories, units, suppliers, categoryForm, unitForm, supplierForm, setCategoryForm, setUnitForm, setSupplierForm, onSaveCategory, onSaveUnit, onSaveSupplier, onArchive }: CatalogSetupPanelProps) {
  return <div className="page-grid">
    <SoftCard className="span-4" title="Nhóm hàng" description="Hoa tươi, lá phụ, phụ liệu, dịch vụ...">
      <div className="setup-form-grid"><TextField label="Tên nhóm" value={categoryForm.name} onChange={(event) => setCategoryForm((form) => ({ ...form, name: event.target.value }))} /><TextField label="Thứ tự" type="number" value={categoryForm.sortOrder} onChange={(event) => setCategoryForm((form) => ({ ...form, sortOrder: Number(event.target.value) }))} /><Button onClick={onSaveCategory}>{categoryForm.id ? 'Cập nhật nhóm' : 'Thêm nhóm'}</Button></div>
      <CatalogList rows={categories.map((category) => ({ id: category.id, title: category.name, meta: `Thứ tự ${category.sort_order}` }))} onEdit={(id) => { const row = categories.find((category) => category.id === id); if (row) setCategoryForm({ id: row.id, name: row.name, sortOrder: row.sort_order }); }} onArchive={(id) => onArchive('category', id)} />
    </SoftCard>
    <SoftCard className="span-4" title="Đơn vị tính" description="Cành, bó, tờ, cái, lần, chuyến...">
      <div className="setup-form-grid"><TextField label="Tên đơn vị" value={unitForm.name} onChange={(event) => setUnitForm((form) => ({ ...form, name: event.target.value }))} /><TextField label="Ký hiệu" value={unitForm.symbol} onChange={(event) => setUnitForm((form) => ({ ...form, symbol: event.target.value }))} /><Button onClick={onSaveUnit}>{unitForm.id ? 'Cập nhật đơn vị' : 'Thêm đơn vị'}</Button></div>
      <CatalogList rows={units.map((unit) => ({ id: unit.id, title: unit.name, meta: unit.symbol }))} onEdit={(id) => { const row = units.find((unit) => unit.id === id); if (row) setUnitForm({ id: row.id, name: row.name, symbol: row.symbol }); }} onArchive={(id) => onArchive('unit', id)} />
    </SoftCard>
    <SoftCard className="span-4" title="Nhà cung cấp" description="Lưu đầu mối nhập hoa và phụ liệu.">
      <div className="setup-form-grid"><TextField label="Tên NCC" value={supplierForm.name} onChange={(event) => setSupplierForm((form) => ({ ...form, name: event.target.value }))} /><TextField label="SĐT" value={supplierForm.phone} onChange={(event) => setSupplierForm((form) => ({ ...form, phone: event.target.value }))} /><TextField label="Địa chỉ" value={supplierForm.address} onChange={(event) => setSupplierForm((form) => ({ ...form, address: event.target.value }))} /><TextArea label="Ghi chú" value={supplierForm.note} onChange={(event) => setSupplierForm((form) => ({ ...form, note: event.target.value }))} /><Button onClick={onSaveSupplier}>{supplierForm.id ? 'Cập nhật NCC' : 'Thêm NCC'}</Button></div>
      <CatalogList rows={suppliers.map((supplier) => ({ id: supplier.id, title: supplier.name, meta: supplier.phone ?? 'Chưa có SĐT' }))} onEdit={(id) => { const row = suppliers.find((supplier) => supplier.id === id); if (row) setSupplierForm({ id: row.id, name: row.name, phone: row.phone ?? '', address: row.address ?? '', note: row.note ?? '' }); }} onArchive={(id) => onArchive('supplier', id)} />
    </SoftCard>
  </div>;
}

interface CatalogListProps { rows: { id: string; title: string; meta: string }[]; onEdit: (id: string) => void; onArchive: (id: string) => void; }

function CatalogList({ rows, onEdit, onArchive }: CatalogListProps) {
  return <div className="setup-list">{rows.length === 0 && <p className="setup-muted">Chưa có dữ liệu.</p>}{rows.map((row) => <div className="setup-list-row" key={row.id}><div><strong>{row.title}</strong><span>{row.meta}</span></div><div className="setup-row-actions"><Button variant="ghost" onClick={() => onEdit(row.id)}>Sửa</Button><Button variant="soft" onClick={() => onArchive(row.id)}>Ẩn</Button></div></div>)}</div>;
}

interface ItemSetupPanelProps {
  itemForm: ItemFormState; setItemForm: React.Dispatch<React.SetStateAction<ItemFormState>>; items: ItemRecord[]; itemFilter: ItemFilter; setItemFilter: React.Dispatch<React.SetStateAction<ItemFilter>>;
  categoryOptions: { label: string; value: string }[]; unitOptions: { label: string; value: string }[]; onSaveItem: () => void; onArchiveItem: (id: string) => void;
}

function ItemSetupPanel({ itemForm, setItemForm, items, itemFilter, setItemFilter, categoryOptions, unitOptions, onSaveItem, onArchiveItem }: ItemSetupPanelProps) {
  return <div className="page-grid">
    <SoftCard className="span-5" title="Hàng hóa / dịch vụ" description="Giá nhập mặc định dùng để gợi ý vốn khi chưa có lô nhập.">
      <div className="setup-form-grid">
        <TextField label="Tên" value={itemForm.name} onChange={(event) => setItemForm((form) => ({ ...form, name: event.target.value }))} />
        <TextField label="SKU" value={itemForm.sku} onChange={(event) => setItemForm((form) => ({ ...form, sku: event.target.value }))} />
        <SelectField label="Loại" value={itemForm.itemType} options={Object.entries(itemTypeLabels).map(([value, label]) => ({ value, label }))} onChange={(event) => { const itemType = event.target.value as ItemType; setItemForm((form) => ({ ...form, itemType, isStockTracked: itemType === 'service' ? false : form.isStockTracked })); }} />
        <SelectField label="Nhóm hàng" value={itemForm.categoryId} options={categoryOptions} onChange={(event) => setItemForm((form) => ({ ...form, categoryId: event.target.value }))} />
        <SelectField label="Đơn vị tính" value={itemForm.unitId} options={unitOptions} onChange={(event) => setItemForm((form) => ({ ...form, unitId: event.target.value }))} />
        <TextField label="Giá nhập mặc định" type="number" min={0} value={itemForm.defaultPurchasePrice} onChange={(event) => setItemForm((form) => ({ ...form, defaultPurchasePrice: event.target.value }))} />
        <TextField label="Giá bán gợi ý" type="number" min={0} value={itemForm.defaultSalePrice} onChange={(event) => setItemForm((form) => ({ ...form, defaultSalePrice: event.target.value }))} />
        <label className="setup-checkbox"><input type="checkbox" checked={itemForm.itemType === 'service' ? false : itemForm.isStockTracked} disabled={itemForm.itemType === 'service'} onChange={(event) => setItemForm((form) => ({ ...form, isStockTracked: event.target.checked }))} />Theo dõi tồn kho</label>
        <TextArea label="Ghi chú" value={itemForm.note} onChange={(event) => setItemForm((form) => ({ ...form, note: event.target.value }))} />
        <Button onClick={onSaveItem}>{itemForm.id ? 'Cập nhật' : 'Thêm hàng hóa/dịch vụ'}</Button>
        {itemForm.id && <Button variant="ghost" onClick={() => setItemForm(emptyItemForm)}>Hủy sửa</Button>}
      </div>
    </SoftCard>
    <SoftCard className="span-7" title="Danh sách hàng hóa" description="Bấm sửa để cập nhật nhanh giá nhập, giá bán, nhóm hàng hoặc tồn kho.">
      <PillTabs value={itemFilter} onChange={(value) => setItemFilter(value)} options={itemFilterOptions} />
      <div className="setup-list setup-list-tall">{items.length === 0 && <p className="setup-muted">Chưa có hàng hóa/dịch vụ.</p>}{items.map((item) => <div className="setup-list-row" key={item.id}><div><strong>{item.name}</strong><span>{itemTypeLabels[item.item_type]} • {item.category_name ?? 'Chưa nhóm'} • {item.unit_symbol ?? 'Chưa đơn vị'} • Nhập {formatCurrency(item.default_purchase_price)} • Bán {formatCurrency(item.default_sale_price)}</span></div><div className="setup-row-actions"><Button variant="ghost" onClick={() => setItemForm({ id: item.id, name: item.name, sku: item.sku ?? '', itemType: item.item_type, categoryId: item.category_id ?? '', unitId: item.unit_id ?? '', defaultSalePrice: String(item.default_sale_price), defaultPurchasePrice: String(item.default_purchase_price), isStockTracked: Boolean(item.is_stock_tracked), note: item.note ?? '' })}>Sửa</Button><Button variant="soft" onClick={() => onArchiveItem(item.id)}>Ẩn</Button></div></div>)}</div>
    </SoftCard>
  </div>;
}
