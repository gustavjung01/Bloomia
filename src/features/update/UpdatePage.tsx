import { useState } from 'react';

import { Badge, Button, SoftCard } from '../../components/ui';
import { backupBloomiaDatabase } from '../../services/system/systemService';
import { checkBloomiaUpdate, installBloomiaUpdate, type UpdateStatus } from '../../services/update/updateService';

export function UpdatePage() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleCheck() {
    try {
      setBusy(true);
      setError('');
      setMessage('Đang kiểm tra bản cập nhật...');
      const result = await checkBloomiaUpdate();
      setStatus(result);
      setMessage(result.available ? `Có bản mới ${result.version}` : 'Bạn đang dùng bản mới nhất.');
    } catch (caught) {
      console.error(caught);
      setMessage('');
      setError('Không kiểm tra được update. Kiểm tra endpoint/public key trong .env.release và build lại app.');
    } finally {
      setBusy(false);
    }
  }

  async function handleInstall() {
    try {
      setBusy(true);
      setError('');
      setMessage('Đang backup DB trước khi update...');
      await backupBloomiaDatabase();
      await installBloomiaUpdate(setMessage);
      setMessage('Đã cài update. Hãy đóng mở lại Bloomia nếu app chưa tự restart.');
    } catch (caught) {
      console.error(caught);
      setMessage('');
      setError('Không cài được update. DB local vẫn được giữ nguyên.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-title-row"><div><span className="eyebrow">Cập nhật</span><h2>Update Bloomia tại chỗ</h2></div><Button onClick={handleCheck} disabled={busy}>Kiểm tra update</Button></div>
      {(message || error) && <div className="setup-status-row">{message && <Badge tone="sage">{message}</Badge>}{error && <Badge tone="peach">{error}</Badge>}</div>}
      <div className="page-grid">
        <SoftCard className="span-6" title="Trạng thái phiên bản" description="Bloomia kiểm tra feed update đã cấu hình trong build release.">
          <div className="system-info-list">
            <div><span>Bản hiện tại</span><strong>{status?.currentVersion ?? 'Chưa kiểm tra'}</strong></div>
            <div><span>Bản mới</span><strong>{status?.available ? status.version : 'Không có'}</strong></div>
            <div><span>Ngày phát hành</span><code>{status?.date ?? '—'}</code></div>
          </div>
          <Button onClick={handleInstall} disabled={busy || !status?.available}>Tải & cài update</Button>
        </SoftCard>
        <SoftCard className="span-6" title="Ghi chú update" description="Khi update, DB và media local không bị xóa.">
          <p className="setup-muted">{status?.body || 'Bấm Kiểm tra update để đọc ghi chú từ feed.'}</p>
          <div className="system-info-list"><div><span>An toàn dữ liệu</span><strong>Backup DB trước khi cài</strong></div><div><span>Env endpoint</span><code>BLOOMIA_UPDATE_ENDPOINT</code></div><div><span>Manifest</span><code>release/latest.json</code></div></div>
        </SoftCard>
      </div>
    </>
  );
}
