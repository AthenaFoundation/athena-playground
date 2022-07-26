use axum::http::{HeaderValue, header, Method, Response};
use axum::response::IntoResponse;
use axum::routing::{post, MethodRouter, get_service};
use axum::{response::Html, routing::get, Router, Json};
use tower_http::cors::{CorsLayer, self};
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::time::Duration;
use anyhow::{Result, anyhow};
use std::process::{Stdio, Command};
use std::io::Write;
use serde::{Serialize, Deserialize};
use uuid::Uuid;
use tower_http::services::{ServeDir, ServeFile};
use tower_http::set_header::SetResponseHeader;

use crate::athena_sandbox::Sandbox;
use crate::{Config, athena_sandbox::{AthenaFileInput, AthenaExecResult}};



async fn handler() -> Html<&'static str> {
    Html("<h1> Hello, World!</h1>")
}

async fn athena_exec_handler(Json(payload): Json<AthenaFileInput>) -> Json<AthenaExecResult> {
    let ath_file = payload.set_random_name();
    let sb = Sandbox::new(ath_file).await;
    let sb_file_path = sb.athfile_with_ext();
    println!("SB FILE PATH: {:?}", sb_file_path.as_os_str());
   
    sb.write_ath_module().await;
    if !sb_file_path.exists() {
        return Json(AthenaExecResult {
            err: true,
            message: format!("Path {} does not exist", sb_file_path.as_os_str().to_string_lossy())
        })
    }

    let dir = sb.dir();
    println!("DIR: {:#?}", &dir);
   
     let mut cmd = sb.generate_run_command();
     sb.execute(&mut cmd);
     println!("command: {:#?}", cmd);
     let output = cmd.stdout(Stdio::piped()).output().await;
    
    let mut res = AthenaExecResult {
        err: false,
        message: String::new()
    };
    match output {
        Ok(c) => {
           println!("Executing athena code");
            let msg = String::from_utf8_lossy(&c.stdout);
            res.message = msg.to_string();
           
        },
        Err(e) => {
            res.message = format!("{}", e);
        }
    }
    Json(res)
}

fn static_file_service(root: impl AsRef<std::path::Path>, max_age: HeaderValue) -> MethodRouter {
    let files = ServeDir::new(root).precompressed_gzip();

    let with_caching = SetResponseHeader::if_not_present(files, header::CACHE_CONTROL, max_age);

    get_service(with_caching).handle_error(|e| async move {
            format!("Unhandled internal error: {}", e)
    })
}
const ONE_HOUR: Duration = Duration::from_secs(60 * 60);
const CORS_CACHE_TIME_TO_LIVE: Duration = ONE_HOUR;
//const MAX_AGE_ONE_MIN: HeaderValue = HeaderValue::from_static("public, max-age=60");
const MAX_AGE_ONE_DAY: HeaderValue = HeaderValue::from_static("public, max-age=86400");
#[tokio::main]
pub(crate) async fn serve(cfg: Config) {
    let root_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("frontend").join("dist");
    let root_files = static_file_service(root_path, MAX_AGE_ONE_DAY);
    let app = Router::new()
    .fallback(root_files)
    .route("/athena", post(athena_exec_handler))
    .route("/api/athena", post(athena_exec_handler))
    .layer({
        CorsLayer::new()
            .allow_origin(cors::Any)
            .allow_headers([header::CONTENT_TYPE])
            .allow_methods([Method::GET, Method::POST])
            .allow_credentials(false)
            .max_age(CORS_CACHE_TIME_TO_LIVE)
    });


    axum::Server::bind(&cfg.addr())
        .serve(app.into_make_service())
        .await
        .unwrap();
}
