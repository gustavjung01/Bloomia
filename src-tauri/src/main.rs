#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::env;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
struct BloomiaAppStatus {
    app_data_dir: String,
    database_path: String,
    media_dir: String,
    backup_dir: String,
    database_exists: bool,
    pending_restore_exists: bool,
}

#[derive(Serialize)]
struct BloomiaUserPaths {
    documents_dir: String,
    bloomia_dir: String,
    exports_dir: String,
    reports_dir: String,
    invoices_dir: String,
    orders_dir: String,
    inventory_dir: String,
    user_backups_dir: String,
    imports_dir: String,
}

#[derive(Serialize)]
struct MediaSaveResult {
    stored_name: String,
    relative_path: String,
    full_path: String,
    size_bytes: usize,
}

#[tauri::command]
fn get_bloomia_app_status(app: AppHandle) -> Result<BloomiaAppStatus, String> {
    build_app_status(&app)
}

#[tauri::command]
fn get_bloomia_user_paths(app: AppHandle) -> Result<BloomiaUserPaths, String> {
    build_user_paths(&app, true)
}

#[tauri::command]
fn ensure_bloomia_user_dirs(app: AppHandle) -> Result<BloomiaUserPaths, String> {
    build_user_paths(&app, true)
}

#[tauri::command]
fn backup_bloomia_database(app: AppHandle) -> Result<String, String> {
    let status = build_app_status(&app)?;
    let database_path = PathBuf::from(&status.database_path);
    if !database_path.exists() {
        return Err("Bloomia database file does not exist yet".to_string());
    }

    let backup_dir = PathBuf::from(&status.backup_dir);
    fs::create_dir_all(&backup_dir).map_err(|error| error.to_string())?;
    let timestamp = unix_timestamp()?;
    let backup_path = backup_dir.join(format!("bloomia-backup-{timestamp}.db"));
    fs::copy(database_path, &backup_path).map_err(|error| error.to_string())?;
    Ok(backup_path.to_string_lossy().to_string())
}

#[tauri::command]
fn export_current_database_backup_to_documents(app: AppHandle) -> Result<String, String> {
    let status = build_app_status(&app)?;
    let database_path = PathBuf::from(&status.database_path);
    if !database_path.exists() {
        return Err("Bloomia database file does not exist yet".to_string());
    }

    let paths = build_user_paths(&app, true)?;
    let target_dir = PathBuf::from(paths.user_backups_dir);
    fs::create_dir_all(&target_dir).map_err(|error| error.to_string())?;
    let timestamp = unix_timestamp()?;
    let target_path = target_dir.join(format!("bloomia-backup-{timestamp}.db"));
    fs::copy(database_path, &target_path).map_err(|error| error.to_string())?;
    Ok(target_path.to_string_lossy().to_string())
}

#[tauri::command]
fn list_bloomia_backups(app: AppHandle) -> Result<Vec<String>, String> {
    let status = build_app_status(&app)?;
    let backup_dir = PathBuf::from(status.backup_dir);
    fs::create_dir_all(&backup_dir).map_err(|error| error.to_string())?;

    let mut rows = fs::read_dir(backup_dir)
        .map_err(|error| error.to_string())?
        .filter_map(Result::ok)
        .filter(|entry| entry.path().extension().and_then(|ext| ext.to_str()) == Some("db"))
        .map(|entry| entry.path().to_string_lossy().to_string())
        .collect::<Vec<String>>();
    rows.sort();
    rows.reverse();
    Ok(rows)
}

#[tauri::command]
fn stage_bloomia_database_restore(app: AppHandle, backup_path: String) -> Result<String, String> {
    stage_database_restore(&app, &PathBuf::from(backup_path))
}

#[tauri::command]
fn stage_bloomia_database_restore_from_dialog(app: AppHandle) -> Result<Option<String>, String> {
    let paths = build_user_paths(&app, true)?;
    let Some(source) = rfd::FileDialog::new()
        .set_directory(PathBuf::from(paths.user_backups_dir))
        .add_filter("SQLite database", &["db"])
        .pick_file()
    else {
        return Ok(None);
    };

    stage_database_restore(&app, &source).map(Some)
}

