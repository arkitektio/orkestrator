use httparse;
use httparse::Request;
use std::future::{poll_fn, IntoFuture};
use std::io::Cursor;
use std::{
    borrow::Cow,
    error::Error,
    io::{Read, Write},
    net::{SocketAddr, TcpListener, TcpStream},
    result, thread,
};
use tauri::command;
use tauri::Manager;
use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};
use tauri::{utils::config::AppUrl, window::WindowBuilder, WindowUrl};

use tokio::time::{sleep, Duration};
use std::sync::{Arc, Mutex};
use tokio::task::JoinHandle;
use crate::SharedState;
use std::future::Future;
use tokio::net::UdpSocket;
use tokio::time::timeout;

type DownloadResult<T> = std::result::Result<T, Box<dyn std::error::Error + Send + Sync>>;
const EXIT: [u8; 4] = [1, 3, 3, 7];
/// The optional server config.
#[derive(Default, serde::Deserialize)]
pub struct OauthConfig {
    /// An array of hard-coded ports the server should try to bind to.
    /// This should only be used if your oauth provider does not accept wildcard localhost addresses.
    ///
    /// Default: Asks the system for a free port.
    pub ports: Option<Vec<u16>>,
    /// Optional static html string send to the user after being redirected.
    /// Keep it self-contained and as small as possible.
    ///
    /// Default: `"<html><body>Please return to the app.</body></html>"`.
    pub response: Option<Cow<'static, str>>,
    
}


#[derive(Default, serde::Deserialize)]
pub struct FaktsConfig {
    /// An array of hard-coded ports the server should try to bind to.
    /// This should only be used if your oauth provider does not accept wildcard localhost addresses.
    ///
    /// Default: Asks the system for a free port.
    pub port: Option<u16>,
    /// Optional static html string send to the user after being redirected.
    /// Keep it self-contained and as small as possible.
    ///
    /// Default: `"<html><body>Please return to the app.</body></html>"`
    pub magic_word: Option<Cow<'static, str>>,
    pub wait_duration: Option<u64>
}

#[derive(serde::Deserialize, serde::Serialize, Debug, Clone)]
pub struct Beacon {
    pub url: String,
}


/// Starts the localhost (using 127.0.0.1) server. Returns the port its listening on.
///
/// Because of the unprotected localhost port, you _must_ verify the URL in the handler function.
///
/// # Arguments
///
/// * `config` - Configuration the server should use, see [`OauthConfig.]
/// * `handler` - Closure which will be executed on a successful connection. It receives the full URL as a String.
///
/// # Errors
///
/// - Returns `std::io::Error` if the server creation fails.
///
/// # Panics
///
/// The seperate server thread can panic if its unable to send the html response to the client. This may change after more real world testing.
pub fn start_with_config<F: FnMut(String) + Send + 'static>(
    config: OauthConfig,
    mut handler: F,
) -> Result<u16, std::io::Error> {
    let listener = match config.ports {
        Some(ports) => TcpListener::bind(
            ports
                .iter()
                .map(|p| SocketAddr::from(([127, 0, 0, 1], *p)))
                .collect::<Vec<SocketAddr>>()
                .as_slice(),
        ),
        None => TcpListener::bind(SocketAddr::from(([127, 0, 0, 1], 0))),
    }?;



    let port = listener.local_addr()?.port();

    thread::spawn(move || {
        for conn in listener.incoming() {
            match conn {
                Ok(conn) => {
                    if let Some(url) = handle_connection(conn, config.response.as_deref(), port) {
                        // Using an empty string to communicate that a shutdown was requested.
                        if !url.is_empty() {
                            handler(url);
                        }
                        // TODO: Check if exiting here is always okay.
                        break;
                    }
                }
                Err(err) => {
                    println!("Error reading incoming connection: {}", err.to_string());
                }
            }
        }
    });

    Ok(port)
}

