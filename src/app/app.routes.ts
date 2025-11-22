import { Routes } from '@angular/router';
import { Setup } from './pages/setup/setup';
import { Settings } from './pages/settings/settings';
import { Analysis } from './pages/analysis/analysis';
import { Contact } from './pages/contact/contact';
import { About } from './pages/about/about';

export const routes: Routes = [
  { path: 'setup', component: Setup },
  { path: 'settings', component: Settings },
  { path: 'analysis', component: Analysis },
  { path: 'about', component: About },
  { path: 'contact', component: Contact },
  { path: '', redirectTo: '/setup', pathMatch: 'full' }
];
