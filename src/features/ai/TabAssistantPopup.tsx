import { useEffect, useState } from 'react';

import type { RouteKey } from '../../app/routes';
import { Badge, Button, Dialog, SoftCard } from '../../components/ui';
import { saveAssistantSession } from '../../db/repositories/assistantSessionRepository';
import { getDesktopAIAdvice } from '../../services/ai/desktopAIService';
import { createLocalId } from '../../utils/id';
import { getAssistantCards } from './cardRegistry';
import { buildTabContext } from './contextService';
import type { AssistantResult } from './types';

interface TabAssistantPopupProps {
  open: boolean;
  tabKey: RouteKey;
  tabTitle: string;
  onClose: () => void;
}

export function TabAssistantPopup({ open, tabKey, tabTitle, onClose }: TabAssistantPopupProps) {
  const [loadingIntent, setLoadingIntent] = useState('');
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setResult(null);
      setError('');
      setLoadingIntent('');
    }
  }, [open, tabKey]);

  async function runIntent(intentId: string, title: string) {
    try {
      setLoadingIntent(intentId);
      setError('');
      const contextText = await buildTabContext(tabKey);
      const nextResult = await getDesktopAIAdvice(tabKey, intentId, contextText);
      setResult(nextResult);
      await saveAssistantSession({
        id: createLocalId('assistant-session'),
        tabKey,
        intentId,
        title,
        contextText,
        result: nextResult,
        createdAt: new Date().toISOString(),
      });
    } catch (caught) {
      console.error(caught);
      setError('Không đọc được context của tab này. Cần chạy trong Tauri runtime.');
    } finally {
      setLoadingIntent('');
    }
  }

  return (
    <Dialog open={open} title={`Bloomia AI — ${tabTitle}`} onClose={onClose}>
      <p className="assistant-subtitle">Chọn một thẻ nhỏ để Bloomia đọc dữ liệu thật trong tab hiện tại và tư vấn nhanh.</p>
      {error && <div className="setup-status-row"><Badge tone="peach">{error}</Badge></div>}
      <div className="assistant-card-grid">
        {getAssistantCards(tabKey).map((card) => (
          <button className="assistant-card-button" key={card.id} type="button" onClick={() => runIntent(card.intentId, card.title)}>
            <Badge tone={card.tone}>{loadingIntent === card.intentId ? 'Đang đọc...' : 'Tư vấn'}</Badge>
            <strong>{card.title}</strong>
            <span>{card.description}</span>
          </button>
        ))}
      </div>
      {result && (
        <SoftCard title={result.title} description="Kết quả đã được lưu vào lịch sử session." className="assistant-result-card">
          <p>{result.body}</p>
          {result.actionText && <pre className="assistant-action-text">{result.actionText}</pre>}
          {result.actionLabel && <Badge tone="sage">{result.actionLabel}</Badge>}
        </SoftCard>
      )}
    </Dialog>
  );
}
