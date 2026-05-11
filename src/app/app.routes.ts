import { Routes } from '@angular/router';
import { Files } from './pages/files/files';
import { Method } from './pages/method/method';
import { Results } from './pages/results/results';
import { Contact } from './pages/contact/contact';
import { Help } from './pages/help/help';

export const routes: Routes = [
  { path: 'files', component: Files },
  { path: 'method', component: Method },
  { path: 'results', component: Results },
  { path: 'help', component: Help },
  { path: 'contact', component: Contact },
  { path: '', redirectTo: '/files', pathMatch: 'full' }
];