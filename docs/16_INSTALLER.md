# Bloomia Icon and Installer

This batch adds generated Bloomia flower artwork for the desktop app and Windows installer.

## Generated files

Run:

```bash
npm run prepare:assets
```

It creates:

```txt
src-tauri/icons/32x32.png
src-tauri/icons/128x128.png
src-tauri/icons/128x128@2x.png
src-tauri/icons/icon.png
src-tauri/icons/icon.ico
src-tauri/installer/installer-header.bmp
src-tauri/installer/installer-sidebar.bmp
```

## Build installer

```bash
npm run tauri:build:nsis
```

The normal dev/build commands also prepare assets first.

## Installer settings

- Windows bundle target: NSIS.
- App icon: Bloomia flower icon.
- Installer icon: Bloomia flower icon.
- Header bitmap: Bloomia branded header.
- Sidebar bitmap: Bloomia branded sidebar.
- Start menu folder: Bloomia.
- Install mode: both.

## Test checklist

- Run installer on Windows.
- Confirm icon appears on installer and desktop shortcut.
- Confirm install location can be changed during the install flow.
- Confirm app data and local DB are not deleted by update/install-over.
