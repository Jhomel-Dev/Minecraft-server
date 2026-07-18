use tauri::{Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

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
        .setup(|app| {
            let app_handle = app.handle().clone();
            
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
                            if text.contains("--->") && text.contains("<---") {
                                if let Some(pin_part) = text.split("--->").nth(1) {
                                    if let Some(pin) = pin_part.split("<---").next() {
                                        let clean_pin = pin.trim();
                                        if !clean_pin.is_empty() {
                                            app_handle.emit("pin-generated", clean_pin).unwrap();
                                        }
                                    }
                                }
                            }
                            app_handle.emit("agent-log", text.to_string()).unwrap();
                        }
                        CommandEvent::Terminated(_) => {
                            app_handle.emit("agent-terminated", ()).unwrap();
                        }
                        _ => {}
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
