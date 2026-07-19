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

fn get_search_directories(app_handle: &AppHandle) -> Vec<PathBuf> {
    let mut paths = Vec::new();
    
    if let Ok(res_dir) = app_handle.path().resource_dir() {
        paths.push(res_dir.clone());
        paths.push(res_dir.join("bin"));
    }
    
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            paths.push(parent.to_path_buf());
        }
    }
    
    paths
}

fn find_agent_binary(dir: &PathBuf) -> Option<PathBuf> {
    let entries = std::fs::read_dir(dir).ok()?;
    
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with("agentcore") && !name.ends_with(".pdb") {
            return Some(entry.path());
        }
    }
    
    None
}

fn spawn_detached_agent(app_handle: &AppHandle) {
    let search_dirs = get_search_directories(app_handle);
    let binary_path = search_dirs.iter().find_map(find_agent_binary);
        
    let Some(path) = binary_path else {
        return;
    };
    
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = std::fs::metadata(&path) {
            let mut perms = metadata.permissions();
            perms.set_mode(perms.mode() | 0o111);
            let _ = std::fs::set_permissions(&path, perms);
        }
    }
    
    let mut cmd = Command::new(path);
    
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
