pub use ontologizer::gene_set::GeneSet;
use ontologizer::annotations::AnnotationContainer;
use ontologizer::ontology::Ontologizer;
use ontologizer::calculation::results::AnalysisResults;
use std::sync::{Mutex, RwLock}; 
use crate::commands::user_settings::UserSettings;

pub struct AppState {
    pub go: RwLock<Option<Ontologizer>>,
    pub annotation_container: Mutex<Option<AnnotationContainer>>,
    pub study: Mutex<Option<GeneSet>>,
    pub population: Mutex<Option<GeneSet>>,
    pub userSettings: Mutex<Option<UserSettings>>,
    pub analysis_results: RwLock<Option<AnalysisResults>>, // Optional field to store analysis results
}
