import { useEffect, useState } from 'react';

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
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { void refreshCustomers(); }, []);

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

      <SoftCard title="Danh sách khách hàng" description="Khách phát sinh từ POS sẽ tự vào đây; chủ tiệm vẫn có thể tạo trước khách quen.">
        {customers.length === 0 ? (
          <EmptyState title="Chưa có khách hàng" description="Bấm Thêm khách hàng để tạo hồ sơ khách quen đầu tiên." />
        ) : (
          <div className="setup-list setup-list-tall">
            {customers.map((customer) => (
              <div className="setup-list-row" key={customer.id}>
                <div>
                  <strong>{customer.name}</strong>
                  <span>{customer.phone ?? 'Chưa có SĐT'} • {customer.total_orders} đơn • {formatCurrency(customer.total_spent)}</span>
                  <span>{customer.address ?? 'Chưa có địa chỉ'}{customer.last_sale_date ? ` • Mua gần nhất ${customer.last_sale_date}` : ''}</span>
                </div>
                <div className="setup-row-actions">
                  <Button variant="ghost" onClick={() => openEditDialog(customer)}>Sửa</Button>
                </div>
              </div>
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
