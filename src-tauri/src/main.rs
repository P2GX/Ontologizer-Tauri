// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{env, sync::RwLock};

mod appstate;
use appstate::AppState;

use std::sync::Mutex;

mod commands;
use crate::commands::config::Config;
use commands::{
    analysis::run_analysis,
    config::{get_config, set_gaf_file, set_go_file, set_population_file, set_study_file},
    downloader::{download_gaf, download_go, get_available_organisms},
    loaders::{
        build_annotation_index, get_gaf_date, get_go_date, path_exists, process_gaf_file,
        process_gene_file, process_go_file,
    },
    output::{
        build_go_graph_data, get_analysis_results, get_analysis_results_page, get_analysis_summary,
        get_bar_chart_data, save_binary_file, save_results,
    },
    settings::{get_data_dir, save_settings},
};

fn main() {
    let config = Config::load();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init()) // activate Dialog plugin for file dialogs (open file, save file)
        .plugin(tauri_plugin_fs::init()) // activate File System plugin for file operations.
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            // shared state across the application that can be accessed from different commands
            config: Mutex::new(config),
            ontology: RwLock::new(None),
            raw_annotations: Mutex::new(None),
            annotations: Mutex::new(None),
            study_genes: Mutex::new(None),
            pop_genes: Mutex::new(None),
            settings: Mutex::new(None),
            results: RwLock::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            // config
            get_config,
            set_go_file,
            set_gaf_file,
            set_study_file,
            set_population_file,
            // downloader
            download_go,
            download_gaf,
            get_available_organisms,
            // loaders
            process_go_file,
            process_gaf_file,
            process_gene_file,
            path_exists,
            build_annotation_index,
            get_go_date,
            get_gaf_date,
            save_settings,
            get_data_dir,
            run_analysis,
            get_analysis_results,
            get_analysis_summary,
            get_analysis_results_page,
            build_go_graph_data,
            get_bar_chart_data,
            save_results,
            save_binary_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
