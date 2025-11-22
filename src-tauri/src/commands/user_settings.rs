use crate::appstate::AppState;
use ontologizer::calculation::results::{MethodEnum, MtcEnum};
use serde::Serialize;
use tauri::command;

#[derive(Serialize, Debug, Clone)]
pub struct UserSettings {
    pub analysis_method: MethodEnum,
    pub mtc_method: MtcEnum,
}

impl UserSettings {
    pub fn new(analysis_method: MethodEnum, mtc_method: MtcEnum) -> Self {
        UserSettings {
            analysis_method,
            mtc_method,
        }
    }
}

#[command]
pub fn save_settings(
    state: tauri::State<AppState>,
    analysis_method: String,
    mtc_method: String,
) -> Result<String, String> {
    let settings = UserSettings::new(MethodEnum::new(analysis_method), MtcEnum::new(mtc_method));

    let mut user_settings = state.userSettings.lock().unwrap();
    *user_settings = Some(settings);

    println!("Settings saved: {:?}", user_settings);
    // Hier könnte Logik folgen, die die Einstellungen verarbeitet
    Ok(format!("Settings processed"))
}
