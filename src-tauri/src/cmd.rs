use httparse;
use httparse::Request;
use std::{
    borrow::Cow,
    io::{Read, Write},
    net::{SocketAddr, TcpListener, TcpStream},
    thread,
};
use tauri::command;
use tauri::Manager;
use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};
use tauri::{utils::config::AppUrl, window::WindowBuilder, WindowUrl};
use tokio::net::UdpSocket;
use tokio::time::{sleep, Duration};

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
