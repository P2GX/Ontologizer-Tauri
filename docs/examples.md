# Example datasets

Ontologizer 3 comes with a dataset which is available to download from [Zenodo](https://doi.org/10.5281/zenodo.20340038). This dataset contains the necessary Gene Ontology (GO) file, along with GO association files (GAF) and simulated datasets for five commonly studied organisms.

| Common name | Organism                   | GAF file  |
|:------------|:---------------------------|:----------|
| fly         | *Drosophila melanogaster*  | `fb.gaf`  |
| human       | *Homo sapiens*             | `goa_human.gaf` |
| mouse       | *Mus musculus*             | `mgi.gaf` |
| rat         | *Rattus norvegicus*        | `rgd.gaf` |
| yeast       | *Saccharomyces cerevisiae* | `sgd.gaf` |

To try one of the datasets, download the dataset bundle. Launch Ontologizer and either download the GO and GAF files from within the application or load them from the bundle. Then load the corresponding population and study gene files.

## Content

Each organism folder contains:

| File                        | Contents                                                                                                                                                                       |
|:----------------------------|:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `population_genes.txt`      | All protein-coding genes of the organism, one gene symbol per line.                                                               |
| `study_genes.txt`           | A simulated study set drawn from the population, enriched for a small number of GO terms.                                         |
| `solution.tsv`              | The ground-truth causal terms used to construct the study set, with the specific genes drawn from each.                           |

## Construction

The `study_genes.txt` file follow the simulation procedure described in the [Ontologizer 3 manuscript](#TODO-cite). GO terms were sampled at random and a fraction of each term's annotated genes was added to the study set, until the study set reached a target size. Unrelated noise genes were then added to reach a target *gene precision*. 
Each dataset uses **gene recall** $\rho = 0.4$ (40% of each causal term's genes are included) and **gene precision** $\eta = 0.5$ (half the study set is causal, half noise), corresponding to a moderate-signal, moderate-noise regime.

The `solution.tsv` file is tab-separated with two columns, containing the GO term ID (or the label `Noise` for unrelated genes) and a comma-separated list of the genes drawn from that term and added to the study set:
```text
GO:0035196  PUS10,NCBP2,AGO1,LIN28B,TNRC6C,...
GO:0030018  SYNPO2L,PDLIM7,SYNC,NEB,...
GO:0097553  PLCB4,TRPV3,ERO1A,...
...
Noise       CALR,SNX31,HCRTR2,PTPN22,OPN1MW3,CLEC16A,...
```

## Try it
A useful exercise to build some inuition on the two methods is to run them on the same dataset and to compare the reported terms against `solution.tsv`.
MGSA typically returns a much shorter list, with most of the reported terms appearing in `solution.tsv`. Fisher's exact test will also identify the causal terms, but among a longer list of redundant terms, typically ancestors of the causal terms, which are enriched as a consequence of the true-path rule. This precision difference is quantified in the manuscript's validation experiments.