#[tauri::command]
fn save_bloomia_media(app: AppHandle, owner_type: String, file_name: String, bytes: Vec<u8>) -> Result<MediaSaveResult, String> {
    if bytes.is_empty() {
        return Err("Image file is empty".to_string());
    }

    let extension = safe_extension(&file_name)?;
    let owner = safe_owner_type(&owner_type)?;
    let status = build_app_status(&app)?;
    let target_dir = PathBuf::from(&status.media_dir).join(&owner);
    fs::create_dir_all(&target_dir).map_err(|error| error.to_string())?;

    let timestamp = unix_timestamp()?;
    let stored_name = format!("{owner}-{timestamp}.{extension}");
    let target_path = target_dir.join(&stored_name);
    fs::write(&target_path, &bytes).map_err(|error| error.to_string())?;

    Ok(MediaSaveResult {
        stored_name: stored_name.clone(),
        relative_path: format!("media/{owner}/{stored_name}"),
        full_path: target_path.to_string_lossy().to_string(),
        size_bytes: bytes.len(),
    })
}

#[tauri::command]
fn export_text_file_with_dialog(app: AppHandle, file_name: String, contents: String, category: String) -> Result<Option<String>, String> {
    let paths = build_user_paths(&app, true)?;
    let target_dir = export_category_dir(&paths, &category);
    fs::create_dir_all(&target_dir).map_err(|error| error.to_string())?;

    let safe_name = safe_file_name(&file_name);
    let mut dialog = rfd::FileDialog::new().set_directory(&target_dir).set_file_name(safe_name);
    let lower = file_name.to_ascii_lowercase();
    if lower.ends_with(".csv") {
        dialog = dialog.add_filter("CSV", &["csv"]);
    } else if lower.ends_with(".txt") {
        dialog = dialog.add_filter("Text", &["txt"]);
    }

    let Some(path) = dialog.save_file() else {
        return Ok(None);
    };

    fs::write(&path, contents.as_bytes()).map_err(|error| error.to_string())?;
    Ok(Some(path.to_string_lossy().to_string()))
}

#[tauri::command]
fn open_bloomia_app_data_dir(app: AppHandle) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    os_open(&app_data_dir)
}

#[tauri::command]
fn open_bloomia_known_dir(app: AppHandle, kind: String) -> Result<(), String> {
    let status = build_app_status(&app)?;
    let paths = build_user_paths(&app, true)?;
    let target = match kind.as_str() {
        "app_data" => PathBuf::from(status.app_data_dir),
        "media" => PathBuf::from(status.media_dir),
        "backup" => PathBuf::from(status.backup_dir),
        "documents" => PathBuf::from(paths.documents_dir),
        "bloomia" => PathBuf::from(paths.bloomia_dir),
        "exports" => PathBuf::from(paths.exports_dir),
        "reports" => PathBuf::from(paths.reports_dir),
        "invoices" => PathBuf::from(paths.invoices_dir),
        "orders" => PathBuf::from(paths.orders_dir),
        "inventory" => PathBuf::from(paths.inventory_dir),
        "user_backups" => PathBuf::from(paths.user_backups_dir),
        "imports" => PathBuf::from(paths.imports_dir),
        _ => return Err("Unknown Bloomia folder kind".to_string()),
    };
    os_open(&target)
}

#[tauri::command]
fn open_path(path: String) -> Result<(), String> {
    let target = PathBuf::from(path);
    if !target.exists() {
        return Err("Path does not exist".to_string());
    }
    os_open(&target)
}

#[tauri::command]
fn reveal_path(path: String) -> Result<(), String> {
    let target = PathBuf::from(path);
    if target.is_dir() {
        return os_open(&target);
    }
    if let Some(parent) = target.parent() {
        return os_open(parent);
    }
    Err("Cannot reveal this path".to_string())
}

