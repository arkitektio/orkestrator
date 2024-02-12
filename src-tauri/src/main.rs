#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod cmd;
use serde::Serialize;
use serde_derive::Deserialize;
use tauri::async_runtime::JoinHandle;
use tauri::Manager;
use tauri::{utils::config::AppUrl, window::WindowBuilder, WindowUrl};
use tauri::{CustomMenuItem, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};

use tokio::net::UdpSocket;
use tokio::time::{sleep, Duration};
// // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
// #[tauri::command]
// fn greet(name: &str) -> String {
//     format!("Hello, {}! You've been greeted from Rust!", name)
// }

// #[tauri::command]
// fn login(app: tauri::AppHandle, url: &str) -> String {
//     let windows = app.windows();
//     let window = windows.get("login").unwrap();
//     window.show().unwrap();
//     window
//         .eval(format!("window.location.replace('{url}')").as_str())
//         .unwrap();
//     println!("login");
//     "Hello, world!".to_string()
// }

#[derive(Deserialize, Serialize, Debug, Clone)]
struct Beacon {
    url: String,
}

use std::sync::{Arc, Mutex};

pub struct SharedState {
    pub task_handle: Arc<Mutex<Option<JoinHandle<()>>>>,
}

impl Default for SharedState {
    fn default() -> Self {
        SharedState {
            task_handle: Arc::new(Mutex::new(None)),
        }
    }
}

fn main() {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let hide = CustomMenuItem::new("hide".to_string(), "Hide");
    let tray_menu = SystemTrayMenu::new()
        .add_item(quit)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(hide);

    let port = 6789;
    let tray = SystemTray::new().with_menu(tray_menu);

    let mut context = tauri::generate_context!();
    let url = format!("http://localhost:{}", port).parse().unwrap();
    let window_url = WindowUrl::External(url);
    // rewrite the config so the IPC is enabled on this URL
    context.config_mut().build.dist_dir = AppUrl::Url(window_url.clone());
    context.config_mut().build.dev_path = AppUrl::Url(window_url.clone());

    tauri::Builder::default()
        //     .register_uri_scheme_protocol("arkitekt", |app, _re| {
        //         println!("Called on page load");
        //         app.windows()
        //             .get("main")
        //             .unwrap()
        //             .emit(
        //                 "receive-login",
        //                 serde_json::json!({
        //                     "url": "hallo"
        //                 }),
        //             )
        //             .unwrap();
        //         Ok(Response::new(200, "OK"))
        //     })
        .manage(SharedState::default())
        .system_tray(tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick {
                position: _,
                size: _,
                ..
            } => {
                println!("system tray received a left click");
            }
            SystemTrayEvent::RightClick {
                position: _,
                size: _,
                ..
            } => {
                println!("system tray received a right click");
            }
            SystemTrayEvent::DoubleClick {
                position: _,
                size: _,
                ..
            } => {
                println!("system tray received a double click");
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "quit" => {
                    std::process::exit(0);
                }
                "hide" => {
                    let window = app.get_window("orkestrator").unwrap();
                    window.hide().unwrap();
                }
                _ => {}
            },
            _ => {}
        })
        .plugin(tauri_plugin_localhost::Builder::new(port).build())
        .setup(move |app| {
            WindowBuilder::new(app, "orkestrator".to_string(), window_url)
                .title("orkestrator")
                .disable_file_drop_handler()
                .build()?;

            // WindowBuilder::new(
            //     app,
            //     "login".to_string(),
            //     WindowUrl::External("http://localhost:3000/".parse().unwrap()),
            // )
            // .title("login")
            // .visible(false)
            // .disable_file_drop_handler()
            // .build()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            cmd::oauth_start,
            cmd::upload_file,
            cmd::download_file,
            cmd::fakts_cancel,
            cmd::fakts_start,
            cmd::oauth_cancel,
        ])
        .run(context)
        .expect("error while running tauri application");
}
