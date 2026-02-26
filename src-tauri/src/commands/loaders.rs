use crate::appstate::AppState;
use oboannotation::go::stats::get_annotation_stats;
use oboannotation::go::{GoAnnotations, GoGafAnnotationLoader};
use oboannotation::io::AnnotationLoader;
use ontolius::io::OntologyLoaderBuilder;
use ontolius::ontology::csr::FullCsrOntology;
use ontolius::ontology::{MetadataAware, OntologyTerms};
use ontologizer::{AnnotationIndex, GeneSet};

use serde::Serialize;
use tokio::task::{block_in_place, spawn_blocking};

#[derive(Serialize)]
struct Stat {
    key: String,
    value: String,
}

impl Stat {
    pub fn new(key: impl Into<String>, value: impl Into<String>) -> Self {
        Stat {
            key: key.into(),
            value: value.into(),
        }
    }
}

#[tauri::command]
pub async fn process_go_file(
    state: tauri::State<'_, AppState>,
    path: String,
) -> Result<String, String> {
    let ontology: FullCsrOntology = spawn_blocking(move || {
        OntologyLoaderBuilder::new()
            .obographs_parser()
            .build()
            .load_from_path(&path)
            .map_err(|e| format!("Could not load GO file: {}", e))
    })
        .await
        .map_err(|e| format!("Task join error: {}", e))??;

    let stats = vec![
        Stat::new("Version", ontology.version()),
        Stat::new("GO terms", ontology.len().to_string()),
    ];

    let mut ontology_lock = state
        .ontology
        .write()
        .map_err(|_| "Lock poisoned".to_string())?;
    *ontology_lock = Some(ontology);

    serde_json::to_string(&stats).map_err(|e| format!("Serialization error: {}", e))
}

#[tauri::command]
pub async fn process_gaf_file(
    state: tauri::State<'_, AppState>,
    path: String,
) -> Result<String, String> {
    let annotations: GoAnnotations = spawn_blocking(move || {
        GoGafAnnotationLoader
            .load_from_path(&path)
            .map_err(|e| format!("Could not load GAF file: {}", e))
    })
        .await
        .map_err(|e| format!("Task join error: {}", e))??;

    let stats = get_annotation_stats(&annotations);

    let mut raw_annotations_lock = state
        .raw_annotations
        .lock()
        .map_err(|_| "Lock poisoned".to_string())?;

    *raw_annotations_lock = Some(annotations);

    serde_json::to_string(&stats).map_err(|e| format!("Serialization error: {}", e))
}

#[tauri::command]
pub async fn process_gene_file(
    state: tauri::State<'_, AppState>,
    path: String,
    target: String,
) -> Result<String, String> {
    block_in_place(move || {
        let raw_annotations_guard = state
            .raw_annotations
            .lock()
            .map_err(|_| "Lock poisoned".to_string())?;

        let raw_annotations = raw_annotations_guard.as_ref().ok_or_else(|| {
            "Annotations have not been loaded yet! Please load a GAF file first.".to_string()
        })?;

        let genes = GeneSet::from_file(&path, &raw_annotations)
            .map_err(|e| format!("Could not load GeneSet file: {}", e))?;
        drop(raw_annotations_guard);

        let stats = vec![
            Stat::new(
                "Positively annotated genes",
                genes.recognized_genes().len().to_string(),
            ),
            Stat::new(
                "Unannotated or NOT-annotated genes",
                genes.unrecognized_genes().len().to_string(),
            ),
        ];

        let gene_set_mutex = match target.as_str() {
            "study" => &state.study_genes,
            "population" => &state.pop_genes,
            _ => return Err("Unknown target specified. Please use 'study' or 'population'.".to_string()),
        };

        let mut genes_guard = gene_set_mutex
            .lock()
            .map_err(|_| "Failed to lock target mutex".to_string())?;
        *genes_guard = Some(genes);

        serde_json::to_string(&stats)
            .map_err(|e| format!("Failed to serialize {} gene set stats: {}", target, e))
    })
}

#[tauri::command]
pub async fn build_annotation_index(state: tauri::State<'_, AppState>) -> Result<String, String> {
    // Building the index is highly CPU-bound and holds multiple locks. block_in_place handles this efficiently.
    block_in_place(move || {
        let ontology_guard = state.ontology.read().map_err(|_| "RwLock poisoned")?;
        let ontology = ontology_guard.as_ref().ok_or_else(|| "Ontology not loaded!".to_string())?;

        let pop_genes_guard = state.pop_genes.lock().map_err(|_| "Mutex poisoned")?;
        let pop_genes = pop_genes_guard.as_ref().ok_or_else(|| "Population genes not loaded!".to_string())?;

        // Lock the raw annotations and `take()` them out (consuming them)
        let mut raw_guard = state.raw_annotations.lock().map_err(|_| "Mutex poisoned")?;
        let go_annotations = raw_guard.take().ok_or_else(|| "GAF Annotations not loaded or already consumed!".to_string())?;

        // Construct the actual index
        let annotation_index = AnnotationIndex::new(
            go_annotations,
            ontology,
            Some(pop_genes.recognized_genes())
        );

        // Save the finalized index to AppState
        *state.annotations.lock().map_err(|_| "Mutex poisoned")? = Some(annotation_index);

        Ok("Annotation Index built successfully!".into())
    })
}