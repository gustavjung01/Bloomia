import { useEffect, useMemo, useRef, useState } from 'react';

import { Badge, Button, SelectField, SoftCard, TextField } from '../../components/ui';
import { listItems, type ItemRecord } from '../../db/repositories/manualSetupRepository';
import { loadPhotoMap, savePhotoMap } from '../../db/repositories/photoStore';
import { getRuntimeSettings, saveRuntimeSettings, type RuntimeMode, type RuntimeSettings } from '../../db/repositories/runtimeSettingsRepository';
import { backupBloomiaDatabase, getBloomiaAppStatus, listBloomiaBackups, openBloomiaAppDataDir, resolveMediaUrl, saveBloomiaMedia, stageBloomiaDatabaseRestore, type BloomiaAppStatus, type MediaSaveResult } from '../../services/system/systemService';

const ownerOptions = [
  { label: 'Logo shop', value: 'shop' },
  { label: 'Hàng hóa / sản phẩm', value: 'items' },
  { label: 'Mẫu hoa / recipe', value: 'recipes' },
  { label: 'Đơn hoa', value: 'orders' },
  { label: 'Khách hàng', value: 'customers' },
];

const aiModeOptions = [
  { label: 'Local - chạy offline, không cần cấu hình', value: 'local' },
  { label: 'Cloud - gọi Bloomia AI service', value: 'cloud' },
  { label: 'Off - tắt AI', value: 'off' },
];

function formatBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 || unitIndex === 0 ? Math.round(value) : value.toFixed(1)} ${units[unitIndex]}`;
}

export function SystemPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const itemFileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<BloomiaAppStatus | null>(null);
  const [backups, setBackups] = useState<string[]>([]);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [photoMap, setPhotoMap] = useState<{ [key: string]: string }>({});
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedBackup, setSelectedBackup] = useState('');
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState('');
  const [mediaOwner, setMediaOwner] = useState<'shop' | 'items' | 'recipes' | 'orders' | 'customers'>('items');
  const [aiSettings, setAISettings] = useState<RuntimeSettings>({ mode: 'local', serviceUrl: '', eventDispatchEnabled: false });
  const [lastMedia, setLastMedia] = useState<MediaSaveResult | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    void refreshPreview();
  }, [selectedItemId, photoMap]);

  const itemOptions = useMemo(
    () => [{ label: 'Chọn sản phẩm', value: '' }, ...items.map((item) => ({ label: item.name, value: item.id }))],
    [items],
  );

  const backupOptions = useMemo(
    () => [{ label: 'Chọn bản backup', value: '' }, ...backups.map((path) => ({ label: path.split(/[\\/]/).pop() ?? path, value: path }))],
    [backups],
  );

  const runtimeRows = [
    { label: 'App version', value: status?.app_version ?? '—', strong: true },
    { label: 'Backend runtime', value: 'Rust/Tauri đóng gói trong bloomia.exe', strong: true },
    { label: 'Frontend DB client', value: 'sqlite:bloomia.db', strong: true },
    { label: 'Dữ liệu shop', value: 'Nằm trong AppData, không nằm trong thư mục cài app', strong: true },
  ];

  const dbRows = [
    { label: 'DB path', value: status?.database_path ?? '—', code: true },
    { label: 'DB exists', value: status?.database_exists ? 'Có' : 'Chưa thấy file DB', strong: true },
    { label: 'DB size', value: status?.database_exists ? formatBytes(status.database_size_bytes) : '0 B', strong: true },
    { label: 'Pending restore', value: status?.pending_restore_exists ? 'Có, mở lại app để áp dụng' : 'Không', strong: true },
  ];

  const pathRows = [
    { label: 'App data path', value: status?.app_data_dir ?? '—' },
    { label: 'Media path', value: status?.media_dir ?? '—' },
    { label: 'Backup path', value: status?.backup_dir ?? '—' },
  ];

  async function refresh() {
    try {
      setError('');
      const [nextStatus, nextBackups, itemRows, nextPhotoMap, nextAISettings] = await Promise.all([
        getBloomiaAppStatus(),
        listBloomiaBackups(),
        listItems(),
        loadPhotoMap(),
        getRuntimeSettings(),
      ]);
      setStatus(nextStatus);
      setBackups(nextBackups);
      setItems(itemRows);
      setPhotoMap(nextPhotoMap);
      setAISettings(nextAISettings);
      if (!selectedItemId && itemRows[0]) setSelectedItemId(itemRows[0].id);
      if (!selectedBackup && nextBackups[0]) setSelectedBackup(nextBackups[0]);
    } catch (caught) {
      console.error(caught);
      setError('Không đọc được trạng thái hệ thống. Cần chạy trong Tauri runtime.');
    }
  }

  async function refreshPreview() {
    const relativePath = selectedItemId ? photoMap[selectedItemId] : '';
    setSelectedPreviewUrl(relativePath ? await resolveMediaUrl(relativePath) : '');
  }

  async function handleOpenDataFolder() {
    try {
      setError('');
      await openBloomiaAppDataDir();
      setMessage('Đã mở thư mục dữ liệu của Bloomia.');
    } catch (caught) {
      console.error(caught);
      setMessage('');
      setError('Không mở được thư mục dữ liệu.');
    }
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

  async function handleStageRestore() {
    if (!selectedBackup) {
      setError('Chưa chọn backup để restore.');
      return;
    }
    try {
      setMessage('Đang chuẩn bị restore DB...');
      setError('');
      await backupBloomiaDatabase();
      const pending = await stageBloomiaDatabaseRestore(selectedBackup);
      setMessage(`Đã stage restore: ${pending}. Hãy đóng Bloomia và mở lại để áp dụng DB backup.`);
      await refresh();
    } catch (caught) {
      console.error(caught);
      setMessage('');
      setError('Không stage được restore. Kiểm tra file backup còn tồn tại không.');
    }
  }

  async function handleSaveAISettings() {
    try {
      setError('');
      await saveRuntimeSettings(aiSettings);
      setMessage('Đã lưu cấu hình AI. Local mode không cần khách nhập API key.');
    } catch (caught) {
      console.error(caught);
      setError('Không lưu được cấu hình AI.');
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
      <div className="page-title-row">
        <div>
          <span className="eyebrow">Hệ thống</span>
          <h2>DB, media, backup & release</h2>
        </div>
        <Button onClick={refresh}>Làm mới</Button>
      </div>

      {(message || error) && (
        <div className="setup-status-row">
          {message && <Badge tone="sage">{message}</Badge>}
          {error && <Badge tone="peach">{error}</Badge>}
        </div>
      )}

      <div className="page-grid">
        <SoftCard
          className="span-6"
          title="Audit runtime DB"
          description="Backend Rust được đóng gói trong bloomia.exe. Dữ liệu shop nằm trong AppData, không nằm trong thư mục cài app."
          action={<Button variant="soft" onClick={handleOpenDataFolder}>Mở AppData</Button>}
        >
          <div className="setup-status-row" style={{ marginBottom: 16 }}>
            <Badge tone={status?.database_exists ? 'sage' : 'peach'}>{status?.database_exists ? 'DB sẵn sàng' : 'Chưa thấy DB'}</Badge>
            <Badge tone={status?.pending_restore_exists ? 'peach' : 'lavender'}>{status?.pending_restore_exists ? 'Có restore pending' : 'Không pending restore'}</Badge>
          </div>
          <div className="system-info-list">
            {dbRows.map((row) => (
              <div key={row.label}>
                <span>{row.label}</span>
                {row.code ? <code>{row.value}</code> : <strong>{row.value}</strong>}
              </div>
            ))}
          </div>
        </SoftCard>

        <SoftCard className="span-6" title="Runtime app layout" description="Các path thật app đang dùng khi chạy trên máy khách.">
          <div className="system-info-list">
            {runtimeRows.map((row) => (
              <div key={row.label}>
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
            {pathRows.map((row) => (
              <div key={row.label}>
                <span>{row.label}</span>
                <code>{row.value}</code>
              </div>
            ))}
          </div>
        </SoftCard>

        <SoftCard className="span-6" title="Backup DB" description="Tạo backup ngay từ DB local hiện tại trước khi sửa dữ liệu hoặc restore.">
          <div className="setup-form-grid">
            <p className="setup-muted">Backup lấy trực tiếp từ file SQLite local đang nằm trong AppData.</p>
            <Button onClick={handleBackup} disabled={!status?.database_exists}>Backup DB ngay</Button>
          </div>
        </SoftCard>

        <SoftCard className="span-6" title="Restore DB an toàn" description="Chọn backup, app sẽ stage restore. Mở lại Bloomia để áp dụng trước khi DB được đọc.">
          <div className="setup-form-grid">
            <SelectField label="Backup" value={selectedBackup} options={backupOptions} onChange={(event) => setSelectedBackup(event.target.value)} />
            <Button variant="soft" onClick={handleStageRestore} disabled={!selectedBackup}>Stage restore backup</Button>
            <p className="setup-muted">Trước khi restore, Bloomia tự tạo thêm một backup hiện trạng để quay lại nếu cần.</p>
          </div>
        </SoftCard>

        <SoftCard className="span-6" title="Bloomia AI runtime" description="Bán tool thì mặc định để Local. Cloud chỉ dành cho bản bạn vận hành AI service riêng.">
          <div className="setup-form-grid">
            <SelectField
              label="Chế độ AI"
              value={aiSettings.mode}
              options={aiModeOptions}
              onChange={(event) => setAISettings((current) => ({ ...current, mode: event.target.value as RuntimeMode }))}
            />
            <TextField
              label="AI service URL"
              value={aiSettings.serviceUrl}
              placeholder="https://ai.your-domain.com"
              onChange={(event) => setAISettings((current) => ({ ...current, serviceUrl: event.target.value }))}
            />
            <label className="setup-checkbox">
              <input
                type="checkbox"
                checked={aiSettings.eventDispatchEnabled}
                onChange={(event) => setAISettings((current) => ({ ...current, eventDispatchEnabled: event.target.checked }))}
              />
              Gửi event quan trọng sang AI service
            </label>
            <Button onClick={handleSaveAISettings}>Lưu cấu hình AI</Button>
          </div>
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
          {lastMedia && (
            <div className="system-info-list">
              <div>
                <span>File đã lưu</span>
                <code>{lastMedia.full_path}</code>
              </div>
              <div>
                <span>Dung lượng sau tối ưu</span>
                <strong>{formatBytes(lastMedia.size_bytes)}</strong>
              </div>
            </div>
          )}
        </SoftCard>

        <SoftCard className="span-6" title="Backups gần đây" description="Các backup nằm trong app data local, chưa upload cloud.">
          <div className="system-info-list">
            {backups.length === 0 && <p className="setup-muted">Chưa có backup.</p>}
            {backups.map((path) => (
              <div key={path}>
                <span>Backup</span>
                <code>{path}</code>
              </div>
            ))}
          </div>
        </SoftCard>
      </div>
    </>
  );
}
