export type TabKey = 'dashboard' | 'sales' | 'flowerOrders' | 'inventory' | 'purchase' | 'recipes' | 'customers' | 'reports' | 'settings';

export interface FloristChatRequest {
  tabKey: TabKey;
  intentId?: string;
  question?: string;
  context?: unknown;
}

export interface FloristChatResponse {
  answer: string;
  suggestions: Array<{ title: string; body: string; actionLabel?: string; actionText?: string }>;
  source: 'local' | 'provider';
}

export interface BloomiaEventRequest {
  type: 'sale_created' | 'order_created' | 'order_due' | 'stock_low' | 'waste_recorded' | 'daily_summary';
  title: string;
  body?: string;
  score?: number;
  payload?: unknown;
}
