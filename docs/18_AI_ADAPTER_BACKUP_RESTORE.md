# AI Adapter and Backup Restore

## AI runtime model

Bloomia is sold as a desktop tool, so customers should not need to understand API keys.

The desktop app supports three AI modes:

- Local: default mode, runs offline with local advice rules.
- Cloud: calls your Bloomia AI service URL.
- Off: disables AI advice.

Cloud mode is configured in Hệ thống with an AI service URL. If cloud mode fails, the app falls back to local advice instead of blocking POS, inventory, orders or reports.

## AI service adapter

Desktop Bloomia calls:

```txt
POST /api/chat
POST /api/events
```

The current AI popup uses `/api/chat` when Cloud mode is enabled. Event dispatch is optional and controlled by a checkbox.

## Backup and restore

Backup creates `.db` files in the local app data backup folder.

Restore is staged instead of immediately overwriting the active DB file:

1. User chooses a backup.
2. Bloomia creates a backup of the current DB.
3. Bloomia copies the selected backup to `restore-pending.db`.
4. User closes and opens Bloomia.
5. On startup, Bloomia replaces `bloomia.db` before the frontend reads the DB.
6. The pending file is removed.

This avoids overwriting a DB file while SQLite may still be open.

## Release note

Before shipping, test:

- Backup DB.
- Stage restore.
- Restart app.
- Confirm restored data appears.
- Confirm a `bloomia-before-restore-*.db` safety backup was created.
- AI Local mode works without internet.
- AI Cloud mode falls back safely if the service is down.
