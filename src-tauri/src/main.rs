// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{env, sync::RwLock};

mod appstate;
use appstate::AppState;

use std::sync::Mutex;

mod commands;
use commands::{
    analysis::run_analysis,
    config::{save_settings, get_data_dir},
    loaders::{process_gaf_file, process_gene_file, process_go_file, build_annotation_index},
    output::{build_go_graph_data, get_analysis_results, get_analysis_summary, get_analysis_results_page, get_bar_chart_data},
};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init()) // activate Dialog plugin for file dialogs (open file, save file)
        .plugin(tauri_plugin_fs::init()) // activate File System plugin for file operations.
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            // shared state across the application that can be accessed from different commands
            ontology: RwLock::new(None),
            raw_annotations: Mutex::new(None),
            annotations: Mutex::new(None),
            study_genes: Mutex::new(None),
            pop_genes: Mutex::new(None),
            settings: Mutex::new(None),
            results: RwLock::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            // register tauri-commands for frontend-backend communication
            process_go_file,
            process_gaf_file,
            process_gene_file,
            build_annotation_index,
            save_settings,
            get_data_dir,
            run_analysis,
            get_analysis_results,
            get_analysis_summary,
            get_analysis_results_page,
            build_go_graph_data,
            get_bar_chart_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
