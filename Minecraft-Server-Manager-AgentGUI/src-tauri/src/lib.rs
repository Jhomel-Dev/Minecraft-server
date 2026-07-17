use tauri::{Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
                        CommandEvent::Stdout(line) => {
                            let text = String::from_utf8_lossy(&line);
                            // Detect if the agent outputs the PIN
                            if text.contains("Ingresa el siguiente PIN") {
                                if let Some(pin_part) = text.split("seguridad: ").last() {
                                    let pin = pin_part.trim();
                                    app_handle.emit("pin-generated", pin).unwrap();
                                }
                            }
                            app_handle.emit("agent-log", text.to_string()).unwrap();
                        }
                        CommandEvent::Stderr(line) => {
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

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
