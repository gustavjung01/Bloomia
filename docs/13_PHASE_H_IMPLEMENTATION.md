# Phase H Implementation

Phase H adds the AI web service foundation.

## Implemented

- Added standalone `ai-service/` package.
- Added Express HTTP server.
- Added local florist advisor service.
- Added chat API.
- Added event API.
- Added event score helper.
- Added optional notify helper.
- Added Dialogflow CX config status helper.
- Added service README and env sample.

## Main files

```txt
ai-service/package.json
ai-service/tsconfig.json
ai-service/env.sample
ai-service/src/config.ts
ai-service/src/types.ts
ai-service/src/server.ts
ai-service/src/services/advisor.ts
ai-service/src/services/hotScore.ts
ai-service/src/services/notifier.ts
ai-service/src/services/cxService.ts
ai-service/README.md
```

## Endpoints

```txt
GET  /health
POST /api/chat
POST /api/events
GET  /api/dialogflow/test
```

## Notes

- Chat currently uses local MVP rules.
- Provider-backed AI can replace the advisor module later.
- Event notify is optional and only sends when env values are present.
- No secrets are committed.

## Issue coverage

- #40 Setup AI web service skeleton
- #41 Implement florist AI chat and event APIs
- #42 Add Dialogflow CX settings and test endpoint
- #43 Implement Telegram notifications and hot event scoring