fn handle_connection(mut conn: TcpStream, response: Option<&str>, port: u16) -> Option<String> {
    let mut buffer = [0; 4048];
    if let Err(io_err) = conn.read(&mut buffer) {
        println!("Error reading incoming connection: {}", io_err.to_string());
    };
    if buffer[..4] == EXIT {
        return Some(String::new());
    }

    let mut headers = [httparse::EMPTY_HEADER; 16];
    let mut request = httparse::Request::new(&mut headers);
    request.parse(&buffer).ok()?;

    let path = request.path.unwrap_or_default();

    if path == "/exit" {
        return Some(String::new());
    };

    let mut is_localhost = false;

    for header in &headers {
        if header.name == "Full-Url" {
            return Some(String::from_utf8_lossy(header.value).to_string());
        } else if header.name == "Host" {
            is_localhost = String::from_utf8_lossy(header.value).starts_with("localhost");
        }
    }
    if path == "/cb" {
        println!(
            "Client fetched callback path but the request didn't contain the expected header."
        );
    }

    let script = format!(
        r#"<script>fetch("http://{}:{}/cb",{{headers:{{"Full-Url":window.location.href}}}})</script>"#,
        if is_localhost {
            "localhost"
        } else {
            "127.0.0.1"
        },
        port
    );
    let response = match response {
        Some(s) if s.contains("<head>") => s.replace("<head>", &format!("<head>{}", script)),
        Some(s) if s.contains("<body>") => {
            s.replace("<body>", &format!("<head>{}</head><body>", script))
        }
        Some(s) => {
            println!(
                "`response` does not contain a body or head element. Prepending a head element..."
            );
            format!("<head>{}</head>{}", script, s)
        }
        None => format!(
            "<html><head>{}</head><body>Please return to the app.</body></html>",
            script
        ),
    };

    // TODO: Test if unwrapping here is safe (enough).
    conn.write_all(
        format!(
            "HTTP/1.1 200 OK\r\nContent-Length: {}\r\n\r\n{}",
            response.len(),
            response
        )
        .as_bytes(),
    )
    .unwrap();
    conn.flush().unwrap();

    None
}

/// Stops the currently running server behind the provided port without executing the handler.
/// Alternatively you can send a request to http://127.0.0.1:port/exit
///
/// # Errors
///
/// - Returns `std::io::Error` if the server couldn't be reached.
pub fn cancel_listen(port: u16) -> Result<(), std::io::Error> {
    // Using tcp instead of something global-ish like an AtomicBool,
    // so we don't have to dive into the set_nonblocking madness.
    let mut stream = TcpStream::connect(SocketAddr::from(([127, 0, 0, 1], port)))?;
    stream.write_all(&EXIT)?;
    stream.flush()?;

    Ok(())
}

#[tauri::command]
pub fn oauth_start(app: tauri::AppHandle, config: Option<OauthConfig>) -> Result<u16, String> {
    let config = config.unwrap_or_default();
    

    start_with_config(config, move |url| match url::Url::parse(&url) {
        Ok(_) => {
            let windows = app.windows();
            let window = windows.get("orkestrator").unwrap();

            if let Err(emit_err) = window.emit("oauth://url", url) {
                println!("Error emitting oauth://url event: {}", emit_err)
            };

            // let loginwindow = windows.get("login").unwrap();
            // loginwindow.hide().unwrap();
        }
        Err(err) => {
            let windows = app.windows();
            let window = windows.get("orkestrator").unwrap();

            if let Err(emit_err) = window.emit("oauth://invalid-url", err.to_string()) {
                println!("Error emitting oauth://invalid-url event: {}", emit_err)
            };

            // let loginwindow = windows.get("login").unwrap();
            // loginwindow.hide().unwrap();
        }
    })
    .map_err(|err| err.to_string())
}

#[tauri::command]
pub fn oauth_cancel(port: u16) -> Result<(), String> {
    cancel_listen(port).map_err(|err| err.to_string())
}





