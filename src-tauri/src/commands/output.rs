use crate::appstate::AppState;
use ontolius::{
    common::go::{BIOLOGICAL_PROCESS, CELLULAR_COMPONENT, MOLECULAR_FUNCTION},
    ontology::{csr::FullCsrOntology, HierarchyWalks},
    TermId,
};

use ontologizer::EnrichmentItem;
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    hash::Hash,
    vec,
};

// Retrieves the table analysis results from the shared app state and returns them as a JSON string.
#[tauri::command]
pub fn get_analysis_results(state: tauri::State<AppState>) -> Result<String, String> {
    let results_lock = state
        .results
        .read()
        .map_err(|e| format!("Failed to lock analysis results for reading: {}", e))?;

    let results = results_lock.as_ref().ok_or("No analysis results loaded")?;

    let results_json = serde_json::to_string(&results)
        .map_err(|e| format!("Failed to serialize results: {}", e))?;
    println! {"Happily serialized results."}
    Ok(results_json)
}

// DotData holds the DOT graph data (nodes, edges, tooltips) for the three GO categories: BP, MF, CC
#[derive(Serialize, Deserialize, Clone)]
pub struct DotData {
    BP: DotGraph,
    MF: DotGraph,
    CC: DotGraph,
}

impl DotData {
    fn new() -> Self {
        Self {
            BP: DotGraph::new(Nodes::new(), Edges::new()),
            MF: DotGraph::new(Nodes::new(), Edges::new()),
            CC: DotGraph::new(Nodes::new(), Edges::new()),
        }
    }
}

// DotGraph holds the nodes and edges for a single GO graph
#[derive(Serialize, Deserialize, Clone)]
struct DotGraph {
    nodes: Nodes,
    edges: Edges,
}

impl DotGraph {
    fn new(nodes: Nodes, edges: Edges) -> Self {
        Self { nodes, edges }
    }
}

// Nodes holds the significant nodes and non significant ancestor nodes of the significant nodes
#[derive(Serialize, Deserialize, Clone)]
struct Nodes {
    significant: HashMap<String, NodeData>,
    ancestors: HashMap<String, NodeData>,
}

// Edges holds the edges of the compressed graph (skipping non-significant nodes) and the full graph starting from significant nodes
#[derive(Serialize, Deserialize, Clone)]
struct Edges {
    compressed: HashSet<EdgeData>,
    full: HashSet<EdgeData>,
}

// NodeData represents a node (GO-term) in the GO graph
#[derive(Serialize, Debug, Deserialize, Clone)]
struct NodeData {
    id: String,    // GO-Term-ID
    label: String, // Term-Label
    adj_pval: f32,
    study_count: u32,
    population_count: u32,
    depth: usize, // depth in the graph
}

impl Nodes {
    fn new() -> Self {
        Self {
            significant: HashMap::new(),
            ancestors: HashMap::new(),
        }
    }

    fn add_node(&mut self, term_id: String, node_data: NodeData, is_significant: bool) {
        if is_significant {
            self.significant.entry(term_id).or_insert(node_data);
        } else {
            self.ancestors.entry(term_id).or_insert(node_data);
        }
    }
}

impl Edges {
    fn new() -> Self {
        Self {
            compressed: HashSet::new(),
            full: HashSet::new(),
        }
    }

    fn add_edge(&mut self, edge: EdgeData, compressed: bool) {
        if compressed {
            self.compressed.insert(edge);
        } else {
            self.full.insert(edge);
        }
    }
}

// EdgeData represents an edge (relationship) between two GO-terms in the GO graph
#[derive(Debug, Serialize, Clone, Deserialize)]
struct EdgeData {
    source: String, // significant parent node
    target: String, // significant child node
    nodes_skipped: usize, // counts how many non-significant nodes were skipped between source and target
                          // 0 (solid edge) if direct parent is significant, otherwise >0 (dashed edge)
}

impl EdgeData {
    fn new(source: String, target: String, nodes_skipped: usize) -> Self {
        Self {
            source,
            target,
            nodes_skipped,
        }
    }
}

// Edges are considered equal if they connect the same source and target nodes (otherwise duplicate edges would be created)
impl PartialEq for EdgeData {
    fn eq(&self, other: &Self) -> bool {
        self.source == other.source && self.target == other.target
    }
}

impl Hash for EdgeData {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        self.source.hash(state);
        self.target.hash(state);
    }
}

impl Eq for EdgeData {}

