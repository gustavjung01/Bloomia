# Bloomia Update Workflow

Bloomia now has a `Cập nhật` page in the sidebar.

## UI

The page can:

- Check the current app version.
- Check whether a newer version is available.
- Show release notes.
- Backup the local DB before installing.
- Download and install the update in place.

## Local config

Create `.env.release` locally:

```txt
BLOOMIA_UPDATE_ENDPOINT=https://your-public-release-domain.example.com/latest.json
BLOOMIA_UPDATE_PUBLIC_KEY=your public key
BLOOMIA_R2_BASE_URL=https://your-public-release-domain.example.com
BLOOMIA_RELEASE_VERSION=0.1.0
BLOOMIA_RELEASE_NOTES=Release notes here
BLOOMIA_RELEASE_TARGET=windows-x86_64
```

Do not commit real keys.

## Build

```bash
npm install
npm run tauri:build:nsis
```

## Make feed

After build creates the update zip and sig file:

```bash
npm run release:manifest
```

Output:

```txt
release/latest.json
release/upload-plan.txt
```

Upload layout:

```txt
/latest.json
/windows-x86_64/<update zip file>
```

## Test

1. Install an older version.
2. Upload the new update zip and latest.json.
3. Open Bloomia > Cập nhật.
4. Click check.
5. Click install.
6. Confirm DB/media still exist.
