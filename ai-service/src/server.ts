import cors from 'cors';
import express from 'express';
import { z } from 'zod';

import { config } from './config.js';
import { advise } from './services/advisor.js';
import { getCxStatus } from './services/cxService.js';
import { scoreEvent, shouldNotify } from './services/hotScore.js';
import { sendNotify } from './services/notifier.js';

const chatSchema = z.object({
  tabKey: z.enum(['dashboard', 'sales', 'flowerOrders', 'inventory', 'purchase', 'recipes', 'customers', 'reports', 'settings']),
  intentId: z.string().optional(),
  question: z.string().optional(),
  context: z.unknown().optional(),
});

const eventSchema = z.object({
  type: z.enum(['sale_created', 'order_created', 'order_due', 'stock_low', 'waste_recorded', 'daily_summary']),
  title: z.string(),
  body: z.string().optional(),
  score: z.number().optional(),
  payload: z.unknown().optional(),
});

const app = express();
app.use(cors({ origin: config.appOrigin }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'bloomia-ai-service' });
});

app.post('/api/chat', (req, res) => {
  const input = chatSchema.parse(req.body);
  res.json(advise(input));
});

app.post('/api/events', async (req, res) => {
  const event = eventSchema.parse(req.body);
  const score = scoreEvent(event);
  const notify = shouldNotify(score);
  const notifyResult = notify ? await sendNotify(`Bloomia: ${event.title}\n${event.body ?? ''}`) : { sent: false, reason: 'score_below_threshold' };
  res.json({ accepted: true, score, notify, notifyResult });
});

app.get('/api/dialogflow/test', (_req, res) => {
  res.json(getCxStatus());
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(400).json({ ok: false, error: error instanceof Error ? error.message : 'bad_request' });
});

app.listen(config.port, () => {
  console.log(`Bloomia AI service listening on ${config.port}`);
});
