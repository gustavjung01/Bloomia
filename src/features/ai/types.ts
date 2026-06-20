import type { RouteKey } from '../../app/routes';

export interface AssistantCard {
  id: string;
  title: string;
  description: string;
  tone: 'pink' | 'sage' | 'lavender' | 'peach';
  intentId: string;
}

export interface AssistantResult {
  title: string;
  body: string;
  actionLabel?: string;
  actionText?: string;
}

export interface AssistantSession {
  id: string;
  tabKey: RouteKey;
  intentId: string;
  title: string;
  contextText: string;
  result: AssistantResult;
  createdAt: string;
}

export interface TabAssistantStore {
  tabKey: RouteKey;
  title: string;
  subtitle: string;
  getCards(): AssistantCard[];
  buildContext(intentId: string): Promise<string>;
  buildResult(intentId: string, contextText: string): Promise<AssistantResult>;
}
