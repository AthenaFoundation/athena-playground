use std::{path::{PathBuf, Path}, ffi::OsString};

use tokio::process::Command;
use serde::{Serialize, Deserialize};
use tempfile::{self, TempDir};
use uuid::Uuid;
use crate::Config;



#[derive(Deserialize, Default)]
pub struct AthenaFileInput {
    pub ath: String,
    #[serde(default)]
    pub name: String,
}


pub struct Sandbox {
    file: AthenaFileInput,
    container_id: Option<String>,
    dir: TempDir
}

impl Sandbox {

    pub fn athfile(&self) -> PathBuf {
        self.dir.path().join(self.file.name())
    }

    pub fn athfile_with_ext(&self) -> PathBuf {
        self.dir.path().join(self.file.name_with_ext())
    }

    pub fn dir(&self) -> &Path {
        self.dir.path()
    }

    pub async fn new(f: AthenaFileInput) -> Self {
        let temp_dir = tempfile::Builder::new()
            .prefix("temp-ath")
            .tempdir();
        match temp_dir {
            Ok(d) => {
                Self { file: f, container_id: None, dir: d }
            }
            Err(e) => {
                println!("ERROR {:?}", e);
                Self {
                    file: f,
                    container_id: None,
                    dir: TempDir::new().unwrap()
                }
            }
        }
       

    }
    pub async fn write_ath_module(&self) {
        let src = self.file.src_code();
        let src_path = self.athfile_with_ext();
        tokio::fs::write(src_path, src)
            .await
            .expect("Error writing athena code to temp file");
    }


    pub fn generate_run_command(&self) -> Command {
        let mut cmd = Command::new("docker");
            
            let mut mount_exec_file = self.athfile_with_ext().into_os_string();
            mount_exec_file.push(":");
            mount_exec_file.push("/athena/temp-ath-files/");
            mount_exec_file.push(self.file.name_with_ext());
            cmd
            .arg("run")
            .arg("--name")
            .arg(format!("{}", self.file.name()))
            .arg("--detach")
            .arg("--workdir")
            .arg("/athena")
            .arg("--memory")
            .arg("512m")
            .arg("--volume")
            .arg(mount_exec_file)
            .arg("athena_runtime");
            
        cmd.kill_on_drop(true);
        cmd
    }

    pub fn execute(&self, cmd: &mut Command) {
            cmd.arg(format!("/athena/temp-ath-files/{}.ath", self.file.name()));
            // cmd.arg("--env")
            //     .arg(format!("ATH_FILE_NAME={}", self.name));
    }
}
impl AthenaFileInput {
    pub fn set_random_name(mut self) -> Self {
        let file_id = Uuid::new_v4().to_string();
        let fname = format!("temp_{}", file_id);
        let fname = fname[0..10].to_string();
        self.name = fname;
        self
    }

    pub fn name(&self) -> &str {
        &self.name
    }

    pub fn name_with_ext(&self) -> String {
        format!("{}.ath", self.name)
    }
    pub fn src_code(&self) -> &str {
        &self.ath
    }

}

#[derive(Serialize)]
pub struct AthenaExecResult {
    pub err: bool,
    pub message: String
}


