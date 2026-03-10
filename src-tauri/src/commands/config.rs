use crate::appstate::AppState;
use serde::{Deserialize, Serialize};
use ontologizer::Method;

// By adding Deserialize and rename_all="lowercase", Tauri can automatically
// convert the string "frequentist" from JS into MethodConfig::Frequentist in Rust!
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Settings {
    pub method: Method,
}

impl Settings {
    pub fn new(method: Method) -> Self {
        Settings { method }
    }
}

/// Returns a sensible default directory for the file-open dialog.
///
/// Strategy:
///   1. Dev mode – look for a `data/` folder in the current working directory
///      or one level up (covers both running from the project root and from
///      `src-tauri/` via plain `cargo run`).
///   2. Production fallback – return the user's home directory so the dialog
///      opens somewhere the user can actually navigate from.
#[tauri::command]
pub fn get_data_dir(app: tauri::AppHandle) -> String {
    use tauri::Manager;

    // Check cwd and cwd/.. for a `data/` sub-directory.
    // canonicalize() both resolves `..` and verifies the path exists.
    if let Ok(cwd) = std::env::current_dir() {
        for candidate in [cwd.join("data"), cwd.join("../data")] {
            if let Ok(resolved) = candidate.canonicalize() {
                if resolved.is_dir() {
                    return resolved.to_string_lossy().into_owned();
                }
            }
        }
    }

    // Production fallback: home directory → documents → filesystem root.
    app.path()
        .home_dir()
        .or_else(|_| app.path().document_dir())
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_else(|_| "/".to_string())
}

#[tauri::command]
pub fn save_settings(
    state: tauri::State<AppState>,
    analysis_method: Method,
) -> Result<String, String> {
    // 1. Create the settings object
    let settings = Settings::new(analysis_method);

    // 2. Lock the state and save it (Make sure the field name matches AppState,
    //    it might be `user_settings` instead of `settings` depending on your AppState definition)
    let mut user_settings_guard = state
        .settings
        .lock()
        .map_err(|_| "Failed to lock settings".to_string())?;

    *user_settings_guard = Some(settings.clone());

    println!("Settings saved: {:?}", settings);

    Ok("Settings processed successfully".to_string())
}
