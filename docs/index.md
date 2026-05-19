# Ontologizer

The Ontologizer is a Desktop application for performing Gene Ontology Overrepresentation analysis.

---

## 📂 Gene Ontology (GO)
The [Gene Ontology](https://www.geneontology.org/) provides a structured vocabulary to describe the roles of genes and their products across three distinct categories:

* **Molecular Function**: The specific activities of a gene product. For example, *DNA helicase activity* (GO:0003678) is used to annotate gene products like *CHD1L*.
* **Biological Process**: The larger pathways or "goals" the gene contributes to. For example, *COL11A2* is annotated to *cartilage development* (GO:0051216).
* **Cellular Component**: The physical location where the activity occurs. For example, *Golgi membrane* (GO:0000139) annotates *B3GAT2*.

### The "True-Path Rule"
The GO is organized as a graph where terms are linked by **is-a** and **part-of** relations. By the principle of transitivity, if a gene is annotated to a specific term, it is automatically considered annotated to all its parent and ancestor terms. 

> **Example:** Because *cartilage* is **part-of** the *skeletal system*, any gene involved in *cartilage development* is also categorized under *skeletal system development* (GO:0001501).

---

## 📊 Overrepresentation Analysis 

One of the most important applications of GO is in the analysis of lists of differentially expressed genes derived from exploratory experiments in which the transcriptional activity of all or most genes is assayed with RNA-seq or comparable methods. **GO Overrepresentation Analysis (ORA)** asks the question of whether more genes annotated to a given GO term are found to be differentially expressed than one would expect by chance. If so, then we say that genes annotated to the GO term are "overrepresented" in the set of differentially expressed genes.

We implement two primary approaches to tackle this statistical challenge:

| Method                                   | Approach    | Description                                                                                                                                                                                                                                       |
|:-----------------------------------------|:------------|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Fisher's Exact Test (FET)**            | Frequentist | Tests each GO term independently for overrepresentation of study-set genes among its annotations, returning an adjusted $p$-value per term. Simple and fast, but the hierarchical structure of the GO leads to many redundant, correlated terms. |
| **Model-Based Gene Set Analysis (MGSA)** | Bayesian    | Evaluates all GO terms jointly in a Bayesian network, returning a posterior probability of activation per term. The joint model naturally accounts for term overlap and removes the need for multiple-testing correction.                         |

---

## 🛠 Availability

The Ontologizer ecosystem is built for speed and portability using **Rust**.

### 🦀 Rust Library
The core engine for FET and MGSA calculations, designed for integration into other bioinformatics pipelines.
* **Source:** [P2GX/ontologizer](https://github.com/P2GX/ontologizer)

### 💻 Desktop Application
A user-friendly graphical interface built with the **Tauri** framework, offering a native experience across Windows, macOS, and Linux.
* **Source:** [P2GX/ontologizer-gui](https://github.com/P2GX/ontologizer-gui)







