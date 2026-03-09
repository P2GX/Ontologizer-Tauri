import { Routes } from '@angular/router';
import { Files } from './pages/files/files';
import { Analysis } from './pages/analysis/analysis';
import { Results } from './pages/results/results';
import { Contact } from './pages/contact/contact';
import { About } from './pages/about/about';

export const routes: Routes = [
  { path: 'files', component: Files },
  { path: 'analysis', component: Analysis },
  { path: 'results', component: Results },
  { path: 'about', component: About },
  { path: 'contact', component: Contact },
  { path: '', redirectTo: '/files', pathMatch: 'full' }
];