import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClipboardModule, Clipboard } from '@angular/cdk/clipboard';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-tooltip',
  imports: [ClipboardModule, MatSnackBarModule, CommonModule],
  templateUrl: './tooltip.html',
  styleUrl: './tooltip.css'
})
export class Tooltip {

  @Input() type!: 'annotation' | 'study' | 'pop' | 'go' | 'goGraphInfo';

  // linkCopied = false;

  tooltipText: { [key in 'annotation' | 'study' | 'pop' | 'go' | 'goGraphInfo']: string } = {
    annotation: 'The GO Association File (GAF) contains annotations linking gene products to Gene Ontology terms. This file can be downloaded from the Gene Ontology homepage. Make sure the file corresponds to the organism in your dataset.',
    study: 'The Study Set is a subset of the Population Set. Term enrichment is analysed with respect to this subset. Each gene must be on a separate line. All genes should be provided using their <span class="highlight">Official Gene Symbol</span>. Uploaded symbols will be compared with the object_symbol column in the provided GAF file.',
    pop: 'The Population Set represents the background set of genes that defines the reference for enrichment analysis. Each gene must be on a separate line. All genes should be provided using their <span class="highlight">Official Gene Symbol</span>. Uploaded symbols will be compared with the object_symbol column in the provided GAF file.',
    go: 'Upload the Gene Ontology in JSON format. The latest version can be downloaded at <em> https://geneontology.org/ </em>.',
    goGraphInfo: 'The GO Graph visualization provides an interactive way to explore hierarchy of significant GO terms. Non-significant nodes have been skipped for clarity. Edges between nodes represent "is_a" relationships. <span class="highlight">Solid edges</span> indicate direct parent-child relationships, while <span class="highlight">dashed edges</span> indicate that intermediate nodes have been skipped. <br> <span class="highlight">Hover</span> over nodes to <span class="highlight">see more information</span>. <br> <br> The actual max depth of each term in the GO hierarchy is shown in the tooltip — Root has depth 0.'
  };

  // constructor(private clipboard: Clipboard, private snackBar: MatSnackBar) { }
  // // function to copy link to clipboard
  // onTooltipClick(event: MouseEvent) {
  //   const target = event.target as HTMLElement;

  //   // Check if the clicked element has the class 'link'
  //   if (target.classList.contains('link')) {
  //     const textToCopy = 'https://geneontology.org/docs/download-ontology/';
  //     this.clipboard.copy(textToCopy);
  //     console.log(`Copied to clipboard: ${textToCopy}`);
  //     this.showCopiedToast();

  //   }
  // }

  // showCopiedToast() {
  //   this.linkCopied = true;
  //   setTimeout(() => this.linkCopied = false, 1000); // lasts 1 second
  // }
}



