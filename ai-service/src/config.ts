import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 8787),
  appOrigin: process.env.APP_ORIGIN ?? 'http://127.0.0.1:1420',
  aiMode: process.env.AI_MODE ?? 'local',
  cx: {
    projectId: process.env.CX_PROJECT_ID ?? '',
    location: process.env.CX_LOCATION ?? 'global',
    agentId: process.env.CX_AGENT_ID ?? '',
    languageCode: process.env.CX_LANG ?? 'vi',
  },
  tg: {
    key: process.env.TG_KEY ?? '',
    chat: process.env.TG_CHAT ?? '',
  },
};
