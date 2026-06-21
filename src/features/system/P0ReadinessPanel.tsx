import { useEffect, useState } from 'react';
import { Badge, Button, SoftCard } from '../../components/ui';
import { runP0ReadinessAudit, type P0ReadinessReport } from '../../services/system/p0ReadinessService';

export function P0ReadinessPanel() {
  const [report, setReport] = useState<P0ReadinessReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { void refresh(); }, []);

  async function refresh() {
    try {
      setLoading(true);
      setError('');
      setReport(await runP0ReadinessAudit());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SoftCard className="span-7" title="P0 readiness audit" description="Kiểm tra migration, payment, máy in, VietQR và dữ liệu chuyển khoản." action={<Button variant="soft" onClick={refresh} disabled={loading}>{loading ? 'Đang kiểm tra...' : 'Chạy lại audit'}</Button>}>
      <div className="diagnostic-summary">
        <Badge tone={report?.ready ? 'sage' : 'peach'}>{report?.ready ? 'Không có lỗi chặn' : 'Có lỗi cần sửa'}</Badge>
        <Badge tone="sage">{report?.passed ?? 0} đạt</Badge>
        <Badge tone="lavender">{report?.warnings ?? 0} cảnh báo</Badge>
        <Badge tone={report?.failed ? 'peach' : 'sage'}>{report?.failed ?? 0} lỗi</Badge>
      </div>
      {error && <p className="setup-muted">{error}</p>}
      <div className="diagnostic-check-list">
        {report?.checks.map((check) => (
          <div className={`diagnostic-check diagnostic-${check.status}`} key={check.id}>
            <span className="diagnostic-marker">{check.status === 'pass' ? '✓' : check.status === 'warn' ? '!' : '×'}</span>
            <div><strong>{check.label}</strong><p>{check.detail}</p></div>
          </div>
        ))}
      </div>
    </SoftCard>
  );
}
