#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::fs;
use std::path::PathBuf;
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

fn build_app_status(app: &AppHandle) -> Result<BloomiaAppStatus, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    let media_dir = app_data_dir.join("media");
    let backup_dir = app_data_dir.join("backups");
    fs::create_dir_all(&media_dir).map_err(|error| error.to_string())?;
    fs::create_dir_all(&backup_dir).map_err(|error| error.to_string())?;
    let database_path = app_data_dir.join("bloomia.db");

    Ok(BloomiaAppStatus {
        app_data_dir: app_data_dir.to_string_lossy().to_string(),
        database_path: database_path.to_string_lossy().to_string(),
        media_dir: media_dir.to_string_lossy().to_string(),
        backup_dir: backup_dir.to_string_lossy().to_string(),
        database_exists: database_path.exists(),
    })
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
        .invoke_handler(tauri::generate_handler![
            get_bloomia_app_status,
            backup_bloomia_database,
            list_bloomia_backups,
            save_bloomia_media,
            list_local_printers,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Bloomia");
}
