import { getDatabase } from '../client';
import { createLocalId } from '../../utils/id';

export interface RecipeRecord {
  id: string;
  name: string;
  description: string | null;
  occasion: string | null;
  color_tone: string | null;
  size_label: string | null;
  suggested_sale_price: number;
  is_active: number;
}

export interface RecipeItemRecord {
  id: string;
  recipe_id: string;
  item_id: string;
  item_name: string;
  item_type: string;
  unit_symbol: string | null;
  default_sale_price: number;
  is_stock_tracked: number;
  quantity: number;
  note: string | null;
  sort_order: number;
}

export interface HydratedRecipe extends RecipeRecord {
  items: RecipeItemRecord[];
  estimated_cost: number;
}

export interface SaveRecipeItemInput {
  itemId: string;
  quantity: number;
  note?: string;
  sortOrder?: number;
}

export interface SaveRecipeInput {
  id?: string;
  name: string;
  description?: string;
  occasion?: string;
  colorTone?: string;
  sizeLabel?: string;
  suggestedSalePrice: number;
  items: SaveRecipeItemInput[];
}

export async function listRecipes() {
  const db = await getDatabase();
  const recipes = await db.select<RecipeRecord>(
    'SELECT id, name, description, occasion, color_tone, size_label, suggested_sale_price, is_active FROM recipes WHERE is_active = 1 ORDER BY name ASC',
  );

  const hydrated: HydratedRecipe[] = [];
  for (const recipe of recipes) {
    const items = await listRecipeItems(recipe.id);
    hydrated.push({ ...recipe, items, estimated_cost: estimateRecipeCost(items) });
  }
  return hydrated;
}

export async function getRecipe(id: string) {
  const db = await getDatabase();
  const rows = await db.select<RecipeRecord>(
    'SELECT id, name, description, occasion, color_tone, size_label, suggested_sale_price, is_active FROM recipes WHERE id = ? LIMIT 1',
    [id],
  );
  const recipe = rows[0];
  if (!recipe) return null;
  const items = await listRecipeItems(recipe.id);
  return { ...recipe, items, estimated_cost: estimateRecipeCost(items) };
}

export async function saveRecipe(input: SaveRecipeInput) {
  const db = await getDatabase();
  const id = input.id ?? createLocalId('recipe');

  if (input.id) {
    await db.execute(
      'UPDATE recipes SET name = ?, description = ?, occasion = ?, color_tone = ?, size_label = ?, suggested_sale_price = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [input.name.trim(), clean(input.description), clean(input.occasion), clean(input.colorTone), clean(input.sizeLabel), input.suggestedSalePrice, id],
    );
    await db.execute('DELETE FROM recipe_items WHERE recipe_id = ?', [id]);
  } else {
    await db.execute(
      'INSERT INTO recipes (id, name, description, occasion, color_tone, size_label, suggested_sale_price, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [id, input.name.trim(), clean(input.description), clean(input.occasion), clean(input.colorTone), clean(input.sizeLabel), input.suggestedSalePrice],
    );
  }

  for (const [index, item] of input.items.entries()) {
    if (!item.itemId) continue;
    await db.execute(
      'INSERT INTO recipe_items (id, recipe_id, item_id, quantity, note, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [createLocalId('recipe-line'), id, item.itemId, normalizeQuantity(item.quantity), clean(item.note), item.sortOrder ?? index],
    );
  }

  return id;
}

export async function archiveRecipe(id: string) {
  const db = await getDatabase();
  await db.execute('UPDATE recipes SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
}

async function listRecipeItems(recipeId: string) {
  const db = await getDatabase();
  return db.select<RecipeItemRecord>(
    `SELECT recipe_items.id, recipe_items.recipe_id, recipe_items.item_id, items.name AS item_name, items.item_type, units.symbol AS unit_symbol, items.default_sale_price, items.is_stock_tracked, recipe_items.quantity, recipe_items.note, recipe_items.sort_order
     FROM recipe_items
     INNER JOIN items ON items.id = recipe_items.item_id
     LEFT JOIN units ON units.id = items.unit_id
     WHERE recipe_items.recipe_id = ?
     ORDER BY recipe_items.sort_order ASC, recipe_items.created_at ASC`,
    [recipeId],
  );
}

function estimateRecipeCost(items: RecipeItemRecord[]) {
  return Math.round(items.reduce((sum, item) => sum + item.quantity * item.default_sale_price, 0));
}

function normalizeQuantity(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  return Math.round(value * 100) / 100;
}

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
