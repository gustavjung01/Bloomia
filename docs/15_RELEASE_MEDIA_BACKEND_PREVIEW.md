# Bloomia Release, Media and Backend Preview

This document turns the latest product requirements into an implementation preview.

## Product rule

Bloomia must feel installable and usable by a real florist shop:

- New install must create/use local DB automatically.
- Updates must update in place, not require uninstall/reinstall.
- Image fields must use upload/picker flows, never manual path paste.
- Installer should let the user choose install location when possible.
- Desktop icon must be a polished flower icon, not a placeholder.

## Current app modules

### Desktop frontend

- React + Tauri desktop shell.
- Sidebar/topbar app shell.
- Dashboard.
- POS.
- Flower orders.
- Inventory.
- Purchase.
- Recipes.
- Customers.
- Reports.
- Settings.
- In-app Bloomia AI local MVP popup.

### Local backend layer

- SQLite local DB through Tauri SQL plugin.
- Repositories are currently called from the desktop frontend.
- DB file is local to the machine.
- Missing: visible DB path, backup, restore, migration status panel.

### AI web backend

- `ai-service/` exists as a standalone Express service.
- Endpoints exist for health, chat, events and Dialogflow config check.
- Missing: desktop client adapter to call this service.
- Missing: production deployment and env management.

## Auto-update through R2

### Target behavior

1. Owner opens Settings > Update.
2. App checks current version against update manifest hosted on Cloudflare R2.
3. If update exists, app shows version, notes and size.
4. User clicks Update.
5. App downloads signed updater artifact from R2.
6. App installs update in place.
7. App restarts into the new version.
8. User data and local DB remain intact.

### Required implementation

- Add Tauri updater plugin.
- Generate updater signing key.
- Keep private signing key out of repo.
- Store updater public key in Tauri config.
- Build update artifacts on release.
- Upload artifacts and update manifest to R2.
- Add Settings > Update UI.
- Add manual check button.
- Add progress and failure state.

### R2 file layout proposal

```txt
r2://bloomia-releases/
  latest.json
  windows-x86_64/
    Bloomia_0.1.1_x64-setup.nsis.zip
    Bloomia_0.1.1_x64-setup.nsis.zip.sig
    Bloomia_0.1.1_x64-setup.exe
```

### Manifest proposal

```json
{
  "version": "0.1.1",
  "notes": "Fix DB setup and add media upload.",
  "pub_date": "2026-06-20T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "SIGNATURE_FROM_SIG_FILE",
      "url": "https://r2-domain.example.com/windows-x86_64/Bloomia_0.1.1_x64-setup.nsis.zip"
    }
  }
}
```

## Installer location / choose drive

### Target behavior

- Windows installer should allow users to choose installation location/drive.
- Recommended release target is NSIS installer.
- Install should default to current user install to avoid admin friction, but we should evaluate `both` mode if shops want Program Files installs.

### Required implementation

- Configure Windows NSIS bundle.
- Add polished installer icon.
- Add installer header/sidebar artwork.
- Verify install path chooser behavior in NSIS output.
- Test install to `C:`, `D:` and external/internal data paths.

## Desktop icon

### Target behavior

- Desktop icon is a flower-shaped Bloomia brand icon.
- Need icon sizes for Windows and bundle resources.
- Temporary generated icon is not acceptable for release.

### Required assets

```txt
src-tauri/icons/icon.ico
src-tauri/icons/32x32.png
src-tauri/icons/128x128.png
src-tauri/icons/128x128@2x.png
src-tauri/icons/icon.png
```

### Style direction

- Soft blush/pink base.
- Simple flower silhouette.
- High contrast at 16px/32px.
- Premium florist feel, not generic POS.

## Image upload / media library

### Product rule

Any field related to images must use upload/select UI. Users must not paste file paths.

### Image fields to support

- Shop logo.
- Item/product image.
- Recipe/template image.
- Flower order reference image.
- Customer occasion/reference image.
- Optional invoice/logo image.

### Target behavior

1. User clicks Upload image.
2. Native file picker opens.
3. App accepts png, jpg, jpeg, webp.
4. App copies the selected file into Bloomia local media folder.
5. DB stores internal media id or relative path.
6. UI shows thumbnail preview.
7. User can replace or remove image.

### Local media folder proposal

```txt
Bloomia app data/
  bloomia.db
  media/
    shop/
    items/
    recipes/
    orders/
    customers/
```

### DB changes proposal

```txt
media_assets
- id
- owner_type: shop | item | recipe | order | customer
- owner_id
- original_name
- stored_name
- mime_type
- size_bytes
- relative_path
- created_at

items.image_asset_id
recipes.image_asset_id
orders.reference_image_asset_id
customers.reference_image_asset_id
shops.logo_asset_id
```

## Backend/frontend alignment to finish

### Desktop local backend

- Add migration for media assets.
- Add Rust commands for app data path, file copy and backup/restore.
- Add media repository/service.
- Add DB status screen.

### AI service backend

- Keep as optional external service.
- Desktop should continue working offline if AI service is unavailable.
- Add `aiClient` in desktop to call `/api/chat` and `/api/events`.
- Event dispatch should be opt-in in Settings.

### Release backend / R2

- R2 hosts update files and `latest.json`.
- No DB sync through R2.
- R2 update does not touch user DB/media.

## Implementation order

1. Fix DB setup and expose DB path/status.
2. Add media upload service and image fields.
3. Add polished flower icon assets.
4. Configure NSIS release bundle and installer art.
5. Add Tauri updater plugin and Settings > Update UI.
6. Add R2 release manifest workflow.
7. Add desktop adapter for `ai-service`.
8. Add backup/restore before release.

## Non-negotiables for release

- No manual image path fields.
- No reinstall required for updates.
- No secrets in repo.
- Local DB/media must survive update.
- App must run offline for POS/core workflows.
- Owner-only data such as profit stays out of cashier POS screens.
