export interface CartLine {
  id: string;
  itemId?: string | null;
  itemName: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  note?: string;
  isCustom?: boolean;
}

export interface CartTotals {
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  total: number;
  estimatedCost: number;
  estimatedProfit: number;
}

export function calculateCartTotals(lines: CartLine[], discountAmount: number, shippingFee: number): CartTotals {
  const subtotal = Math.round(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
  const estimatedCost = Math.round(lines.reduce((sum, line) => sum + line.quantity * (line.costPrice ?? 0), 0));
  const safeDiscount = normalizeMoney(discountAmount);
  const safeShipping = normalizeMoney(shippingFee);
  const total = Math.max(0, Math.round(subtotal - safeDiscount + safeShipping));

  return {
    subtotal,
    discountAmount: safeDiscount,
    shippingFee: safeShipping,
    total,
    estimatedCost,
    estimatedProfit: Math.round(total - estimatedCost),
  };
}

export function lineTotal(line: CartLine) {
  return Math.round(line.quantity * line.unitPrice);
}

export function normalizeQuantity(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  return Math.round(value * 100) / 100;
}

export function normalizeMoney(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.round(value);
}
