import { ChangeDetectionStrategy, Component } from '@angular/core';
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

@Component({
  selector: 'app-contact',
  imports: [],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contact {
  readonly authors: Author[] = [
    { name: 'Lukas Ramlow',   affiliation: 'Berlin Institute of Health at Charité Universitätsmedizin',   role: 'Corresponding',          orcid: '0000-0001-6089-0613',  email: 'lukas.ramlow@bih-charite.de' },
    { name: 'Jasmin Scholtes',   affiliation: 'Berlin Institute of Health at Charité Universitätsmedizin',   role: 'Role'},
    { name: 'Daniel Danis', affiliation: 'Berlin Institute of Health at Charité Universitätsmedizin',   role: 'Role'},
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

  readonly bibtex = `@article{ontologizer_v3_2026,
  title   = {Ontologizer V3},
  author  = {L. Ramlow, J. Scholtes, D. Danis and P. N. Robinson},
  journal={Bioinformatics},
  pages={btag041},
  year={2026},
  publisher={Oxford University Press}
}`;

  async open(url: string): Promise<void> {
    try {
      await openUrl(url);
    } catch (e) {
      console.error('Failed to open link:', e);
    }
  }

  async copyBibtex(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.bibtex);
    } catch (e) {
      console.error('Clipboard write failed:', e);
    }
  }
}