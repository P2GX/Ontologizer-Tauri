// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{env, sync::RwLock};

mod appstate;
use appstate::AppState;

use std::sync::Mutex;

mod commands;
use crate::commands::config::{AnalysisMethod};
use commands::{
    analysis::run_analysis,
    config::{save_settings, Config},
    loaders::{process_gaf_file, process_gene_file, process_go_file},
    output::{build_go_graph_data, get_analysis_results},
};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init()) // activate Dialog plugin for file dialogs (open file, save file)
        .plugin(tauri_plugin_fs::init()) // activate File System plugin for file operations.
        .manage(AppState {
            // shared state across the application that can be accessed from different commands
            ontology: RwLock::new(None),
            annotations: Mutex::new(None),
            study_genes: Mutex::new(None),
            pop_genes: Mutex::new(None),
            settings: Mutex::new(Some(Config {
                method: AnalysisMethod::TermForTerm,
            })),
            results: RwLock::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            // register tauri-commands for frontend-backend communication
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
