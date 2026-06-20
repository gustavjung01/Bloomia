import type { RouteKey } from '../../app/routes';
import { getRuntimeSettings } from '../../db/repositories/runtimeSettingsRepository';
import type { AssistantResult } from '../../features/ai/types';
import { buildAssistantResult } from '../../features/ai/resultService';

interface CloudAdviceResponse {
  answer?: string;
  source?: string;
  suggestions?: Array<{ title?: string; body?: string }>;
}

export async function getDesktopAIAdvice(tabKey: RouteKey, intentId: string, contextText: string): Promise<AssistantResult> {
  const settings = await getRuntimeSettings();
  if (settings.mode === 'off') return { title: 'Bloomia AI đang tắt', body: 'Chủ tiệm đang tắt AI. Bạn vẫn có thể dùng các chức năng POS/kho/báo cáo offline.' };
  if (settings.mode !== 'cloud' || !settings.serviceUrl.trim()) return buildAssistantResult(tabKey, intentId, contextText);

  try {
    const response = await fetch(`${settings.serviceUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tabKey, intentId, context: JSON.parse(contextText) }),
    });
    if (!response.ok) throw new Error(`AI service ${response.status}`);
    const data = await response.json() as CloudAdviceResponse;
    return {
      title: data.suggestions?.[0]?.title || 'Bloomia AI Cloud',
      body: data.answer || data.suggestions?.[0]?.body || 'AI service đã phản hồi nhưng chưa có nội dung tư vấn.',
      actionLabel: data.source ? `Nguồn: ${data.source}` : undefined,
    };
  } catch (error) {
    console.warn('Cloud AI unavailable, falling back to local advice', error);
    const fallback = buildAssistantResult(tabKey, intentId, contextText);
    return { ...fallback, actionLabel: 'Fallback local', actionText: 'AI cloud chưa sẵn sàng nên Bloomia dùng tư vấn local/offline.' };
  }
}

export async function dispatchAIEvent(type: string, title: string, body?: string, payload?: unknown) {
  const settings = await getRuntimeSettings();
  if (settings.mode !== 'cloud' || !settings.eventDispatchEnabled || !settings.serviceUrl.trim()) return { sent: false, reason: 'disabled' };
  const response = await fetch(`${settings.serviceUrl.replace(/\/$/, '')}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, title, body, payload }),
  });
  return response.json();
}
