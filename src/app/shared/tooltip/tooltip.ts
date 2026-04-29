import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-tooltip',
  imports: [ClipboardModule, MatSnackBarModule, CommonModule],
  templateUrl: './tooltip.html',
  styleUrl: './tooltip.css'
})
export class Tooltip {

  @Input() type!: 'annotation' | 'study' | 'pop' | 'go' | 'frequentist' | 'bayesian' | 'goGraphInfo';

  // linkCopied = false;

  tooltipText: { [key in 'annotation' | 'study' | 'pop' | 'go' | 'frequentist' | 'bayesian' | 'goGraphInfo']: string } = {
    go: 'Download the latest release automatically or select a local file. <br> The Gene Ontology (GO) is a standardised vocabulary of biological knowledge, made of <span class="highlight">terms</span> connected by defined <span class="highlight">relations</span>.',
    annotation: 'Pick an organism, then download the latest release automatically or select a local file. <br> The GO Association File (GAF) links <span class="highlight">gene products</span> to GO <span class="highlight">terms</span>.',
    study: 'Pick your genes of interest, one symbol per line. <br> The <span class="highlight">study set</span> is the group of genes tested for GO term enrichment. Symbols are matched against the <em>DB Object Symbol</em> column of the GAF.',
    pop: 'Pick the reference gene list, one symbol per line. <br> The <span class="highlight">population set</span> is the background the study set is compared against (typically all genes measurable in your experiment). Symbols are matched against the <em>DB Object Symbol</em> column of the GAF.',
    frequentist: "",
    bayesian: "",
    goGraphInfo: 'The GO Graph visualization provides an interactive way to explore hierarchy of significant GO terms. Non-significant nodes have been skipped for clarity. Edges between nodes represent "is_a" relationships. <span class="highlight">Solid edges</span> indicate direct parent-child relationships, while <span class="highlight">dashed edges</span> indicate that intermediate nodes have been skipped. <br> <span class="highlight">Hover</span> over nodes to <span class="highlight">see more information</span>. <br> <br> The actual max depth of each term in the GO hierarchy is shown in the tooltip; Root has depth 0.'
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



