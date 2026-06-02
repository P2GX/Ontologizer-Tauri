# Ontologizer 

Ontologizer is a desktop application for **Gene Ontology overrepresentation analysis**. It is the third edition of the Ontologizer, following the 2004 and 2008 Java releases, rebuilt with a Rust backend and an Angular front-end packaged as a cross-platform native desktop application via the [Tauri](https://tauri.app) framework.

---

## 📂 Gene Ontology (GO)
The [Gene Ontology](https://www.geneontology.org/) provides a structured vocabulary to describe the roles of genes and their products across three subontologies:

* **Molecular Function**: the specific activity of a gene product. For example, *DNA helicase activity* (GO:0003678) annotates gene products such as *CHD1L*.
* **Biological Process**: the pathways and larger processes to which a gene product contributes. For example, *COL11A2* is annotated to *cartilage development* (GO:0051216).
* **Cellular Component**: t physical location where the activity occurs. For example, *Golgi membrane* (GO:0000139) annotates *B3GAT2*.

### The "True-Path Rule"
GO terms are linked by **is-a** (subclass) and **part-of** (part-whole) relations. By the transitivity principle, or "true-path rule", an annotation to a GO term implies annotation to all of its **is-a** and **part-of** ancestors.

> **Example:** Because *cartilage* is **part-of** the *skeletal system*, any gene involved in *cartilage development* is also categorized under *skeletal system development* (GO:0001501).

---

## 📊 Overrepresentation Analysis 
One of the most important applications of GO is the analysis of lists of differentially expressed genes derived from exploratory experiments in which the transcriptional activity of all or most genes is assayed with RNA-seq or comparable methods.
**GO overrepresentation analysis (ORA)** asks whether more genes annotated to a given GO term are found to be differentially expressed than would be expected by chance. If so, the term is "overrepresented" in the study set.

Ontologizer 3 implements two complementary approaches to quantify overrepresentation:

| Method                                   | Approach    | Description                                                                                                                                                                                                                                                                                     |
|:-----------------------------------------|:------------|:------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Term-for-Tern (TfT)**                  | Frequentist | Tests each GO term independently using a one-sided Fisher's Exact Test, returning an adjusted $p$-value per term. Simple and fast, but due the statistical dependency implied by the hierarchy of GO this approach often yields a lengthy list of significant terms.                            |
| **Model-Based Gene Set Analysis (MGSA)** | Bayesian    | Evaluates all GO terms jointly in a Bayesian network, returning a posterior probability of activation per term. The joint model naturally accounts for term overlap, removes the need for multiple-testing correction, and yields a parsimonious set of terms that explain the observed genes . |

### When to use which

Use **TfT** for the familiar $p$-value-based view, particularly when results need to be compared against the output of other ORA tools. Use **MGSA** when a parsimonious set of terms that jointly explain the differentially expressed genes is preferred over a long list of frequentist enrichments.

---

## 🛠 Availability

Ontologizer 3 is freely available under the MIT licence.

### Desktop application

A graphical interface built with the Tauri framework, offering a native experience on Windows, macOS, and Linux. Pre-built installers (`.msi`, `.exe`, `.dmg`, `.AppImage`, `.deb`, `.rpm`) are distributed via the GitHub Releases page.

* **Source:** [P2GX/ontologizer-gui](https://github.com/P2GX/ontologizer-gui)


### Rust backend

The analysis engine implementing FET and MGSA, also usable as a standalone library for integration into bioinformatics pipelines.

* **Source:** [P2GX/ontologizer](https://github.com/P2GX/ontologizer)

### Benchmarking workflow

A Snakemake workflow that reproduces the simulated-data benchmarks reported in the Ontologizer 3 manuscript.

* **Source:** [P2GX/ontologizer-benchmark](https://github.com/P2GX/ontologizer-benchmark)







