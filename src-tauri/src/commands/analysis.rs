use crate::appstate::AppState;
use std::time::Instant;

use ontologizer::frequentist_analysis;
// Import MethodEnum and MtcEnum

#[tauri::command]
pub fn run_analysis(state: tauri::State<AppState>) -> Result<(), String> {
    // 1. Acquire locks
    let go_lock = state
        .ontology
        .read() // Changed to read() because we only need to reference the ontology
        .map_err(|e| format!("Failed to lock GO: {}", e))?;

    let annotation_lock = state
        .annotations
        .lock()
        .map_err(|e| format!("Failed to lock annotations: {}", e))?;

    let study_lock = state
        .study_genes
        .lock()
        .map_err(|e| format!("Failed to lock study: {}", e))?;

    // 2. Ensure data is loaded
    let go = go_lock.as_ref().ok_or("GO ontology not loaded")?;
    let annotation_index = annotation_lock.as_ref().ok_or("Annotations not loaded")?;
    let study = study_lock.as_ref().ok_or("Study gene set not loaded")?;

    let start_time = Instant::now();
    let result = frequentist_analysis(&go, annotation_index, study.recognized_genes());
    let duration = start_time.elapsed();
    println!("Calculated p-values in: {:?}", duration);

    let duration = start_time.elapsed();
    println!("Calculated results in: {:?}", duration);
    println!("Results before storing: {:?}", result.items.len());

    // 4. Store the EnrichmentResult back in AppState
    let mut results_lock = state
        .results
        .write()
        .map_err(|e| format!("Failed to lock analysis results for writing: {}", e))?;

    *results_lock = Some(result);

    Ok(())
}
