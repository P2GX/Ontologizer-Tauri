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
  url: string;
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
    { name: 'Daniel Danis', affiliation: 'Berlin Institute of Health at Charité Universitätsmedizin',   role: 'Role', orcid: "0000-0003-0900-3411"},
    { name: 'Peter N. Robinson',  affiliation: 'Berlin Institute of Health at Charité Universitätsmedizin <br> The Jackson Laboratory for Genomic Medicine',   role: 'Corresponding', orcid: '0000-0002-0736-9199', email: 'peter.robinson@bih-charite.de' },
  ];

  readonly repos: Repo[] = [
    { label: 'Frontend (Angular + Tauri)', url: 'https://github.com/P2GX/ontologizer-gui' },
    { label: 'Backend (Rust)',             url: 'https://github.com/P2GX/ontologizer' },
  ];

  readonly licenseUrl = 'https://opensource.org/license/MIT';

  async open(url: string): Promise<void> {
    try {
      await openUrl(url);
    } catch (e) {
      console.error('Failed to open link:', e);
    }
  }
}