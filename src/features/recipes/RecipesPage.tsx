import { useEffect, useMemo, useState } from 'react';

import { Badge, Button, SelectField, SoftCard, TextArea, TextField } from '../../components/ui';
import { listItems, type ItemRecord } from '../../db/repositories/manualSetupRepository';
import { archiveRecipe, listRecipes, saveRecipe, type HydratedRecipe } from '../../db/repositories/recipesRepository';
import { createLocalId } from '../../utils/id';
import { formatCurrency } from '../../utils/format';

interface RecipeLineState {
  id: string;
  itemId: string;
  quantity: string;
  note: string;
}

interface RecipeFormState {
  id?: string;
  name: string;
  description: string;
  occasion: string;
  colorTone: string;
  sizeLabel: string;
  suggestedSalePrice: string;
  lines: RecipeLineState[];
}

function emptyLine(): RecipeLineState {
  return { id: createLocalId('recipe-line'), itemId: '', quantity: '1', note: '' };
}

const emptyForm: RecipeFormState = {
  name: '',
  description: '',
  occasion: '',
  colorTone: '',
  sizeLabel: 'M',
  suggestedSalePrice: '500000',
  lines: [emptyLine()],
};

export function RecipesPage() {
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [recipes, setRecipes] = useState<HydratedRecipe[]>([]);
  const [form, setForm] = useState<RecipeFormState>(emptyForm);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { void refreshData(); }, []);

  const itemOptions = useMemo(
    () => [{ label: 'Chọn nguyên liệu/dịch vụ', value: '' }, ...items.map((item) => ({ label: `${item.name} • ${item.unit_symbol ?? 'đơn vị'} • ${formatCurrency(item.default_sale_price)}`, value: item.id }))],
    [items],
  );

  const estimatedCost = useMemo(() => form.lines.reduce((sum, line) => {
    const item = items.find((row) => row.id === line.itemId);
    return sum + Number(line.quantity || 0) * (item?.default_sale_price ?? 0);
  }, 0), [form.lines, items]);

  async function refreshData() {
    try {
      setError('');
      const data = await Promise.all([listItems(), listRecipes()]);
      setItems(data[0]);
      setRecipes(data[1]);
    } catch (caught) {
      console.error(caught);
      setError('Không tải được công thức mẫu. Cần chạy trong Tauri runtime.');
    }
  }

  function updateLine(id: string, patch: Partial<RecipeLineState>) {
    setForm((current) => ({ ...current, lines: current.lines.map((line) => line.id === id ? { ...line, ...patch } : line) }));
  }

  function removeLine(id: string) {
    setForm((current) => ({ ...current, lines: current.lines.length === 1 ? current.lines : current.lines.filter((line) => line.id !== id) }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Tên mẫu hoa là bắt buộc.'); return; }
    const validLines = form.lines.filter((line) => line.itemId && Number(line.quantity) > 0);
    if (validLines.length === 0) { setError('Công thức cần ít nhất một nguyên liệu/dịch vụ.'); return; }

    try {
      setStatus('Đang lưu công thức...');
      setError('');
      await saveRecipe({
        id: form.id,
        name: form.name,
        description: form.description,
        occasion: form.occasion,
        colorTone: form.colorTone,
        sizeLabel: form.sizeLabel,
        suggestedSalePrice: Number(form.suggestedSalePrice || 0),
        items: validLines.map((line, index) => ({ itemId: line.itemId, quantity: Number(line.quantity), note: line.note, sortOrder: index })),
      });
      setForm({ ...emptyForm, lines: [emptyLine()] });
      setStatus('Đã lưu công thức mẫu.');
      await refreshData();
    } catch (caught) {
      console.error(caught);
      setStatus('');
      setError('Không lưu được công thức mẫu.');
    }
  }

  async function handleArchive(id: string) {
    await archiveRecipe(id);
    await refreshData();
  }

  function editRecipe(recipe: HydratedRecipe) {
    setForm({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description ?? '',
      occasion: recipe.occasion ?? '',
      colorTone: recipe.color_tone ?? '',
      sizeLabel: recipe.size_label ?? '',
      suggestedSalePrice: String(recipe.suggested_sale_price),
      lines: recipe.items.map((item) => ({ id: item.id, itemId: item.item_id, quantity: String(item.quantity), note: item.note ?? '' })),
    });
  }

  return (
    <>
      <div className="page-title-row">
        <div><span className="eyebrow">Công thức</span><h2>Mẫu hoa & thành phần</h2></div>
        <Button onClick={() => setForm({ ...emptyForm, lines: [emptyLine()] })}>Tạo mới</Button>
      </div>

      {(status || error) && <div className="setup-status-row">{status && <Badge tone="sage">{status}</Badge>}{error && <Badge tone="peach">{error}</Badge>}</div>}

      <div className="page-grid">
        <SoftCard className="span-5" title={form.id ? 'Sửa công thức' : 'Tạo công thức'} description="Công thức gồm hoa, phụ liệu và dịch vụ.">
          <div className="setup-form-grid">
            <TextField label="Tên mẫu" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <TextField label="Dịp" value={form.occasion} onChange={(event) => setForm((current) => ({ ...current, occasion: event.target.value }))} />
            <TextField label="Tone màu" value={form.colorTone} onChange={(event) => setForm((current) => ({ ...current, colorTone: event.target.value }))} />
            <TextField label="Size" value={form.sizeLabel} onChange={(event) => setForm((current) => ({ ...current, sizeLabel: event.target.value }))} />
            <TextField label="Giá bán gợi ý" type="number" min={0} value={form.suggestedSalePrice} onChange={(event) => setForm((current) => ({ ...current, suggestedSalePrice: event.target.value }))} />
            <TextArea label="Mô tả" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} />
          </div>

          <div className="recipe-line-list">
            {form.lines.map((line) => <div className="recipe-line-row" key={line.id}>
              <SelectField label="Thành phần" value={line.itemId} options={itemOptions} onChange={(event) => updateLine(line.id, { itemId: event.target.value })} />
              <TextField label="SL" type="number" min={0.01} step={0.01} value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: event.target.value })} />
              <Button variant="ghost" onClick={() => removeLine(line.id)}>Xóa</Button>
            </div>)}
          </div>

          <div className="recipe-total-row"><span>Giá vốn tạm tính</span><strong>{formatCurrency(estimatedCost)}</strong></div>
          <Button variant="soft" onClick={() => setForm((current) => ({ ...current, lines: [...current.lines, emptyLine()] }))}>Thêm thành phần</Button>
          <div style={{ height: 12 }} />
          <Button onClick={handleSave}>Lưu công thức</Button>
        </SoftCard>

        <SoftCard className="span-7" title="Danh sách mẫu hoa" description="Bấm sửa để tối ưu công thức hoặc đổi giá gợi ý.">
          <div className="recipe-card-list">
            {recipes.length === 0 && <p className="setup-muted">Chưa có công thức mẫu.</p>}
            {recipes.map((recipe) => <article className="recipe-card" key={recipe.id}>
              <div><Badge tone="lavender">{recipe.size_label ?? 'Mẫu'}</Badge><h3>{recipe.name}</h3><p>{recipe.color_tone ?? 'Chưa tone'} • {recipe.occasion ?? 'Chưa dịp'}</p><p>{recipe.items.length} thành phần • vốn tạm {formatCurrency(recipe.estimated_cost)} • bán gợi ý {formatCurrency(recipe.suggested_sale_price)}</p></div>
              <div className="setup-row-actions"><Button variant="ghost" onClick={() => editRecipe(recipe)}>Sửa</Button><Button variant="soft" onClick={() => handleArchive(recipe.id)}>Ẩn</Button></div>
            </article>)}
          </div>
        </SoftCard>
      </div>
    </>
  );
}
