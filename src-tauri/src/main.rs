#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod cmd;
use serde::Serialize;
use serde_derive::Deserialize;
use tauri::Manager;
use tauri::{utils::config::AppUrl, window::WindowBuilder, WindowUrl};
use tauri::{CustomMenuItem, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};

use tokio::net::UdpSocket;
use tokio::time::{sleep, Duration};
// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn login(app: tauri::AppHandle, url: &str) -> String {
    let windows = app.windows();
    let window = windows.get("login").unwrap();
    window.show().unwrap();
    window
        .eval(format!("window.location.replace('{url}')").as_str())
        .unwrap();
    println!("login");
    "Hello, world!".to_string()
}

#[derive(Deserialize, Serialize, Debug, Clone)]
struct Beacon {
    url: String,
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

            WindowBuilder::new(
                app,
                "login".to_string(),
                WindowUrl::External("http://localhost:3000/".parse().unwrap()),
            )
            .title("login")
            .visible(false)
            .disable_file_drop_handler()
            .build()?;

            let next_handle = app.handle();

            tauri::async_runtime::spawn(async move {
                // listen for udp broadcasts on port 8080
                let socket = UdpSocket::bind("0.0.0.0:45678").await;

                let socket = match socket {
                    Ok(s) => s,
                    Err(e) => {
                        next_handle
                            .get_window("orkestrator")
                            .unwrap()
                            .emit("bind-error", e.to_string())
                            .unwrap();
                        panic!("couldn't bind socket: {:?}", e)
                    }
                };

                // receive a single datagram
                let mut buf = [0u8; 1500];

                while let Ok((amt, src)) = socket.recv_from(&mut buf).await {
                    let data = &buf[..amt];
                    let s = std::str::from_utf8(data).unwrap();
                    println!("received {} bytes from {}", amt, src);
                    println!("received {}", s);

                    if s.starts_with("beacon-fakts") {
                        let x: Beacon =
                            serde_json::from_str(s.strip_prefix("beacon-fakts").unwrap()).unwrap();

                        let window = next_handle.get_window("orkestrator");

                        match window {
                            Some(w) => {
                                w.emit("fakts", x).unwrap();
                            }
                            None => {
                                println!("no window");
                                break;
                            }
                        }
                    }
                    sleep(Duration::from_millis(100)).await;
                }

                println!("Done here");
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            login,
            cmd::oauth_start,
            cmd::oauth_cancel,
        ])
        .run(context)
        .expect("error while running tauri application");
}
