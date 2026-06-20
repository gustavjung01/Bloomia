export type ItemType = 'flower' | 'material' | 'service' | 'product';

export type StockMovementType = 'purchase' | 'sale' | 'waste' | 'sample' | 'event' | 'internal' | 'adjustment';

export interface Migration {
  id: string;
  description: string;
  statements: string[];
}

export interface QueryableDatabase {
  execute(query: string, bindValues?: unknown[]): Promise<unknown>;
  select<T = unknown>(query: string, bindValues?: unknown[]): Promise<T[]>;
}

export interface SeedItem {
  name: string;
  type: ItemType;
  unit: string;
  category: string;
  defaultSalePrice: number;
  defaultPurchasePrice?: number;
  isStockTracked: boolean;
}
