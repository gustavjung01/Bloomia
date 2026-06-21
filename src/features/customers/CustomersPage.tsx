import { useEffect, useMemo, useState } from 'react';

import { Badge, Button, Dialog, EmptyState, SoftCard, TextArea, TextField } from '../../components/ui';
import { listCustomers, saveCustomer, type CustomerRecord } from '../../db/repositories/customerRepository';
import { formatCurrency } from '../../utils/format';

interface CustomerFormState {
  id?: string;
  name: string;
  phone: string;
  address: string;
  note: string;
}

const emptyCustomerForm: CustomerFormState = { name: '', phone: '', address: '', note: '' };

export function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [form, setForm] = useState<CustomerFormState>(emptyCustomerForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { void refreshCustomers(); }, []);

  const filteredCustomers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('vi');
    if (!normalized) return customers;
    return customers.filter((customer) => [customer.name, customer.phone, customer.address].some((value) => value?.toLocaleLowerCase('vi').includes(normalized)));
  }, [customers, query]);

  const totalOrders = useMemo(() => customers.reduce((sum, customer) => sum + customer.total_orders, 0), [customers]);
  const totalSpent = useMemo(() => customers.reduce((sum, customer) => sum + customer.total_spent, 0), [customers]);
  const returningCustomers = useMemo(() => customers.filter((customer) => customer.total_orders >= 2).length, [customers]);

  async function refreshCustomers() {
    try {
      setError('');
      setCustomers(await listCustomers());
    } catch (caught) {
      console.error(caught);
      setError('Không tải được khách hàng. Cần chạy trong Tauri runtime để SQLite hoạt động.');
    }
  }

  function openCreateDialog() {
    setForm(emptyCustomerForm);
    setError('');
    setDialogOpen(true);
  }

  function openEditDialog(customer: CustomerRecord) {
    setForm({ id: customer.id, name: customer.name, phone: customer.phone ?? '', address: customer.address ?? '', note: customer.note ?? '' });
    setError('');
    setDialogOpen(true);
  }

  async function handleSaveCustomer() {
    if (!form.name.trim()) {
      setError('Tên khách hàng là bắt buộc.');
      return;
    }

    try {
      setStatus('Đang lưu khách hàng...');
      setError('');
      await saveCustomer(form);
      setDialogOpen(false);
      setForm(emptyCustomerForm);
      setStatus(form.id ? 'Đã cập nhật khách hàng.' : 'Đã tạo khách hàng mới.');
      await refreshCustomers();
    } catch (caught) {
      console.error(caught);
      setStatus('');
      setError('Không lưu được khách hàng. Kiểm tra tên và dữ liệu nhập.');
    }
  }

  return (
    <>
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Khách hàng</span>
          <h2>Hồ sơ khách & lịch sử mua</h2>
        </div>
        <Button onClick={openCreateDialog}>Thêm khách hàng</Button>
      </div>

      {(status || error) && <div className="setup-status-row">{status && <Badge tone="sage">{status}</Badge>}{error && <Badge tone="peach">{error}</Badge>}</div>}

      <div className="customer-summary-grid">
        <CustomerSummaryCard label="Tổng khách hàng" value={String(customers.length)} detail="Hồ sơ đang lưu" />
        <CustomerSummaryCard label="Khách quay lại" value={String(returningCustomers)} detail="Có từ 2 đơn trở lên" />
        <CustomerSummaryCard label="Tổng số đơn" value={String(totalOrders)} detail="Chỉ tính hóa đơn hoàn tất" />
        <CustomerSummaryCard label="Tổng chi tiêu" value={formatCurrency(totalSpent)} detail="Từ hóa đơn đã chốt" />
      </div>

      <SoftCard className="customer-directory-card" title="Danh sách khách hàng" description="Khách phát sinh từ POS sẽ tự vào đây; chủ tiệm vẫn có thể tạo trước khách quen.">
        <div className="customer-list-toolbar">
          <div className="customer-search-field">
            <TextField label="Tìm khách hàng" placeholder="Tên, số điện thoại hoặc địa chỉ" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <span>{filteredCustomers.length} / {customers.length} khách</span>
        </div>

        {customers.length === 0 ? (
          <EmptyState title="Chưa có khách hàng" description="Bấm Thêm khách hàng để tạo hồ sơ khách quen đầu tiên." />
        ) : filteredCustomers.length === 0 ? (
          <EmptyState title="Không tìm thấy khách hàng" description="Thử tìm bằng tên, số điện thoại hoặc địa chỉ khác." />
        ) : (
          <div className="customer-list">
            {filteredCustomers.map((customer) => (
              <article className="customer-row" key={customer.id}>
                <div className="customer-avatar" aria-hidden="true">{customer.name.trim().slice(0, 1).toLocaleUpperCase('vi')}</div>
                <div className="customer-main-info">
                  <strong>{customer.name}</strong>
                  <span>{customer.phone ?? 'Chưa có SĐT'}</span>
                  <small>{customer.address ?? 'Chưa có địa chỉ'}</small>
                </div>
                <div className="customer-metric">
                  <span>Số đơn</span>
                  <strong>{customer.total_orders}</strong>
                </div>
                <div className="customer-metric">
                  <span>Chi tiêu</span>
                  <strong>{formatCurrency(customer.total_spent)}</strong>
                </div>
                <div className="customer-last-sale">
                  <span>Mua gần nhất</span>
                  <strong>{customer.last_sale_date ?? 'Chưa có'}</strong>
                </div>
                <Button variant="ghost" onClick={() => openEditDialog(customer)}>Sửa</Button>
              </article>
            ))}
          </div>
        )}
      </SoftCard>

      <Dialog open={dialogOpen} title={form.id ? 'Cập nhật khách hàng' : 'Tạo khách hàng'} onClose={() => setDialogOpen(false)}>
        <div className="setup-form-grid">
          <TextField label="Tên khách" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          <TextField label="Số điện thoại" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          <TextField label="Địa chỉ" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
          <TextArea label="Ghi chú" value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
          <Button onClick={handleSaveCustomer}>{form.id ? 'Lưu thay đổi' : 'Tạo khách'}</Button>
        </div>
      </Dialog>
    </>
  );
}

function CustomerSummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="customer-summary-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}