// Generates the compressed and "full" GO graph data in DOT format for each of the three GO categories (BP, MF, CC).
#[tauri::command]
pub fn build_go_graph_data(state: tauri::State<AppState>) -> Result<DotData, String> {
    // Acquire read locks on the GO ontology and analysis results
    let ontology_lock = state
        .ontology
        .read()
        .map_err(|e| format!("Failed to lock GO for reading: {}", e))?;
    let ontology = ontology_lock.as_ref().ok_or("No GO ontology loaded")?;

    let results_lock = state
        .results
        .read()
        .map_err(|e| format!("Failed to lock analysis results for reading: {}", e))?;
    let results = results_lock.as_ref().ok_or("No analysis results loaded")?;

    // create map of all significant results (TermId -> GOTermResult)
    let significant_terms: HashMap<TermId, &EnrichmentItem> = results
    .items
        .iter()
        .filter(|&item| item.score <= 0.05)
        .map(|item| (item.id.parse::<TermId>().unwrap(), item))
        .collect();

    // create map of all tested results (TermId -> GOTermResult)
    let tested_terms: HashMap<TermId, &EnrichmentItem> = results
        .items
        .iter()
        .map(|item| (item.id.parse::<TermId>().unwrap(), item))
        .collect();

    let mut dot_data = DotData::new();

    // We want to create three separate graph data for the three categories of the Gene Ontology
    let root_terms: Vec<TermId> = vec![
        BIOLOGICAL_PROCESS.clone(),
        CELLULAR_COMPONENT.clone(),
        MOLECULAR_FUNCTION.clone(),
    ]; // BP, CC, MF
    for root in root_terms {
        let mut nodes = Nodes::new();
        let mut edges = Edges::new();

        let root_info = results
            .items
            .iter()
            .find(|&item| item.id == root.to_string())
            .unwrap();
        nodes.add_node(
            root.to_string(),
            NodeData {
                id: root.to_string(),
                label: root_info.id.clone(),
                study_count: root_info.associated_genes.len() as u32,
                population_count: root_info.associated_genes.len() as u32,
                // todo!(this is currently just study gene count)
                depth: 0,
                adj_pval: root_info.score as f32,
            },
            true,
        );

        let mut visited: HashSet<TermId> = HashSet::new();
        traverse_term(
            &root,
            ontology,
            &mut nodes,
            &mut edges,
            &tested_terms,
            &significant_terms,
            &root,
            &mut visited,
            0,
        );

        if root == BIOLOGICAL_PROCESS {
            dot_data.BP = DotGraph::new(nodes, edges);
        } else if root == CELLULAR_COMPONENT {
            dot_data.CC = DotGraph::new(nodes, edges);
        } else if root == MOLECULAR_FUNCTION {
            dot_data.MF = DotGraph::new(nodes, edges);
        }
    }
    Ok(dot_data)
}

// Recursively traverses the GO graph starting from a given term, adding nodes and edges for significant terms.
// It's a depth-first traversal that ensures all significant terms are included, even if their direct parents are not significant.
// A significant child node is always connected to the nearest significant ancestor, skipping any non-significant intermediate terms.
fn traverse_term(
    term: &TermId,
    go: &FullCsrOntology,
    nodes: &mut Nodes,
    edges: &mut Edges,
    tested_terms: &HashMap<TermId, &EnrichmentItem>,
    significant_terms: &HashMap<TermId, &EnrichmentItem>,
    significant_parent: &TermId,
    visited: &mut HashSet<TermId>,
    depth: usize,
) -> bool {
    // Wenn schon besucht -> abbrechen, aber true zurückgeben (damit Kante trotzdem gesetzt wird)
    if !visited.insert(term.clone()) {
        // Term schon besucht
        let term_str = term.to_string();
        return nodes.significant.contains_key(&term_str)
            || nodes.ancestors.contains_key(&term_str);
    }

    let is_significant = significant_terms.contains_key(term);
    let mut keep = is_significant; // ob dieser Knoten oder ein Kind behalten wird

    // durch alle Kinder iterieren
    for child in go.iter_child_ids(term) {
        if !tested_terms.contains_key(child) {
            continue;
        }

        // Rekursion: wenn current term signifikant ist, wird er zum neuen "significant_parent"
        let next_parent = if is_significant {
            term
        } else {
            significant_parent
        };

        let child_keep = traverse_term(
            child,
            go,
            nodes,
            edges,
            tested_terms,
            significant_terms,
            next_parent,
            visited,
            depth + 1,
        );

        // Falls ein Child behalten wird → Kante in full Graph
        if child_keep {
            keep = true;
            edges.add_edge(EdgeData::new(child.to_string(), term.to_string(), 0), false);
        }
    }

    // Nur sichtbare Knoten (signifikante + deren Pfad) hinzufügen
    if keep {
        let node_result = tested_terms.get(term).unwrap(); // sichtbare sind getestet
        let node_data = NodeData {
            id: term.to_string(),
            label: node_result.id.clone(),
            depth,
            adj_pval: node_result.score as f32,
            study_count: node_result.associated_genes.len() as u32,
            population_count: node_result.associated_genes.len() as u32,
        };

        if is_significant {
            // signifikante Knoten
            nodes.add_node(term.to_string(), node_data, true);

            // compressed edge: zu nächstem signifikanten Eltern
            edges.add_edge(
                EdgeData::new(term.to_string(), significant_parent.to_string(), 0),
                true,
            );
        } else {
            nodes.add_node(term.to_string(), node_data, false);
        }

        visited.insert(term.clone());
    }

    keep
}
