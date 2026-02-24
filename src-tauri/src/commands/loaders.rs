use crate::appstate::AppState;
use oboannotation::go::stats::get_annotation_stats;
use oboannotation::go::{GoAnnotations, GoGafAnnotationLoader};
use oboannotation::io::AnnotationLoader;
use ontolius::io::OntologyLoaderBuilder;
use ontolius::ontology::csr::FullCsrOntology;
use ontolius::ontology::{MetadataAware, OntologyTerms};
use ontologizer::{AnnotationIndex, GeneSet};

use serde::Serialize;
use tokio::task::spawn_blocking;

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
            .map_err(|e| format!("Could not load GO file: {}", e))
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))??;

    let ontology_guard = state
        .ontology
        .read()
        .map_err(|_| "Lock poisoned".to_string())?;

    let ontology = ontology_guard.as_ref().ok_or_else(|| {
        "Ontology has not been loaded yet! Please load the ontology first.".to_string()
    })?;

    let annotation_index = AnnotationIndex::new(annotations, ontology, None);
    let stats = get_annotation_stats(&annotation_index.annotations);

    let mut annotations_lock = state
        .annotations
        .lock()
        .map_err(|_| "Lock poisoned".to_string())?;

    *annotations_lock = Some(annotation_index);

    serde_json::to_string(&stats)
        .map_err(|e| format!("Failed to serialize annotation stats: {}", e))
}

#[tauri::command]
pub fn process_gene_file(
    state: tauri::State<AppState>,
    path: String,
    target: String,
) -> Result<String, String> {
    let annotations_guard = state
        .annotations
        .lock()
        .map_err(|_| "Lock poisoned".to_string())?;

    let annotations = annotations_guard.as_ref().ok_or_else(|| {
        "Annotations have not been loaded yet! Please load a GAF file first.".to_string()
    })?;

    let genes = GeneSet::from_file(&path, &annotations.annotations)
        .map_err(|e| format!("Could not load GeneSet file: {}", e))?;
    drop(annotations_guard);

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
        _ => {
            return Err("Unknown target specified. Please use 'study' or 'population'.".to_string())
        }
    };

    let mut genes_guard = gene_set_mutex
        .lock()
        .map_err(|_| "Failed to lock target mutex".to_string())?;
    *genes_guard = Some(genes);

    serde_json::to_string(&stats)
        .map_err(|e| format!("Failed to serialize {} gene set stats: {}", target, e))
}
