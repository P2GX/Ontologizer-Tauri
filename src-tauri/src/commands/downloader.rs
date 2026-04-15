use crate::appstate::AppState;
use std::collections::HashMap;
use std::fs;

const GO_URL: &str = "http://purl.obolibrary.org/obo/go/go-basic.json";

fn gaf_urls() -> HashMap<&'static str, &'static str> {
    HashMap::from([
        (
            "Human",
            "https://current.geneontology.org/annotations/goa_human.gaf.gz",
        ),
        (
            "Mouse",
            "https://current.geneontology.org/annotations/mgi.gaf.gz",
        ),
        (
            "Rat",
            "https://current.geneontology.org/annotations/rgd.gaf.gz",
        ),
        (
            "Yeast",
            "https://current.geneontology.org/annotations/sgd.gaf.gz",
        ),
        (
            "Fly",
            "https://current.geneontology.org/annotations/fb.gaf.gz",
        ),
    ])
}

/// Returns the list of available organism names for display in the frontend.
#[tauri::command]
pub fn get_available_organisms() -> Vec<String> {
    let mut organisms: Vec<String> = gaf_urls().keys().map(|k| k.to_string()).collect();
    organisms.sort();
    organisms
}

/// Downloads go-basic.json from OBO and saves it to the path stored in config.
#[tauri::command]
pub async fn download_go(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let target_path = {
        let config = state
            .config
            .lock()
            .map_err(|_| "Failed to lock config".to_string())?;
        config
            .go_file
            .clone()
            .ok_or_else(|| "No GO file path set in config".to_string())?
    }; // lock released before await

    let response = reqwest::get(GO_URL)
        .await
        .map_err(|e| format!("Download failed: {e}"))?;
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response: {e}"))?;

    fs::write(&target_path, &bytes).map_err(|e| format!("Failed to write GO file: {e}"))?;

    Ok(format!("Downloaded GO file to {}", target_path.display()))
}

/// Downloads the GAF file for the given organism and saves the raw compressed
/// bytes to ~/.ontologizer/. Decompression is handled by the loader.
/// Also updates config.gaf_file, which clears the gene set paths.
#[tauri::command]
pub async fn download_gaf(
    state: tauri::State<'_, AppState>,
    organism: String,
) -> Result<String, String> {
    // 1. Look up the URL
    let url = gaf_urls()
        .get(organism.as_str())
        .map(|u| u.to_string())
        .ok_or_else(|| format!("Unknown organism: '{organism}'"))?;

    // 2. Derive target path from the URL filename (keep .gz extension)
    let filename = url
        .split('/')
        .last()
        .ok_or_else(|| "Could not parse filename from URL".to_string())?
        .to_string();

    let target_path = dirs::home_dir()
        .ok_or_else(|| "Could not determine home directory".to_string())?
        .join(".ontologizer")
        .join(&filename);

    // 3. Download and write raw bytes to disk
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Download failed: {e}"))?;
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response: {e}"))?;

    fs::write(&target_path, &bytes).map_err(|e| format!("Failed to write GAF file: {e}"))?;

    // 4. Update config — also clears study/pop file paths
    let mut config = state
        .config
        .lock()
        .map_err(|_| "Failed to lock config".to_string())?;
    config.set_gaf_file(target_path.clone())?;

    Ok(format!(
        "Downloaded {organism} GAF to {}",
        target_path.display()
    ))
}
