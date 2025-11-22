// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{env, sync::RwLock};

mod appstate;
use appstate::AppState;

use std::sync::Mutex;

mod commands;
use commands::{
    analysis_output::{get_analysis_results, build_go_graph_data},
    file_stats::{process_gaf_file, process_gene_file, process_go_file},
    run_analysis::run_analysis,
    user_settings::{save_settings, UserSettings},
};

use ontologizer::calculation::results::{MethodEnum, MtcEnum};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init()) // activate Dialog plugin for file dialogs (open file, save file)
        .plugin(tauri_plugin_fs::init()) // activate File System plugin for file operations.
        .manage(AppState { // shared state across the application that can be accessed from different commands
            go: RwLock::new(None),
            annotation_container: Mutex::new(None),
            study: Mutex::new(None),
            population: Mutex::new(None),
            userSettings: Mutex::new(Some(UserSettings {
                analysis_method: MethodEnum::TermForTerm,
                mtc_method: MtcEnum::Bonferroni,
            })),
            analysis_results: RwLock::new(None),
        })
        .invoke_handler(tauri::generate_handler![ // register tauri-commands for frontend-backend communication
            process_go_file,
            process_gaf_file,
            process_gene_file,
            save_settings,
            run_analysis,
            get_analysis_results,
            build_go_graph_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
