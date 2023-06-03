use std::{
    path::{Path, PathBuf},
    process::Stdio,
    time::Duration,
};

use serde::{Deserialize, Serialize};
use tempfile::{self, TempDir};

use futures::future::join_all;
use tokio::process::Command;
use uuid::Uuid;

#[allow(unused_imports)]
use crate::Config;

#[derive(Deserialize, Default, Debug, Clone)]
pub struct AthenaDirInput {
    pub file_to_run: String,
    pub files: Vec<AthenaFileInput>,
}

impl AthenaDirInput {
    pub fn src_code(&self) -> String {
        self.files
            .iter()
            .find(|f| f.name == self.file_to_run)
            .unwrap()
            .ath
            .clone()
    }

    pub fn ath_file_to_run(&self) -> AthenaFileInput {
        self.files
            .iter()
            .find(|f| self.file_to_run.contains(&f.name))
            .unwrap()
            .clone()
    }
}

#[derive(Deserialize, Default, Clone, Debug)]
pub struct AthenaFileInput {
    pub ath: String,
    #[serde(default)]
    pub name: String,
}

pub struct Sandbox {
    file: AthenaFileInput,
    #[allow(dead_code)]
    container_id: Option<String>,
    dir: TempDir,
    pub files: Option<AthenaDirInput>,
}

impl Sandbox {
    #[allow(dead_code)]
    pub fn athfile(&self) -> PathBuf {
        self.dir.path().join(self.file.name())
    }

    pub fn athfile_with_ext(&self) -> PathBuf {
        self.dir.path().join(self.file.name_with_ext())
    }

    pub fn athfile_ext(&self, f: &AthenaFileInput) -> PathBuf {
        self.dir.path().join(f.name_with_ext())
    }

    pub fn athfile_no_ext(&self, f: &AthenaFileInput) -> PathBuf {
        self.dir.path().join(f.name())
    }

    pub fn dir(&self) -> &Path {
        self.dir.path()
    }

    pub async fn new(f: AthenaFileInput) -> Self {
        let temp_dir = tempfile::Builder::new().prefix("temp-ath").tempdir();
        match temp_dir {
            Ok(d) => Self {
                file: f,
                container_id: None,
                dir: d,
                files: None,
            },
            Err(e) => {
                println!("ERROR {:?}", e);
                Self {
                    file: f,
                    container_id: None,
                    dir: TempDir::new().unwrap(),
                    files: None,
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

    pub async fn write_ath_modules(&self) {
        if let Some(files) = &self.files {
            let mut file_handlers = vec![];
            for f in files.files.clone() {
                let src = f.src_code().to_string();
                let src_path = self.athfile_ext(&f);
                println!("SRC PATH: {:?}\n", src_path);

                let write_fut = tokio::fs::write(src_path, src);
                let handler =
                    tokio::spawn(async move { write_fut.await.expect("Error writing file") });
                file_handlers.push(handler);
            }

            join_all(file_handlers).await;
        }
    }

    pub fn container_id_from_output(&mut self, out: std::process::Output) {
        let output_str = String::from_utf8_lossy(&out.stdout);
        let id = output_str.lines().next().unwrap().trim();

        self.container_id = Some(id.to_string());
    }

    pub fn multifile_run_command(&self) -> Command {
        let mut cmd = Command::new("docker");

        let mut mount_exec_file = self.dir().to_path_buf().into_os_string();
        mount_exec_file.push(":");
        mount_exec_file.push("/athena/temp-ath-files/");

        cmd.arg("run")
            .arg("--name")
            .arg(self.file.name())
            .arg("--detach")
            .arg("--workdir")
            .arg("/athena")
            .arg("--memory")
            .arg("1024m")
            .arg("--volume")
            .arg(mount_exec_file)
            .arg("athena_runtime");

        cmd.kill_on_drop(true);
        cmd
    }

    pub fn generate_run_command(&self) -> Command {
        let mut cmd = Command::new("docker");

        let mut mount_exec_file = self.athfile_with_ext().into_os_string();
        mount_exec_file.push(":");
        mount_exec_file.push("/athena/temp-ath-files/");
        mount_exec_file.push(self.file.name_with_ext());
        cmd.arg("run")
            .arg("--name")
            .arg(self.file.name())
            .arg("--detach")
            .arg("--workdir")
            .arg("/athena")
            .arg("--memory")
            .arg("1024m")
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

    // Primary way to execute a command. This waits for the container to complete and collects its output
    pub async fn wait_on_cmd(&mut self, mut cmd: Command) -> String {
        // For some reason doesn't work if duration > 7 seconds...
        let timeout = Duration::from_secs(100);
        let output = cmd.output().await.expect("Error executing command");

        self.container_id_from_output(output);
        let mut cmd = Command::new("docker");
        cmd.arg("wait").arg(self.container_id.as_ref().unwrap());

        match tokio::time::timeout(timeout, cmd.output()).await {
            Ok(outp) => {
                if let Ok(_o) = outp {
                    println!("IS OK {:?}", _o);
                    self.get_logs().await
                } else {
                    println!("IS Not OK {:?}", outp);
                    String::from("Unknown encountered during execution.")
                }
            }
            Err(e) => {
                format!("Execution timeout.\nElapsed: {}", e)
            }
        }
    }

    pub async fn shutdown(&self) {
        let mut command = Command::new("docker");

        command
            .arg("rm")
            .arg("--force")
            .arg(self.container_id.as_ref().unwrap())
            .stdout(std::process::Stdio::null());
        command
            .status()
            .await
            .expect("Error removing container during shutdown");
    }
    pub async fn get_logs(&self) -> String {
        let mut cmd = std::process::Command::new("docker");
        cmd.arg("logs").arg(&self.container_id.as_ref().unwrap());
        let outp = cmd.stdout(Stdio::piped()).output();

        match outp {
            Ok(o) => {
                let o = String::from_utf8(o.stdout).expect("Invalid output formatting");
                o.to_string()
            }
            Err(e) => {
                format!("Error in log retrieval: {:#?}", e)
            }
        }
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
    pub message: String,
}
