use tauri::{Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

#[tauri::command]
fn start_agent(app_handle: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let (mut rx, mut _child) = app_handle
            .shell()
            .sidecar("agentcore")
            .expect("Failed to create sidecar command")
            .spawn()
            .expect("Failed to spawn sidecar");

        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) | CommandEvent::Stderr(line) => {
                    let text = String::from_utf8_lossy(&line);
                    app_handle.emit("agent-log", text.to_string()).unwrap();
                }
                CommandEvent::Terminated(_) => {
                    app_handle.emit("agent-terminated", ()).unwrap();
                }
                _ => {}
            }
        }
    });
}

#[tauri::command]
fn check_env() -> bool {
    let home_dir = dirs::home_dir().expect("Could not find home directory");
    let env_path = home_dir.join(".env");
    env_path.exists()
}

#[tauri::command]
fn save_env(token: String) -> Result<(), String> {
    let home_dir = dirs::home_dir().expect("Could not find home directory");
    let env_path = home_dir.join(".env");
    let content = format!("API_TOKEN={}", token);
    std::fs::write(env_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn api_pair() -> Result<String, String> {
    let client = reqwest::Client::new();
    let res = client.post("https://minecraft-server-pl80.onrender.com/api/agent/pairing/request")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    res.text().await.map_err(|e| e.to_string())
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
        .invoke_handler(tauri::generate_handler![start_agent, check_env, save_env, api_pair])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
