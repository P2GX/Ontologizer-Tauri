use crate::appstate::AppState;
use ontologizer::statistics::{
    bonferroni::Bonferroni, bonferroni_holm::BonferroniHolm, mtc::MultipleTestingCorrection,
    none::None,
};

use std::time::Instant;

use ontologizer::calculation::pvalue_calculation::PValueCalculation;
use ontologizer::calculation::results::{AnalysisResults, MethodEnum, MtcEnum};
use ontologizer::calculation::term_for_term::TermForTerm; // Import MethodEnum and MtcEnum

#[tauri::command]
pub fn run_analysis(state: tauri::State<AppState>) -> Result<(), String> {
    let go_lock = state
        .go
        .write()
        .map_err(|e| format!("Failed to lock GO: {}", e))?;
    let mut annotation_lock = state
        .annotation_container
        .lock()
        .map_err(|e| format!("Failed to lock annotations: {}", e))?;
    let study_lock = state
        .study
        .lock()
        .map_err(|e| format!("Failed to lock study: {}", e))?;
    let population_lock = state
        .population
        .lock()
        .map_err(|e| format!("Failed to lock population: {}", e))?;
    let user_settings_lock = state
        .userSettings
        .lock()
        .map_err(|e| format!("Failed to lock user settings: {}", e))?;

    // Prüfen ob alle Komponenten geladen sind
    let go = go_lock.as_ref().ok_or("GO ontology not loaded")?;
    let annotation_container = annotation_lock.as_mut().ok_or("Annotations not loaded")?;
    let study = study_lock.as_ref().ok_or("Study gene set not loaded")?;
    let population = population_lock
        .as_ref()
        .ok_or("Population gene set not loaded")?;
    let user_settings = user_settings_lock
        .as_ref()
        .ok_or("User settings not loaded")?;
    println!("All components loaded, starting analysis...");

    let start_time = Instant::now();

    annotation_container.build_term_genes_map(&population, go.ontology());
    annotation_container.build_term_study_genes_map(&study);

    let method = user_settings.analysis_method.clone(); // Default method, can be replaced with dynamic selection
    let mtc = user_settings.mtc_method.clone(); // Default MTC method, can be replaced with dynamic selection

    let method_struct = match &method {
        MethodEnum::TermForTerm => TermForTerm,
        _ => {
            return Err(format!("Unsupported analysis method: {}", method));
        }
    };

    let mtc_struct: Box<dyn MultipleTestingCorrection> = match &mtc {
        MtcEnum::Bonferroni => Box::new(Bonferroni),
        MtcEnum::BonferroniHolm => Box::new(BonferroniHolm),
        MtcEnum::None => Box::new(None),
        _ => {
            return Err(format!("Unsupported MTC method: {}", mtc));
        }
    };

    let mut results = AnalysisResults::new(method, mtc);
    let start_time = Instant::now();
    method_struct.calculate_p_values(
        go.ontology(),
        &annotation_container,
        &study,
        &population,
        &mut results,
    );
    let duration = start_time.elapsed();
    println!("Calculated p-values in: {:?}", duration);

    let start_time = Instant::now();

    mtc_struct.adjust_pvalues(&mut results);
    let duration = start_time.elapsed();
    println!("Adjusted p-values in: {:?}", duration);
    println!(
        "analysis method: {}, mtc method: {}",
        results.mtc_method(),
        results.analysis_method()
    );

    let mut results_lock = state
        .analysis_results
        .write()
        .map_err(|e| format!("Failed to lock analysis results for writing: {}", e))?;

    *results_lock = Some(results);

    Ok(())
}