#[tauri::command]
pub async fn fakts_start(app: tauri::AppHandle, state: tauri::State<'_, SharedState>, config: Option<FaktsConfig>) -> Result<Vec<Beacon>, String> {
    let config = config.unwrap_or_default();

    // Bind to the UDP socket
    let socket = match UdpSocket::bind("0.0.0.0:45678").await {
        Ok(s) => s,
        Err(e) => return Err(format!("couldn't bind socket: {}", e)),
    };

    let mut buf = [0u8; 1500];
    let mut beacons = Vec::new();

    let duration = Duration::from_secs(config.wait_duration.unwrap_or(10));
    let start_time = tokio::time::Instant::now();

    loop {
        // Check if the specified duration has elapsed
        if start_time.elapsed() >= duration {
            break;
        }

        // Calculate the remaining time to listen
        let remaining_time = duration - start_time.elapsed();

        // Wait for data with a timeout based on the remaining time
        match timeout(remaining_time, socket.recv_from(&mut buf)).await {
            Ok(Ok((amt, _src))) => {
                let data = &buf[..amt];
                if let Ok(s) = std::str::from_utf8(data) {
                    if s.starts_with("beacon-fakts") {
                        if let Ok(x) = serde_json::from_str::<Beacon>(s.strip_prefix("beacon-fakts").unwrap()) {
                            beacons.push(x);
                        }
                    }
                }
            }
            // Handle timeout or other errors
            Err(_) | Ok(Err(_)) => break,
        }
    }

    println!("Done collecting beacons");
    Ok(beacons)


}

#[tauri::command]
pub async fn fakts_cancel( state: tauri::State<'_, SharedState>) -> Result<String, String> {
    let mut handle_storage = state.task_handle.lock().unwrap();
    if let Some(handle) = handle_storage.take() {
        handle.abort(); // This will attempt to cancel the task
        return Ok("Cancelled".to_string());
    }
    *handle_storage = None;


    Ok("Nothing to cancel".to_string())
}




#[tauri::command]
pub async fn upload_file(
    file: std::path::PathBuf,
    url: String,
    key: String,
    bucket: String,
    amz_algorithm: String,
    amz_credential: String,
    amz_date: String,
    amz_signature: String,
    policy: String,
) -> Result<String, String> {
    // ^We expect the frontend to send a file path.

    let client = reqwest::Client::new();
    let copy_key = key.clone();

    let file_name = file.file_name().unwrap().to_string_lossy().to_string();
    let file_content = tokio::fs::read(file).await.map_err(|err| err.to_string())?;
    let part = reqwest::multipart::Part::bytes(file_content).file_name(file_name);

    let form = reqwest::multipart::Form::new()
        .part("file", part)
        .text("key", key)
        .text("bucket", bucket)
        .text("X-Amz-Algorithm", amz_algorithm)
        .text("X-Amz-Credential", amz_credential)
        .text("X-Amz-Date", amz_date)
        .text("X-Amz_Signature", amz_signature)
        .text("Policy", policy);

    let cresult = client.post(url).multipart(form).send().await;

    match cresult {
        Ok(_) => Ok(copy_key),
        Err(e) => Err(e.to_string()),
    }
}

async fn download_with_rekuest(file: std::path::PathBuf, url: String) -> DownloadResult<()> {
    let response = reqwest::get(url).await?;
    let mut file = std::fs::File::create(file)?;
    let mut content = Cursor::new(response.bytes().await?);
    std::io::copy(&mut content, &mut file)?;
    Ok(())
}

#[tauri::command]
pub async fn download_file(file: std::path::PathBuf, url: String) -> Result<String, String> {
    // ^We expect the frontend to send a file path.
    let x = download_with_rekuest(file, url).await;

    match x {
        Ok(_) => Ok("done".to_string()),
        Err(e) => Err(e.to_string()),
    }
}
