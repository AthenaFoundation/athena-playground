pub(crate) mod athena_sandbox;
mod server;
use std::{env, net::SocketAddr, path::PathBuf};
const DEFAULT_ADDRESS: &str = "127.0.0.1";
const DEFAULT_PORT: u16 = 3000;
const DEFAULT_ATH_FILE_PATH: &str = "/temp-ath-files";
pub struct Config {
    address: String,
    port: u16,
    ath_file_path: PathBuf,
}

impl Config {
    fn addr(&self) -> SocketAddr {
        let addr = self
            .address
            .parse()
            .expect("Unable to parse socket address");
        SocketAddr::new(addr, self.port)
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            address: DEFAULT_ADDRESS.to_string(),
            port: DEFAULT_PORT,
            ath_file_path: PathBuf::from(DEFAULT_ATH_FILE_PATH),
        }
    }
}

fn main() {
    let mut config = Config::default();
    config.ath_file_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("temp-ath-files");

    server::serve(config);
}
