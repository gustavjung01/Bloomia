import type { BloomiaEventRequest } from '../types.js';

export function scoreEvent(event: BloomiaEventRequest) {
  if (typeof event.score === 'number') return clamp(event.score);
  if (event.type === 'order_due') return 85;
  if (event.type === 'stock_low') return 75;
  if (event.type === 'waste_recorded') return 70;
  if (event.type === 'sale_created') return 35;
  if (event.type === 'daily_summary') return 45;
  return 50;
}

export function shouldNotify(score: number) {
  return score >= 70;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
