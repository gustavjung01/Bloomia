#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;

#[tauri::command]
fn list_local_printers() -> Result<Vec<String>, String> {
    #[cfg(target_os = "windows")]
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "Get-Printer | Select-Object -ExpandProperty Name",
        ])
        .output()
        .map_err(|error| error.to_string())?;

    #[cfg(target_os = "macos")]
    let output = Command::new("lpstat")
        .args(["-p"])
        .output()
        .map_err(|error| error.to_string())?;

    #[cfg(all(unix, not(target_os = "macos")))]
    let output = Command::new("lpstat")
        .args(["-a"])
        .output()
        .map_err(|error| error.to_string())?;

    if !output.status.success() {
        return Ok(Vec::new());
    }

    let text = String::from_utf8_lossy(&output.stdout);
    let printers = text
        .lines()
        .filter_map(parse_printer_line)
        .collect::<Vec<String>>();

    Ok(printers)
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
        .invoke_handler(tauri::generate_handler![list_local_printers])
        .run(tauri::generate_context!())
        .expect("error while running Bloomia");
}
