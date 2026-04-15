use ontologizer::{AnalysisResult, AnnotationIndex, GeneSet};

use crate::commands::config::Config;
use crate::commands::settings::Settings;
use oboannotation::go::GoAnnotations;
use ontolius::ontology::csr::FullCsrOntology;
use std::sync::{Mutex, RwLock};

pub struct AppState {
    pub config: Mutex<Config>,
    pub ontology: RwLock<Option<FullCsrOntology>>,
    pub raw_annotations: Mutex<Option<GoAnnotations>>,
    pub annotations: Mutex<Option<AnnotationIndex>>,
    pub study_genes: Mutex<Option<GeneSet>>,
    pub pop_genes: Mutex<Option<GeneSet>>,
    pub settings: Mutex<Option<Settings>>,
    pub results: RwLock<Option<AnalysisResult>>, // Optional field to store analysis results
}
