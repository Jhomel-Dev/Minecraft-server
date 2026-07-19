use tauri::{AppHandle, Emitter, Manager};
use std::process::Command;
use std::path::PathBuf;
use std::time::Duration;

#[tauri::command]
async fn request_shutdown(app_handle: tauri::AppHandle) -> Result<(), String> {
    reqwest::Client::new()
        .post("http://127.0.0.1:45987/shutdown")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    
    app_handle.exit(0);
    Ok(())
}

#[tauri::command]
async fn request_refresh_pin() -> Result<(), String> {
    reqwest::Client::new()
        .post("http://127.0.0.1:45987/shutdown")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn request_unlink() -> Result<(), String> {
    reqwest::Client::new()
        .post("http://127.0.0.1:45987/unlink")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(target_os = "linux")]
const AGENT_BIN: &[u8] = include_bytes!("../bin/agentcore-x86_64-unknown-linux-gnu");

#[cfg(target_os = "windows")]
const AGENT_BIN: &[u8] = include_bytes!("../bin/agentcore-x86_64-pc-windows-msvc.exe");

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
const AGENT_BIN: &[u8] = &[];

fn spawn_detached_agent(app_handle: &AppHandle) {
    if AGENT_BIN.is_empty() {
        return;
    }
    
    let Ok(app_data) = app_handle.path().app_data_dir() else { return; };
    let _ = std::fs::create_dir_all(&app_data);
    
    let file_name = if cfg!(target_os = "windows") { "agentcore.exe" } else { "agentcore" };
    let path = app_data.join(file_name);
    
    // Only write if it doesn't exist or if we want to overwrite with latest (overwrite to be safe)
    let _ = std::fs::write(&path, AGENT_BIN);
    
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = std::fs::metadata(&path) {
            let mut perms = metadata.permissions();
            perms.set_mode(perms.mode() | 0o111);
            let _ = std::fs::set_permissions(&path, perms);
        }
    }
    
    let mut cmd = Command::new(&path);
    
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x00000008 | 0x08000000);
    }
    
    let _ = cmd.spawn();
}

async fn poll_agent_status(app_handle: &AppHandle, client: &reqwest::Client) {
    let Ok(res) = client.get("http://127.0.0.1:45987/status").send().await else {
        let _ = app_handle.emit("agent-state-changed", r#"{"status":"offline"}"#);
        spawn_detached_agent(app_handle);
        return;
    };

    let Ok(json) = res.text().await else {
        return;
    };

    let _ = app_handle.emit("agent-state-changed", json);
}

fn start_agent_polling_loop(app_handle: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(1))
            .build()
            .unwrap_or_default();
            
        loop {
            poll_agent_status(&app_handle, &client).await;
            tokio::time::sleep(Duration::from_secs(2)).await;
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        std::env::set_var("GDK_BACKEND", "x11");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            request_shutdown,
            request_refresh_pin,
            request_unlink
        ])
        .setup(|app| {
            start_agent_polling_loop(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
