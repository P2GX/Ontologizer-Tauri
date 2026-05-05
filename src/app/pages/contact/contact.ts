import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { openUrl } from '@tauri-apps/plugin-opener';

interface Author {
  name: string;
  affiliation: string;
  role: string;
  orcid?: string;
  email?: string;
}

interface Repo {
  label: string;
  description: string;
  repoUrl: string;
  issueUrl: string;
}

type ContactTab = 'authors' | 'citation' | 'repository' | 'license';

@Component({
  selector: 'app-contact',
  imports: [MatDividerModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contact {
  readonly selectedTab = signal<ContactTab>('authors');

  selectTab(tab: ContactTab): void {
    this.selectedTab.set(tab);
  }

  readonly authors: Author[] = [
    { name: 'Lukas Ramlow',   affiliation: 'Berlin Institute of Health at Charité Universitätsmedizin',   role: 'Corresponding',          orcid: '0000-0001-6089-0613',  email: 'lukas.ramlow@bih-charite.de' },
    { name: 'Jasmin Scholtes',   affiliation: 'Berlin Institute of Health at Charité Universitätsmedizin',   role: 'Role'},
    { name: 'Daniel Danis', affiliation: 'Berlin Institute of Health at Charité Universitätsmedizin',   role: 'Role', orcid: "0000-0003-0900-3411"},
    { name: 'Peter N. Robinson',  affiliation: 'Berlin Institute of Health at Charité Universitätsmedizin <br> The Jackson Laboratory for Genomic Medicine',   role: 'Corresponding', orcid: '0000-0002-0736-9199', email: 'peter.robinson@bih-charite.de' },
  ];

  // TODO replace ORG / repo names with the real GitHub paths.
  readonly repos: Repo[] = [
    {
      label: 'Frontend (Angular + Tauri)',
      description: 'Desktop UI, charts, and graph rendering.',
      repoUrl:  'https://github.com/P2GX/Ontologizer-Tauri',
      issueUrl: 'https://github.com/P2GX/Ontologizer-Tauri/issues',
    },
    {
      label: 'Backend (Rust)',
      description: 'GO/GAF parsing, indexing, enrichment algorithms.',
      repoUrl:  'https://github.com/P2GX/ontologizer',
      issueUrl: 'https://github.com/P2GX/ontologizer/issues',
    },
  ];

  readonly licenseUrl = 'https://opensource.org/license/MIT';

  readonly ontologizer = `@article{ontologizer_v3_2026,
  title   = {Ontologizer V3},
  author  = {L. Ramlow, J. Scholtes, D. Danis and P. N. Robinson},
  journal={Bioinformatics},
  pages={btag041},
  year={2026},
  publisher={Oxford University Press}
}`;

  readonly mgsa = `@article{bauer2010going,
  title={GOing Bayesian: model-based gene set analysis of genome-scale data},
  author={Bauer, Sebastian and Gagneur, Julien and Robinson, Peter N.},
  journal={Nucleic Acids Research},
  volume={38},
  number={11},
  pages={3523--3532},
  year={2010},
  publisher={Oxford University Press}
}`;

  async open(url: string): Promise<void> {
    try {
      await openUrl(url);
    } catch (e) {
      console.error('Failed to open link:', e);
    }
  }

  async copyBibtex(entry: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(entry);
    } catch (e) {
      console.error('Clipboard write failed:', e);
    }
  }
}