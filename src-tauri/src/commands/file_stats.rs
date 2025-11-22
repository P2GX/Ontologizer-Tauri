use crate::appstate::AppState;
pub use ontologizer::annotations::AnnotationContainer;
use ontologizer::gene_set::{build_gene_set, load_gene_file};

use oboannotation::go::stats::get_annotation_stats;
use ontologizer::ontology::Ontologizer;
use serde::Serialize;
use tokio::task::spawn_blocking;

#[derive(Serialize)]
struct Stat {
    key: String,
    value: String,
}
impl Stat {
    pub fn new(key: String, value: String) -> Self {
        Stat { key, value }
    }
}

#[tauri::command]
pub async fn process_go_file(
    state: tauri::State<'_, AppState>,
    path: String,
) -> Result<String, String> {
    let ontologizer_result = spawn_blocking(move || Ontologizer::new(&path))
        .await
        .map_err(|e| format!("Task join error: {}", e))?;

    let stats = vec![
        Stat::new("Version".to_string(), ontologizer_result.version()),
        Stat::new("GO terms".to_string(), ontologizer_result.term_count().to_string()),
    ];

    {
        let mut go_lock = state.go.write().unwrap();
        *go_lock = Some(ontologizer_result);
    }

    // JSON zurückgeben
    serde_json::to_string(&stats).map_err(|e| format!("Serialization error: {}", e))
}

#[tauri::command]
pub fn process_gaf_file(state: tauri::State<AppState>, path: String) -> Result<String, String> {
    // AnnotationContainer aus der Datei laden
    let container = AnnotationContainer::new(&path);
    let stats = get_annotation_stats(&container.annotations);

    // In den Mutex im AppState speichern
    let mut annotation_lock = state.annotation_container.lock().unwrap();
    *annotation_lock = Some(container);
    Ok(serde_json::to_string(&stats)
        .map_err(|e| format!("Failed to serialize annotation stats: {}", e))?)
}

// function that processes gene files and outputs statistics as JSON
#[tauri::command]
pub fn process_gene_file(
    state: tauri::State<AppState>,
    path: String,
    target: String, // target specifies the gene set type (study or population)
) -> Result<String, String> {
    // Gene aus Datei laden
    let gene_list =
        load_gene_file(&path).map_err(|e| format!("Failed to load {} gene file: {}", target, e))?;

    // Annotations-Container aus AppState holen
    let container_guard = state.annotation_container.lock().unwrap();
    if let Some(ref ann) = *container_guard {
        // GeneSet erstellen
        let gene_set = build_gene_set(gene_list, &ann.annotations);

        // Statistiken vorbereiten
        let gene_set_stats = vec![
            Stat::new(
                "Positively annotated genes".to_string(),
                gene_set.gene_symbols().len().to_string(),
            ),
            Stat::new(
                "Unannotated or NOT-annotated genes".to_string(),
                gene_set.unrecognized_gene_symbols().len().to_string(),
            ),
            Stat::new("Deleted duplicates".to_string(), gene_set.del_duplicates().to_string()),
        ];

        drop(container_guard); // Lock auf annotation_container freigeben

        let gene_set_mutex = match target.as_str() {
            "study" => &state.study,
            "population" => &state.population,
            _ => return Err("Unknown target specified".to_string()),
        };

        *gene_set_mutex.lock().map_err(|_| "Failed to lock target")? = Some(gene_set);

        // Statistiken zurückgeben
        Ok(serde_json::to_string(&gene_set_stats)
            .map_err(|e| format!("Failed to serialize {} gene set stats: {}", target, e))?)
    } else {
        Err("No GOA annotations loaded. Please load a GAF file first.".to_string())
    }
}
