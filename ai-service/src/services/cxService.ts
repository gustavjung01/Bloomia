import { config } from '../config.js';

export function getCxStatus() {
  const missing = [
    ['projectId', config.cx.projectId],
    ['agentId', config.cx.agentId],
  ].filter(([, value]) => !value).map(([key]) => key);

  return {
    ready: missing.length === 0,
    missing,
    location: config.cx.location,
    languageCode: config.cx.languageCode,
  };
}

export function buildCxSessionPath(sessionId: string) {
  return `projects/${config.cx.projectId}/locations/${config.cx.location}/agents/${config.cx.agentId}/sessions/${sessionId}`;
}
