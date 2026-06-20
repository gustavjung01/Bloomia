import { useEffect, useMemo, useRef, useState } from 'react';

import { Button, SelectField, SoftCard } from '../../components/ui';
import { listItems, type ItemRecord } from '../../db/repositories/manualSetupRepository';
import { loadPhotoMap, savePhotoMap } from '../../db/repositories/photoStore';
import { resolveMediaUrl, saveBloomiaMedia } from '../../services/system/systemService';

export function ItemPhotoPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [photoMap, setPhotoMap] = useState<{ [key: string]: string }>({});
  const [itemId, setItemId] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { void refresh(); }, []);
  useEffect(() => { void refreshPreview(); }, [itemId, photoMap]);

  const itemOptions = useMemo(() => [{ label: 'Chọn sản phẩm cần gắn ảnh', value: '' }, ...items.map((item) => ({ label: item.name, value: item.id }))], [items]);

  async function refresh() {
    const [itemRows, map] = await Promise.all([listItems(), loadPhotoMap()]);
    setItems(itemRows);
    setPhotoMap(map);
    if (!itemId && itemRows[0]) setItemId(itemRows[0].id);
  }

  async function refreshPreview() {
    const relativePath = itemId ? photoMap[itemId] : '';
    setPreviewUrl(relativePath ? await resolveMediaUrl(relativePath) : '');
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !itemId) return;
    setMessage('Đang resize và lưu ảnh...');
    const result = await saveBloomiaMedia('items', file);
    const nextMap = { ...photoMap, [itemId]: result.relative_path };
    await savePhotoMap(nextMap);
    setPhotoMap(nextMap);
    setMessage(`Đã gắn ảnh tối ưu: ${result.relative_path}`);
  }

  async function clearPhoto() {
    if (!itemId) return;
    const nextMap = { ...photoMap };
    delete nextMap[itemId];
    await savePhotoMap(nextMap);
    setPhotoMap(nextMap);
    setMessage('Đã bỏ ảnh khỏi sản phẩm. File cũ vẫn giữ trong media để tránh xóa nhầm.');
  }

  return (
    <SoftCard className="span-7" title="Ảnh sản phẩm" description="Upload ảnh bằng file picker. Ảnh lớn tự resize về WebP trước khi lưu local.">
      <div className="setup-form-grid">
        <SelectField label="Sản phẩm" value={itemId} options={itemOptions} onChange={(event) => setItemId(event.target.value)} />
        {previewUrl && <img src={previewUrl} alt="Ảnh sản phẩm" className="item-photo-preview" />}
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleUpload} />
        <Button onClick={() => inputRef.current?.click()} disabled={!itemId}>Upload & gắn ảnh</Button>
        <Button variant="ghost" onClick={clearPhoto} disabled={!itemId || !photoMap[itemId]}>Bỏ ảnh</Button>
        {message && <p className="setup-muted">{message}</p>}
      </div>
    </SoftCard>
  );
}
