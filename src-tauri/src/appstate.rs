use ontologizer::{AnnotationIndex, EnrichmentResult, GeneSet};

use crate::commands::config::Config;
use ontolius::ontology::csr::FullCsrOntology;
use std::sync::{Mutex, RwLock};

pub struct AppState {
    pub ontology: RwLock<Option<FullCsrOntology>>,
    pub annotations: Mutex<Option<AnnotationIndex>>,
    pub study_genes: Mutex<Option<GeneSet>>,
    pub pop_genes: Mutex<Option<GeneSet>>,
    pub settings: Mutex<Option<Config>>,
    pub results: RwLock<Option<EnrichmentResult>>, // Optional field to store analysis results
}
