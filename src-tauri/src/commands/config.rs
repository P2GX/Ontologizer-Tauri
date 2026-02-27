use crate::appstate::AppState;
use serde::{Deserialize, Serialize};

// By adding Deserialize and rename_all="lowercase", Tauri can automatically
// convert the string "frequentist" from JS into MethodConfig::Frequentist in Rust!
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "lowercase")]
pub enum Method {
    Frequentist(Topology, Correction),
    Bayesian,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum Topology {
    TermForTerm,
    ParentChildUnion,
    ParentChildIntersection,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum Correction {
    Bonferroni,
    BonferroniHolm,
    BenjaminHochberg,
    None
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Settings {
    pub method: Method,
}

impl Settings {
    pub fn new(method: Method) -> Self {
        Settings { method }
    }
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
