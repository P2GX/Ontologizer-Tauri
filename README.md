# Ontologizer

Ontologizer is a desktop application for **Gene Ontology overrepresentation analysis**. It is the third edition of the Ontologizer, following the original 2004 and 2008 Java releases, now rebuilt as a [Tauri](https://tauri.app) application with a Rust backend and an Angular frontend.

Two complementary methods are available:

- **Statistical Testing (Fisher's exact test)** — per-term hypergeometric test with selectable multiple-testing correction (Bonferroni, Bonferroni-Holm, Benjamini-Hochberg, or none).
- **Bayesian Inference (MGSA)** — model-based gene set analysis that evaluates all terms jointly and returns a posterior probability of activation per term, without needing separate MTC.

## Install

Pre-built installers for Windows, macOS, and Linux are published on the [Releases page](https://github.com/P2GX/Ontologizer-Tauri/releases). Pick the bundle for your platform (`.msi` / `.dmg` / `.AppImage` / `.deb` / `.rpm`).

## Use

1. **Files** — supply (or download on demand) the Gene Ontology JSON and the species-specific GAF; then your population gene list and your study gene list (plain text, one symbol per line).
2. **Method** — pick Statistical Testing or Bayesian Inference; choose a multiple-testing correction if frequentist.
3. **Results** — inspect the summary, sort/search the full table, view the GO subgraph for any aspect, or save the table (CSV) and the figures (PNG).

The in-app **Help** page covers the file formats, the methods, and the output in more detail.

## Citation

Please cite the Ontologizer paper and the MGSA paper if you use Bayesian inference. BibTeX entries are available inside the app on the **Contact → Citation** tab.

## Links

- [Documentation](https://p2gx.github.io/Ontologizer-Tauri/) — methods, datasets, developer notes
- [Rust backend (engine)](https://github.com/P2GX/ontologizer) — TfT and MGSA implementations
- [Issue tracker](https://github.com/P2GX/Ontologizer-Tauri/issues)

## License

MIT. See [LICENSE](LICENSE).
