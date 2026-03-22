# Datasets

There are many ways to create input datasets for the Ontologizer. By default, Ontologizer expects to have one population file containing all genes in an experiment, and one study file containing "interesting" genes (usually, "interesting" means differentially expressed, but according to analysis goals it can mean "upregulated", "methylated", etc.).

Here we show some code using libraries from [Bioconductor](https://bioconductor.org/), that identifies differentially expressed genes and outputs a population and a study set.


## Load the required libraries

You may need to install them first. See the Bioconductor documentation for further information.

```R
library(GSEABenchmarkeR)
library(EnrichmentBrowser)
``` 

##  Process microarray data 

Here, we use a collection of preprocessed microarray data. This code
extracts the first five experiments from the collection and isolates the
dataset for [GSE18842](https://www.ncbi.nlm.nih.gov/geo/query/acc.cgi?acc=GSE18842).
This corresponds to the data from [PMID:14769913](https://pubmed.ncbi.nlm.nih.gov/14769913/).

```R
geo2kegg <- maPreproc(geo2kegg[1:5])
geo2kegg <- runDE(geo2kegg, de.method="limma", padj.method="flexible")
se1 <- geo2kegg$GSE18842
```

## Normalize the data and identify differentially expressed genes

# For microarray expression data, the deAna function carries out a differential expression analysis between the two groups based on functionality from the limma package. Resulting fold changes and t-test derived p-values for each gene are appended to the rowData slot.


```R
se_normalized <-  normalize(se1, norm.method="quantile")
se <- deAna(se_normalized, padj.method = "bonferroni")
rowData(se) # output
```

If desired, we can visualize a volcano plot
```R
# Visualize distribution of DE and p-values
par(mfrow = c(1,2))
pdistr(rowData(se)$PVAL)
volcano(rowData(se)$FC, rowData(se)$ADJ.PVAL)
```

## Perform GO Overrepresentation analysis

This code uses the Fisher Exact Test (FET) with Bonferroni correction for multiple testing.
This step is not needed if you are using the Ontologizer (which performs these calculations itself).

```R
go.gs <- getGenesets(org = "hsa", db = "go")
sbea.res <- sbea(method = "ora", se = se, gs = go.gs, perm = 0, alpha = 0.05, adj.method="bonferroni") 
go_res <- gsRanking(sbea.res)
write.table(go_res, file = "GO_results.tsv", 
            sep = "\t", 
            quote = FALSE, , 
            row.names = TRUE)
```

## Output study and population sets


The first step uses the `mapIds` function to get the gene symbols.

```R
all_entrez_ids <- rownames(se)
all_symbols <- mapIds(org.Hs.eg.db,
                     keys = all_entrez_ids,
                     column = "SYMBOL",
                     keytype = "ENTREZID",
                     multiVals = "first") # Returns the first symbol found if multiple exist
```

We now append the correct symbol to each row of the dataframe.

```R
de_results <- as.data.frame(rowData(se))
de_results$Symbol <- mapIds(org.Hs.eg.db,
                            keys = rownames(de_results),
                            column = "SYMBOL",
                            keytype = "ENTREZID",
                            multiVals = "first")
```

Finally, we identify significantly differentially expressed (DE) genes with an adjusted P < 0.05 and Absolute Fold Change > 1, and write the study set (DE genes) and the population set (all genes) to files.

```R
de_significant <- de_results[which(de_results$ADJ.PVAL < 0.05 & abs(de_results$FC) > 1), ]
write(na.omit(de_significant$Symbol), file = "study.txt")
write(na.omit(de_results$Symbol), file = "population.txt")
```

We can also write the results of DE analysis to file if desired.
```R
write.table(de_results, file = "DE_results.tsv", 
            sep = "\t", 
            quote = FALSE, 
            row.names = TRUE)
```