#[tauri::command]
fn list_local_printers() -> Result<Vec<String>, String> {
    #[cfg(target_os = "windows")]
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", "Get-Printer | Select-Object -ExpandProperty Name"])
        .output()
        .map_err(|error| error.to_string())?;

    #[cfg(target_os = "macos")]
    let output = Command::new("lpstat").args(["-p"]).output().map_err(|error| error.to_string())?;

    #[cfg(all(unix, not(target_os = "macos")))]
    let output = Command::new("lpstat").args(["-a"]).output().map_err(|error| error.to_string())?;

    if !output.status.success() {
        return Ok(Vec::new());
    }

    let text = String::from_utf8_lossy(&output.stdout);
    let printers = text.lines().filter_map(parse_printer_line).collect::<Vec<String>>();
    Ok(printers)
}

fn apply_pending_restore(app: &AppHandle) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    let pending_path = pending_restore_path(&app_data_dir);
    if !pending_path.exists() {
        return Ok(());
    }
    let database_path = app_data_dir.join("bloomia.db");
    let backup_dir = app_data_dir.join("backups");
    fs::create_dir_all(&backup_dir).map_err(|error| error.to_string())?;
    if database_path.exists() {
        let timestamp = unix_timestamp()?;
        let before_restore = backup_dir.join(format!("bloomia-before-restore-{timestamp}.db"));
        fs::copy(&database_path, before_restore).map_err(|error| error.to_string())?;
    }
    fs::copy(&pending_path, &database_path).map_err(|error| error.to_string())?;
    fs::remove_file(pending_path).map_err(|error| error.to_string())?;
    Ok(())
}

fn stage_database_restore(app: &AppHandle, source: &Path) -> Result<String, String> {
    if !source.exists() {
        return Err("Backup file does not exist".to_string());
    }
    let is_db = source
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("db"))
        .unwrap_or(false);
    if !is_db {
        return Err("Backup file must be a .db file".to_string());
    }

    let status = build_app_status(app)?;
    let database_path = PathBuf::from(&status.database_path);
    if database_path.exists() {
        backup_bloomia_database(app.clone())?;
    }
    let pending_path = pending_restore_path(&PathBuf::from(&status.app_data_dir));
    fs::copy(source, &pending_path).map_err(|error| error.to_string())?;
    Ok(pending_path.to_string_lossy().to_string())
}

fn build_app_status(app: &AppHandle) -> Result<BloomiaAppStatus, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    let media_dir = app_data_dir.join("media");
    let backup_dir = app_data_dir.join("backups");
    fs::create_dir_all(&media_dir).map_err(|error| error.to_string())?;
    fs::create_dir_all(&backup_dir).map_err(|error| error.to_string())?;
    let database_path = app_data_dir.join("bloomia.db");
    let pending_restore_exists = pending_restore_path(&app_data_dir).exists();

    Ok(BloomiaAppStatus {
        app_data_dir: app_data_dir.to_string_lossy().to_string(),
        database_path: database_path.to_string_lossy().to_string(),
        media_dir: media_dir.to_string_lossy().to_string(),
        backup_dir: backup_dir.to_string_lossy().to_string(),
        database_exists: database_path.exists(),
        pending_restore_exists,
    })
}

fn build_user_paths(app: &AppHandle, create: bool) -> Result<BloomiaUserPaths, String> {
    let documents_dir = user_documents_dir(app)?;
    let bloomia_dir = documents_dir.join("Bloomia");
    let exports_dir = bloomia_dir.join("Exports");
    let reports_dir = exports_dir.join("reports");
    let invoices_dir = exports_dir.join("invoices");
    let orders_dir = exports_dir.join("orders");
    let inventory_dir = exports_dir.join("inventory");
    let user_backups_dir = bloomia_dir.join("Backups");
    let imports_dir = bloomia_dir.join("Imports");

    if create {
        for dir in [&bloomia_dir, &exports_dir, &reports_dir, &invoices_dir, &orders_dir, &inventory_dir, &user_backups_dir, &imports_dir] {
            fs::create_dir_all(dir).map_err(|error| error.to_string())?;
        }
    }

    Ok(BloomiaUserPaths {
        documents_dir: documents_dir.to_string_lossy().to_string(),
        bloomia_dir: bloomia_dir.to_string_lossy().to_string(),
        exports_dir: exports_dir.to_string_lossy().to_string(),
        reports_dir: reports_dir.to_string_lossy().to_string(),
        invoices_dir: invoices_dir.to_string_lossy().to_string(),
        orders_dir: orders_dir.to_string_lossy().to_string(),
        inventory_dir: inventory_dir.to_string_lossy().to_string(),
        user_backups_dir: user_backups_dir.to_string_lossy().to_string(),
        imports_dir: imports_dir.to_string_lossy().to_string(),
    })
}

