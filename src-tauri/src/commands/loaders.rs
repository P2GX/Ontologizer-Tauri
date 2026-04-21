use crate::appstate::AppState;
use oboannotation::go::stats::get_annotation_map;
use oboannotation::go::{GoAnnotations, GoGafAnnotationLoader};
use oboannotation::io::AnnotationLoader;
use ontolius::io::OntologyLoaderBuilder;
use ontolius::ontology::csr::FullCsrOntology;
use ontolius::ontology::{MetadataAware, OntologyTerms};
use ontologizer::{AnnotationIndex, GeneSet};

use flate2::read::GzDecoder;
use serde::Serialize;
use std::io::{BufRead, BufReader, Read};
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
    load_go_from_path(state, path).await
}

async fn load_go_from_path(
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
        if path.ends_with(".gz") {
            let compressed =
                std::fs::read(&path).map_err(|e| format!("Could not read GAF file: {e}"))?;
            let mut decoder = GzDecoder::new(&compressed[..]);
            let mut decompressed = Vec::new();
            decoder
                .read_to_end(&mut decompressed)
                .map_err(|e| format!("Could not decompress GAF file: {e}"))?;
            GoGafAnnotationLoader
                .load_from_read(std::io::Cursor::new(decompressed))
                .map_err(|e| format!("Could not parse GAF file: {e}"))
        } else {
            GoGafAnnotationLoader
                .load_from_path(&path)
                .map_err(|e| format!("Could not load GAF file: {e}"))
        }
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))??;

    let unique_genes = get_annotation_map(&annotations).len();
    let stats = vec![
        Stat::new("Version", &annotations.version),
        Stat::new(
            "Total annotations",
            annotations.annotations.len().to_string(),
        ),
        Stat::new("Unique genes", unique_genes.to_string()),
    ];

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
        match target.as_str() {
            "population" => {
                // Population genes are valid gene IDs by definition — no annotation dependency.
                let genes = GeneSet::from_file(&path, None)
                    .map_err(|e| format!("Could not load GeneSet file: {}", e))?;

                let stats = vec![Stat::new(
                    "Population genes",
                    genes.recognized_genes().len().to_string(),
                )];

                *state
                    .pop_genes
                    .lock()
                    .map_err(|_| "Lock poisoned".to_string())? = Some(genes);

                serde_json::to_string(&stats)
                    .map_err(|e| format!("Failed to serialize population gene set stats: {}", e))
            }
            "study" => {
                // Study genes are restricted to the population gene set.
                let pop_guard = state
                    .pop_genes
                    .lock()
                    .map_err(|_| "Lock poisoned".to_string())?;
                let pop_genes = pop_guard.as_ref().ok_or_else(|| {
                    "Population genes have not been loaded yet! Please load a population file first.".to_string()
                })?;

                let genes = GeneSet::from_file(&path, Some(pop_genes))
                    .map_err(|e| format!("Could not load GeneSet file: {}", e))?;
                drop(pop_guard);

                let stats = vec![
                    Stat::new(
                        "Genes in population",
                        genes.recognized_genes().len().to_string(),
                    ),
                    Stat::new(
                        "Genes not in population",
                        genes.unrecognized_genes().len().to_string(),
                    ),
                ];

                *state
                    .study_genes
                    .lock()
                    .map_err(|_| "Lock poisoned".to_string())? = Some(genes);

                serde_json::to_string(&stats)
                    .map_err(|e| format!("Failed to serialize study gene set stats: {}", e))
            }
            _ => Err("Unknown target specified. Please use 'study' or 'population'.".to_string()),
        }
    })
}

#[tauri::command]
pub async fn build_annotation_index(state: tauri::State<'_, AppState>) -> Result<String, String> {
    // Building the index is highly CPU-bound and holds multiple locks. block_in_place handles this efficiently.
    block_in_place(move || {
        let ontology_guard = state.ontology.read().map_err(|_| "RwLock poisoned")?;
        let ontology = ontology_guard
            .as_ref()
            .ok_or_else(|| "Ontology not loaded!".to_string())?;

        let pop_genes_guard = state.pop_genes.lock().map_err(|_| "Mutex poisoned")?;
        let pop_genes = pop_genes_guard
            .as_ref()
            .ok_or_else(|| "Population genes not loaded!".to_string())?;

        // Lock the raw annotations and `take()` them out (consuming them)
        let mut raw_guard = state.raw_annotations.lock().map_err(|_| "Mutex poisoned")?;
        let go_annotations = raw_guard
            .take()
            .ok_or_else(|| "GAF Annotations not loaded or already consumed!".to_string())?;

        // Construct the actual index
        let annotation_index =
            AnnotationIndex::new(go_annotations, ontology, pop_genes.recognized_genes());

        // Save the finalized index to AppState
        *state.annotations.lock().map_err(|_| "Mutex poisoned")? = Some(annotation_index);

        Ok("Annotation Index built successfully!".into())
    })
}

/// Reads just the first few KB of a go-basic.json file to extract the release date from the
/// version URL (e.g. "http://.../releases/2026-03-25/go.owl" → "2026-03-25").
#[tauri::command]
pub fn get_go_date(path: String) -> Result<String, String> {
    let mut file =
        std::fs::File::open(&path).map_err(|e| format!("Could not open GO file: {e}"))?;
    let mut buf = vec![0u8; 4096];
    let n = file
        .read(&mut buf)
        .map_err(|e| format!("Could not read GO file: {e}"))?;
    let text = String::from_utf8_lossy(&buf[..n]);

    let marker = "releases/";
    if let Some(pos) = text.find(marker) {
        let date: String = text[pos + marker.len()..].chars().take(10).collect();
        return Ok(date);
    }
    Err("Could not find release date in GO file".to_string())
}

/// Reads only the header lines of a GAF or GAF.gz file to extract the date-generated value.
#[tauri::command]
pub fn get_gaf_date(path: String) -> Result<String, String> {
    const PREFIX: &str = "!date-generated: ";

    let extract = |reader: &mut dyn BufRead| -> Result<String, String> {
        for line in reader.lines() {
            let line = line.map_err(|e| format!("Read error: {e}"))?;
            if !line.starts_with('!') {
                break;
            }
            if let Some(rest) = line.strip_prefix(PREFIX) {
                return Ok(rest.to_string());
            }
        }
        Err("Could not find date-generated in GAF file".to_string())
    };

    let file =
        std::fs::File::open(&path).map_err(|e| format!("Could not open GAF file: {e}"))?;

    if path.ends_with(".gz") {
        let mut reader = BufReader::new(GzDecoder::new(file));
        extract(&mut reader)
    } else {
        let mut reader = BufReader::new(file);
        extract(&mut reader)
    }
}
