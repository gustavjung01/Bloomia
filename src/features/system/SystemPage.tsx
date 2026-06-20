import { useEffect, useMemo, useRef, useState } from 'react';

import { Badge, Button, SelectField, SoftCard } from '../../components/ui';
import { listItems, type ItemRecord } from '../../db/repositories/manualSetupRepository';
import { loadPhotoMap, savePhotoMap } from '../../db/repositories/photoStore';
import { backupBloomiaDatabase, getBloomiaAppStatus, listBloomiaBackups, resolveMediaUrl, saveBloomiaMedia, type BloomiaAppStatus, type MediaSaveResult } from '../../services/system/systemService';

const ownerOptions = [
  { label: 'Logo shop', value: 'shop' },
  { label: 'Hàng hóa / sản phẩm', value: 'items' },
  { label: 'Mẫu hoa / recipe', value: 'recipes' },
  { label: 'Đơn hoa', value: 'orders' },
  { label: 'Khách hàng', value: 'customers' },
];

export function SystemPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const itemFileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<BloomiaAppStatus | null>(null);
  const [backups, setBackups] = useState<string[]>([]);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [photoMap, setPhotoMap] = useState<{ [key: string]: string }>({});
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState('');
  const [mediaOwner, setMediaOwner] = useState<'shop' | 'items' | 'recipes' | 'orders' | 'customers'>('items');
  const [lastMedia, setLastMedia] = useState<MediaSaveResult | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { void refresh(); }, []);
  useEffect(() => { void refreshPreview(); }, [selectedItemId, photoMap]);

  const itemOptions = useMemo(() => [{ label: 'Chọn sản phẩm', value: '' }, ...items.map((item) => ({ label: item.name, value: item.id }))], [items]);

  async function refresh() {
    try {
      setError('');
      const [nextStatus, nextBackups, itemRows, nextPhotoMap] = await Promise.all([getBloomiaAppStatus(), listBloomiaBackups(), listItems(), loadPhotoMap()]);
      setStatus(nextStatus);
      setBackups(nextBackups);
      setItems(itemRows);
      setPhotoMap(nextPhotoMap);
      if (!selectedItemId && itemRows[0]) setSelectedItemId(itemRows[0].id);
    } catch (caught) {
      console.error(caught);
      setError('Không đọc được trạng thái hệ thống. Cần chạy trong Tauri runtime.');
    }
  }

  async function refreshPreview() {
    const relativePath = selectedItemId ? photoMap[selectedItemId] : '';
    setSelectedPreviewUrl(relativePath ? await resolveMediaUrl(relativePath) : '');
  }

  async function handleBackup() {
    try {
      setMessage('Đang backup DB...');
      setError('');
      const path = await backupBloomiaDatabase();
      setMessage(`Đã tạo backup: ${path}`);
      await refresh();
    } catch (caught) {
      console.error(caught);
      setMessage('');
      setError('Không backup được DB. Có thể DB chưa được tạo hoặc app chưa chạy migration.');
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setMessage('Đang resize và lưu ảnh vào media local...');
      setError('');
      const result = await saveBloomiaMedia(mediaOwner, file);
      setLastMedia(result);
      setMessage(`Đã lưu ảnh tối ưu: ${result.relative_path}`);
      await refresh();
    } catch (caught) {
      console.error(caught);
      setMessage('');
      setError('Không lưu được ảnh. Chỉ nhận png, jpg, jpeg, webp.');
    }
  }

  async function handleAttachItemImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selectedItemId) return;
    try {
      setMessage('Đang resize ảnh và gắn vào sản phẩm...');
      setError('');
      const result = await saveBloomiaMedia('items', file);
      const nextMap = { ...photoMap, [selectedItemId]: result.relative_path };
      await savePhotoMap(nextMap);
      setPhotoMap(nextMap);
      setLastMedia(result);
      setMessage(`Đã gắn ảnh tối ưu cho sản phẩm: ${result.relative_path}`);
    } catch (caught) {
      console.error(caught);
      setMessage('');
      setError('Không gắn được ảnh sản phẩm. Chỉ nhận png, jpg, jpeg, webp.');
    }
  }

  async function clearItemImage() {
    if (!selectedItemId) return;
    const nextMap = { ...photoMap };
    delete nextMap[selectedItemId];
    await savePhotoMap(nextMap);
    setPhotoMap(nextMap);
    setMessage('Đã bỏ ảnh khỏi sản phẩm. File media cũ vẫn nằm trong thư mục media để tránh xóa nhầm.');
  }

  return (
    <>
      <div className="page-title-row"><div><span className="eyebrow">Hệ thống</span><h2>DB, media, backup & release</h2></div><Button onClick={refresh}>Làm mới</Button></div>
      {(message || error) && <div className="setup-status-row">{message && <Badge tone="sage">{message}</Badge>}{error && <Badge tone="peach">{error}</Badge>}</div>}
      <div className="page-grid">
        <SoftCard className="span-6" title="Local database" description="Cài mới phải tự tạo DB local và giữ lại khi update.">
          <div className="system-info-list">
            <div><span>DB status</span><strong>{status?.database_exists ? 'Đã có DB' : 'Chưa thấy file DB'}</strong></div>
            <div><span>App data</span><code>{status?.app_data_dir ?? '—'}</code></div>
            <div><span>Database</span><code>{status?.database_path ?? '—'}</code></div>
            <div><span>Media</span><code>{status?.media_dir ?? '—'}</code></div>
          </div>
          <Button variant="soft" onClick={handleBackup}>Backup DB ngay</Button>
        </SoftCard>

        <SoftCard className="span-6" title="Gắn ảnh cho sản phẩm" description="Ảnh lớn sẽ được tự resize về tối đa 1600px và lưu WebP local.">
          <div className="setup-form-grid">
            <SelectField label="Sản phẩm" value={selectedItemId} options={itemOptions} onChange={(event) => setSelectedItemId(event.target.value)} />
            {selectedPreviewUrl && <img src={selectedPreviewUrl} alt="Ảnh sản phẩm" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 18 }} />}
            <input ref={itemFileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleAttachItemImage} />
            <Button onClick={() => itemFileInputRef.current?.click()} disabled={!selectedItemId}>Upload & gắn ảnh</Button>
            <Button variant="ghost" onClick={clearItemImage} disabled={!selectedItemId || !photoMap[selectedItemId]}>Bỏ ảnh khỏi sản phẩm</Button>
          </div>
        </SoftCard>

        <SoftCard className="span-6" title="Upload ảnh local" description="Dùng để test thư mục media. Các form thật sẽ dùng picker/upload, không dán đường dẫn.">
          <div className="setup-form-grid">
            <SelectField label="Loại ảnh" value={mediaOwner} options={ownerOptions} onChange={(event) => setMediaOwner(event.target.value as typeof mediaOwner)} />
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleFileChange} />
            <Button onClick={() => fileInputRef.current?.click()}>Upload ảnh</Button>
          </div>
          {lastMedia && <div className="system-info-list"><div><span>File đã lưu</span><code>{lastMedia.full_path}</code></div><div><span>Dung lượng sau tối ưu</span><strong>{Math.round(lastMedia.size_bytes / 1024)} KB</strong></div></div>}
        </SoftCard>

        <SoftCard className="span-6" title="Backups gần đây" description="Các backup nằm trong app data local, chưa upload cloud.">
          <div className="system-info-list">
            {backups.length === 0 && <p className="setup-muted">Chưa có backup.</p>}
            {backups.map((path) => <div key={path}><span>Backup</span><code>{path}</code></div>)}
          </div>
        </SoftCard>
      </div>
    </>
  );
}
