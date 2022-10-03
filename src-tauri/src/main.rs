#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]
use std::collections::HashMap;

use tauri::{http::ResponseBuilder, async_runtime::Sender};
use tauri::Manager;
use warp::Filter;
use serde_derive::Deserialize;

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

#[derive(Deserialize, Debug)]
struct Query {
    code: String,
}


fn main() {


    tauri::Builder::default()
        // .register_uri_scheme_protocol("arkitekt", |app, _re| {
        //     println!("Called on page load");
        //     app.windows()
        //         .get("main")
        //         .unwrap()
        //         .emit(
        //             "receive-login",
        //             serde_json::json!({
        //                 "url": "hallo"
        //             }),
        //         )
        //         .unwrap();
        //     ResponseBuilder::new()
        //         .status(202)
        //         .mimetype("text/html")
        //         .body("hello!".as_bytes().to_vec())
        // })
        
        .setup(|app| {
            // send a message to the renderer process
           
            let app_handle = app.handle();


            let routes = warp::any().and(warp::query::<Query>()).map(move |x: Query| {
                let window = app_handle.get_window("main").unwrap().emit("code", x.code);
                let login = app_handle.get_window("login").unwrap().hide();
                
                
                format!("Hello, World {}!", "nn")
        });


            tauri::async_runtime::spawn(async move {
                warp::serve(routes)
                .run(([127, 0, 0, 1], 3030))
                .await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .invoke_handler(tauri::generate_handler![login])
        .on_page_load(|wry_window, _payload| {
            println!("Called on page load");
            if wry_window.label() == "login" {
                wry_window
                    .emit_all(
                        "receive-login",
                        serde_json::json!({
                            "url": _payload.url()
                        }),
                    )
                    .unwrap();
                wry_window.hide().unwrap();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
