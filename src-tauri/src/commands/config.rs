use crate::appstate::AppState;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Config {
    pub go_file: Option<PathBuf>,
    pub gaf_file: Option<PathBuf>,
    pub study_file: Option<PathBuf>,
    pub pop_file: Option<PathBuf>,
}

impl Config {
    fn defaults() -> Self {
        let dir = match config_dir() {
            Ok(d) => d,
            Err(_) => {
                return Config {
                    go_file: None,
                    gaf_file: None,
                    study_file: None,
                    pop_file: None,
                }
            }
        };
        Config {
            go_file: Some(dir.join("go-basic.json")),
            gaf_file: Some(dir.join("goa_human.gaf")),
            study_file: None,
            pop_file: None,
        }
    }

    pub fn load() -> Self {
        if let Err(e) = ensure_config_dir() {
            eprintln!("Could not create config directory: {e}");
            return Self::defaults();
        }

        let path = match config_file() {
            Ok(p) => p,
            Err(e) => {
                eprintln!("Could not resolve config file path: {e}");
                return Self::defaults();
            }
        };

        if !path.exists() {
            let defaults = Self::defaults();
            let _ = defaults.save();
            return defaults;
        }

        match fs::read_to_string(&path) {
            Ok(contents) => toml::from_str::<Config>(&contents).unwrap_or_else(|e| {
                eprintln!("Could not parse config file: {e}. Using defaults.");
                Self::defaults()
            }),
            Err(e) => {
                eprintln!("Could not read config file: {e}. Using defaults.");
                Self::defaults()
            }
        }
    }

    pub fn save(&self) -> Result<(), String> {
        let path = config_file()?;

        let toml_str =
            toml::to_string_pretty(self).map_err(|e| format!("Could not serialize config: {e}"))?;

        fs::write(&path, toml_str).map_err(|e| format!("Could not write config file: {e}"))?;

        Ok(())
    }

    pub fn set_go_file(&mut self, path: PathBuf) -> Result<(), String> {
        if !path.is_file() {
            return Err(format!("No file found at {}", path.display()));
        }
        self.go_file = Some(path);
        self.save()
    }

    pub fn set_gaf_file(&mut self, path: PathBuf) -> Result<(), String> {
        if !path.is_file() {
            return Err(format!("No file found at {}", path.display()));
        }
        self.gaf_file = Some(path);
        self.pop_file = None;
        self.study_file = None;
        self.save()
    }

    pub fn set_study_file(&mut self, path: PathBuf) -> Result<(), String> {
        if !path.is_file() {
            return Err(format!("No file found at {}", path.display()));
        }
        self.study_file = Some(path);
        self.save()
    }

    pub fn set_pop_file(&mut self, path: PathBuf) -> Result<(), String> {
        if !path.is_file() {
            return Err(format!("No file found at {}", path.display()));
        }
        self.pop_file = Some(path);
        self.save()
    }

}

fn config_dir() -> Result<PathBuf, String> {
    match dirs::home_dir() {
        Some(mut home) => {
            home.push(".ontologizer");
            Ok(home)
        }
        None => Err(format!("Could not determine home directory.")),
    }
}

fn config_file() -> Result<PathBuf, String> {
    let mut config_file = config_dir()?;
    config_file.push("config.toml");
    Ok(config_file)
}

fn ensure_config_dir() -> Result<(), String> {
    let config_dir = config_dir()?;
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create config directory: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
pub fn set_go_file(state: tauri::State<AppState>, path: PathBuf) -> Result<(), String> {
    let mut config = state
        .config
        .lock()
        .map_err(|_| "Failed to lock config".to_string())?;
    config.set_go_file(path)
}

#[tauri::command]
pub fn set_gaf_file(state: tauri::State<AppState>, path: PathBuf) -> Result<(), String> {
    let mut config = state
        .config
        .lock()
        .map_err(|_| "Failed to lock config".to_string())?;
    config.set_gaf_file(path)
}

#[tauri::command]
pub fn set_study_file(state: tauri::State<AppState>, path: PathBuf) -> Result<(), String> {
    let mut config = state
        .config
        .lock()
        .map_err(|_| "Failed to lock config".to_string())?;
    config.set_study_file(path)
}

#[tauri::command]
pub fn set_population_file(state: tauri::State<AppState>, path: PathBuf) -> Result<(), String> {
    let mut config = state
        .config
        .lock()
        .map_err(|_| "Failed to lock config".to_string())?;
    config.set_pop_file(path)
}

#[tauri::command]
pub fn get_config(state: tauri::State<AppState>) -> Result<Config, String> {
    let config = state
        .config
        .lock()
        .map_err(|_| "Failed to lock config".to_string())?;
    Ok(config.clone())
}
