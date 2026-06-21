import { useEffect, useMemo, useState } from 'react';

import { Badge, Button, SoftCard } from '../../components/ui';
import {
  getP0AcceptanceState,
  saveP0AcceptanceState,
  type P0AcceptanceState,
} from '../../db/repositories/p0AcceptanceRepository';

const checks = [
  { id: 'settings-persist', title: 'Cấu hình còn sau khi mở lại', detail: 'Lưu máy in/ngân hàng, đóng app, mở lại và kiểm tra dữ liệu không mất.' },
  { id: 'cash', title: 'Tiền mặt', detail: 'Kiểm tra tổng, chiết khấu %, khách đưa và tiền thừa.' },
  { id: 'bank-transfer', title: 'Chuyển khoản', detail: 'Quét QR, đối chiếu số tiền/nội dung rồi xác nhận thủ công.' },
  { id: 'debt', title: 'Công nợ', detail: 'Thu trước một phần và kiểm tra số còn nợ trên hóa đơn.' },
  { id: 'negative-stock', title: 'Bán vượt tồn', detail: 'Cảnh báo xuất hiện nhưng hóa đơn vẫn được lưu.' },
  { id: 'old-invoice', title: 'Hóa đơn cũ', detail: 'Đổi tài khoản ngân hàng rồi mở lại hóa đơn cũ; snapshot phải giữ nguyên.' },
  { id: 'paper-sizes', title: 'Khổ giấy', detail: 'In thử lần lượt 58 mm, 80 mm và A4 trên thiết bị thực tế.' },
  { id: 'backup', title: 'Backup trước phát hành', detail: 'Tạo backup DB và mở lại app trước khi build installer.' },
];

export function P0AcceptanceChecklist() {
  const [state, setState] = useState<P0AcceptanceState>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    void getP0AcceptanceState().then(setState).catch(() => setMessage('Không tải được trạng thái checklist.'));
  }, []);

  const completed = useMemo(() => checks.filter((check) => state[check.id]).length, [state]);

  async function toggle(id: string, checked: boolean) {
    const next = { ...state, [id]: checked };
    setState(next);
    try {
      await saveP0AcceptanceState(next);
      setMessage('Đã lưu trạng thái nghiệm thu.');
    } catch {
      setMessage('Không lưu được trạng thái nghiệm thu.');
    }
  }

  async function reset() {
    setState({});
    await saveP0AcceptanceState({});
    setMessage('Đã đặt lại checklist P0.');
  }

  return (
    <SoftCard
      className="span-12"
      title="Checklist nghiệm thu P0"
      description="Chạy trên máy bán hàng thật; trạng thái được lưu trong SQLite local."
      action={<Button variant="ghost" onClick={reset}>Đặt lại</Button>}
    >
      <div className="diagnostic-summary">
        <Badge tone={completed === checks.length ? 'sage' : 'lavender'}>{completed}/{checks.length} hoàn thành</Badge>
        {completed === checks.length && <Badge tone="sage">Sẵn sàng đóng gói</Badge>}
      </div>
      {message && <p className="setup-muted diagnostic-note">{message}</p>}
      <div className="acceptance-grid">
        {checks.map((check) => (
          <label className={`acceptance-item${state[check.id] ? ' is-complete' : ''}`} key={check.id}>
            <input type="checkbox" checked={Boolean(state[check.id])} onChange={(event) => void toggle(check.id, event.target.checked)} />
            <div><strong>{check.title}</strong><p>{check.detail}</p></div>
          </label>
        ))}
      </div>
    </SoftCard>
  );
}
