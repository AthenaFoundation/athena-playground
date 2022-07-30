
use axum::http::{header, HeaderValue, Method};

use axum::routing::{get_service, post, MethodRouter};
use axum::{Json, Router};


use std::path::{PathBuf};

use std::time::Duration;

use tower_http::cors::{self, CorsLayer};
use tower_http::services::{ServeDir};
use tower_http::set_header::SetResponseHeader;


use crate::athena_sandbox::Sandbox;
use crate::{
    athena_sandbox::{AthenaExecResult, AthenaFileInput},
    Config,
};

async fn athena_exec_handler(Json(payload): Json<AthenaFileInput>) -> Json<AthenaExecResult> {
    let ath_file = payload.set_random_name();
    let mut sb = Sandbox::new(ath_file).await;
    let sb_file_path = sb.athfile_with_ext();

    sb.write_ath_module().await;
    if !sb_file_path.exists() {
        return Json(AthenaExecResult {
            err: true,
            message: format!(
                "Path {} does not exist",
                sb_file_path.as_os_str().to_string_lossy()
            ),
        });
    }

    let mut cmd = sb.generate_run_command();
    sb.execute(&mut cmd);


    let output = sb.wait_on_cmd(cmd).await;
    
    sb.shutdown().await;
   
    let mut res = AthenaExecResult {
        err: false,
        message: String::new(),
    };

 
    let first_line_rm = output.lines().position(|l| {l.contains("Loading")});
    let output = if let Some(first_line_num) = first_line_rm {
        // Safe to unwrap here because, at worst, last_line_rm == first_line_rm
        let last_line_num = output.lines().collect::<Vec<_>>().iter()
            .rposition(|&l| {
                l.contains("Loading")
            }).unwrap();
           
        let output = output.lines()
            .enumerate()
            .filter_map(|(idx, l)| {
                if (idx >= first_line_num && idx < last_line_num) || (idx <= last_line_num && idx > first_line_num) {
                   
                    None
                } else {
                    Some(l)
                }
            })
            .skip(9)
            .collect::<String>();
        output.as_bytes()
            .chunks(10)
            .map(|buf| {
                unsafe { std::str::from_utf8_unchecked(buf) }
            })
            .map(|s| {
                if s.contains("New") || s.contains("The") || s.contains("Module") {
                    let s0 = s.find("New");
                    let s1 = s.find("The");
                    let s2 = s.find("Module");

                    if let Some(idx) = s0 {
                            let mut s = s.to_string();
                            s.insert(idx, '\n');
                            s
                    } else if let Some(idx) = s1 {
                        let mut s = s.to_string();
                        s.insert(idx, '\n');
                        s
                    } else if let Some(idx) = s2 {
                        let mut s = s.to_string();
                        s.insert(idx, '\n');
                        s
                    } else {
                        s.to_string()
                    }
                    
                } else {
                    s.to_string()
                }
        }).collect::<String>()

     
    } else {
        output
    };
    
    res.message = output;

    Json(res)
}

fn static_file_service(root: impl AsRef<std::path::Path>, max_age: HeaderValue) -> MethodRouter {
    let files = ServeDir::new(root).precompressed_gzip();

    let with_caching = SetResponseHeader::if_not_present(files, header::CACHE_CONTROL, max_age);

    get_service(with_caching)
        .handle_error(|e| async move { format!("Unhandled internal error: {}", e) })
}
const ONE_HOUR: Duration = Duration::from_secs(60 * 60);
const CORS_CACHE_TIME_TO_LIVE: Duration = ONE_HOUR;

#[tokio::main]
pub(crate) async fn serve(cfg: Config) {
    let max_age_one_day = HeaderValue::from_static("public, max-age=86400");
    let root_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("frontend")
        .join("dist");
    let root_files = static_file_service(root_path, max_age_one_day);
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
