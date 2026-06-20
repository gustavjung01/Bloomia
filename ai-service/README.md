# Bloomia AI Service

Backend service for Bloomia AI web features.

## Run locally

```bash
cd ai-service
npm install
cp env.sample .env
npm run dev
```

Default port: `8787`.

## Endpoints

```txt
GET  /health
POST /api/chat
POST /api/events
GET  /api/dialogflow/test
```

## Chat API

`POST /api/chat`

```json
{
  "tabKey": "sales",
  "intentId": "upsell",
  "question": "Gợi ý bán thêm cho đơn này",
  "context": {}
}
```

Returns local MVP advice and suggestion cards. Later phases can replace the local advisor with a provider-backed model.

## Event API

`POST /api/events`

```json
{
  "type": "stock_low",
  "title": "Hoa hồng pastel tồn thấp",
  "body": "Còn 3 cành",
  "score": 75
}
```

Events are scored from 0 to 100. Events with score 70 or higher trigger notify when notify env values are configured.

## Dialogflow CX config test

`GET /api/dialogflow/test` returns whether the CX config looks complete.

Required values:

```txt
CX_PROJECT_ID
CX_LOCATION
CX_AGENT_ID
CX_LANG
```

## Notify config

Use env sample values:

```txt
TG_KEY
TG_CHAT
```

No real credentials should be committed.
