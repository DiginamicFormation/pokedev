import { Routes } from '@angular/router';
import { devIdGuard } from './core/navigation/dev-id-guard';
import { devTitleResolver, editDevTitleResolver } from './core/navigation/dev-title-resolver';
import { unsavedChangesGuard } from './core/navigation/unsaved-changes-guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'devs' },
  {
    path: 'devs',
    loadComponent: () => import('./features/dex/dex-page').then((m) => m.DexPage),
    title: 'Pokedev · Pokédex',
  },
  {
    path: 'devs/:id',
    loadComponent: () => import('./features/detail/dev-detail-page').then((m) => m.DevDetailPage),
    canActivate: [devIdGuard],
    title: devTitleResolver,
  },
  {
    path: 'devs/:id/modifier',
    loadComponent: () => import('./features/edit/edit-dev-page').then((m) => m.EditDevPage),
    canActivate: [devIdGuard],
    canDeactivate: [unsavedChangesGuard],
    title: editDevTitleResolver,
  },
  {
    path: 'equipe',
    loadComponent: () => import('./features/team/team-page').then((m) => m.TeamPage),
    title: 'Pokedev · Mon équipe',
  },
  {
    path: 'pc',
    loadComponent: () => import('./features/pc/pc-page').then((m) => m.PcPage),
    title: 'Pokedev · Mon PC',
  },
  {
    path: 'creer',
    loadComponent: () => import('./features/create/create-dev-page').then((m) => m.CreateDevPage),
    canDeactivate: [unsavedChangesGuard],
    title: 'Pokedev · Créer un dev',
  },
  {
    path: 'compte',
    loadComponent: () => import('./features/account/account-page').then((m) => m.AccountPage),
    title: 'Pokedev · Mon compte',
  },
  {
    path: 'compte/connexion',
    loadComponent: () => import('./features/account/login-page').then((m) => m.LoginPage),
    title: 'Pokedev · Connexion',
  },
  {
    path: 'compte/inscription',
    loadComponent: () => import('./features/account/register-page').then((m) => m.RegisterPage),
    title: 'Pokedev · Créer un compte',
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found-page').then((m) => m.NotFoundPage),
    title: 'Pokedev · Page introuvable',
  },
];
