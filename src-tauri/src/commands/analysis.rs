use std::sync::MutexGuard;
use crate::appstate::AppState;
use std::time::Instant;

use ontologizer::{bayesian_analysis, frequentist_analysis};
use crate::commands::config::Method;

#[tauri::command]
pub async fn run_analysis(state: tauri::State<'_, AppState>) -> Result<(), String> {
    // Run the heavy computation on a dedicated blocking thread so the async
    // executor (and with it the WebView) remains responsive during the analysis.
    let result = tokio::task::block_in_place(|| -> Result<_, String> {
        // 1. Acquire locks
        let settings_lock = state
            .settings
            .lock()
            .map_err(|e| format!("Failed to lock Settings: {}", e))?;

        let go_lock = state
            .ontology
            .read()
            .map_err(|e| format!("Failed to lock Ontology: {}", e))?;

        let annotation_lock = state
            .annotations
            .lock()
            .map_err(|e| format!("Failed to lock Annotations: {}", e))?;

        let study_lock = state
            .study_genes
            .lock()
            .map_err(|e| format!("Failed to lock Study Genes: {}", e))?;

        // 2. Ensure data is loaded
        let settings = settings_lock.as_ref().ok_or("Settings not loaded")?;
        let ontology = go_lock.as_ref().ok_or("Gene Ontology not loaded")?;
        let annotation_index = annotation_lock.as_ref().ok_or("Annotations not loaded")?;
        let study_genes = study_lock.as_ref().ok_or("Study Genes not loaded")?;

        let start_time = Instant::now();

        let result = match settings.method {
            Method::Frequentist(_, _) => frequentist_analysis(ontology, annotation_index, study_genes.recognized_genes()),
            Method::Bayesian => bayesian_analysis(ontology, annotation_index, study_genes.recognized_genes()),
        };

        let duration = start_time.elapsed();
        println!("Calculated results in: {:?}", duration);
        println!("Results before storing: {:?}", result.items.len());

        // All input locks are dropped here at end of block_in_place closure
        Ok(result)
    })?;

    // 3. Store the EnrichmentResult back in AppState (input locks already released)
    let mut results_lock = state
        .results
        .write()
        .map_err(|e| format!("Failed to lock analysis results for writing: {}", e))?;

    *results_lock = Some(result);

    Ok(())
}