fn user_documents_dir(app: &AppHandle) -> Result<PathBuf, String> {
    if let Ok(path) = app.path().document_dir() {
        return Ok(path);
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(profile) = env::var("USERPROFILE") {
            return Ok(PathBuf::from(profile).join("Documents"));
        }
    }

    if let Ok(home) = env::var("HOME") {
        return Ok(PathBuf::from(home).join("Documents"));
    }

    Err("Cannot resolve user Documents folder".to_string())
}

fn export_category_dir(paths: &BloomiaUserPaths, category: &str) -> PathBuf {
    match category {
        "reports" => PathBuf::from(&paths.reports_dir),
        "invoices" => PathBuf::from(&paths.invoices_dir),
        "orders" => PathBuf::from(&paths.orders_dir),
        "inventory" => PathBuf::from(&paths.inventory_dir),
        _ => PathBuf::from(&paths.exports_dir),
    }
}

fn pending_restore_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join("restore-pending.db")
}

fn unix_timestamp() -> Result<u64, String> {
    Ok(SystemTime::now().duration_since(UNIX_EPOCH).map_err(|error| error.to_string())?.as_secs())
}

fn safe_owner_type(value: &str) -> Result<String, String> {
    match value {
        "shop" | "items" | "recipes" | "orders" | "customers" => Ok(value.to_string()),
        _ => Err("Unsupported media owner type".to_string()),
    }
}

fn safe_extension(file_name: &str) -> Result<String, String> {
    let extension = file_name.rsplit('.').next().unwrap_or("").to_ascii_lowercase();
    match extension.as_str() {
        "png" | "jpg" | "jpeg" | "webp" => Ok(extension),
        _ => Err("Only png, jpg, jpeg and webp images are allowed".to_string()),
    }
}

fn safe_file_name(value: &str) -> String {
    let cleaned = value
        .chars()
        .map(|ch| match ch {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '-',
            _ => ch,
        })
        .collect::<String>()
        .trim()
        .trim_matches('.')
        .to_string();

    if cleaned.is_empty() {
        "bloomia-export.csv".to_string()
    } else {
        cleaned
    }
}

fn os_open(path: &Path) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|error| error.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|error| error.to_string())?;
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn parse_printer_line(line: &str) -> Option<String> {
    let clean = line.trim();
    if clean.is_empty() {
        return None;
    }

    #[cfg(target_os = "windows")]
    return Some(clean.to_string());

    #[cfg(target_os = "macos")]
    return clean.strip_prefix("printer ").and_then(|rest| rest.split_whitespace().next()).map(String::from);

    #[cfg(all(unix, not(target_os = "macos")))]
    return clean.split_whitespace().next().map(String::from);
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            apply_pending_restore(app.handle()).map_err(|error| io::Error::new(io::ErrorKind::Other, error))?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_bloomia_app_status,
            get_bloomia_user_paths,
            ensure_bloomia_user_dirs,
            backup_bloomia_database,
            export_current_database_backup_to_documents,
            list_bloomia_backups,
            stage_bloomia_database_restore,
            stage_bloomia_database_restore_from_dialog,
            save_bloomia_media,
            export_text_file_with_dialog,
            open_bloomia_app_data_dir,
            open_bloomia_known_dir,
            open_path,
            reveal_path,
            list_local_printers,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Bloomia");
}
