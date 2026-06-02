# Tutorial


## Downloading GO files

Users can have Ontologizer download both the ontology file (go-basic.json) and the GO annotation file for one of five species automatically to a local "ontologizer" folder or can link to the corresponding files that have been downloaded elsewhere on the user's system.

When the Ontologizer first starts, it creates a configuration directory in the user's home directory:

```bash
/User/username/.ontologizer
```

This directory contains a config file that stores the locations of the previously chosen input files (if any) as well as the downloaded GO and GOA files.

## Ontology files.

- **go-basic.json**

This is the "main" GO file that contains the GO terms and relations between the terms (is a, part of, regulates, negatively regulates and positively regulates). Relations are filtered so that the ontology is acyclic and is recommended for most GO-based annotation tools.

- **GO annotation (GOA) file**

The GO consortium maintains organism-specific annotation files that connect GO terms to gene (products) of species. For instance, the GOA file for humans is **goa_human.gaf**.

NOTE: In June 2026, the naming conventions for the GOA files will change. The Ontologizer will provide an updated automatic downloading facility soon after, but users can manually download any of the annotations files and link them locally.

## Gene files

Ontologizer requires experiment-specific **population gene file** and **study gene file** provided by the user. Both files list one gene symbol per line that must match the `DB_Object_Symbol` (column 3) of the GAF file for the same organism.
- **Population gene file**

The population set defines the background of genes against which enrichment is assessed. Typically, this comprises all the genes tested in the experiment. 
For an RNA-seq experiment, this is usually the set of genes that passed expression filtering before differential-expression analysis.
For a microarray experiment, it is the set of genes represented on the array.

Example (one gene symbol per line):

```text
A1BG
A2M
A4GALT
AAAS
AACS
...
```

- **Study gene file**

The study set is the subset of the population that is "of interest". In most cases the genes called significant by upstream analysis. 
The definition of *interest* depends on the experiment.

The study file uses the same format as the population file:

```text
BRCA1
TP53
MYC
RAD51
...
```