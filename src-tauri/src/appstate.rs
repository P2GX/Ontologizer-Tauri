use ontologizer::{AnnotationIndex, EnrichmentResult, GeneSet};

use crate::commands::config::Config;
use ontolius::ontology::csr::FullCsrOntology;
use std::sync::{Mutex, RwLock};
use oboannotation::go::GoAnnotations;

pub struct AppState {
    pub ontology: RwLock<Option<FullCsrOntology>>,
    pub raw_annotations: Mutex<Option<GoAnnotations>>,
    pub annotations: Mutex<Option<AnnotationIndex>>,
    pub study_genes: Mutex<Option<GeneSet>>,
    pub pop_genes: Mutex<Option<GeneSet>>,
    pub settings: Mutex<Option<Config>>,
    pub results: RwLock<Option<EnrichmentResult>>, // Optional field to store analysis results
}
