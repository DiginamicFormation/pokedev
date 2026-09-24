import { InjectionToken } from '@angular/core';

/** Adresse de la liste des devs. Un jeton d'injection permet de la remplacer (tests, autre serveur). */
export const DEVS_URL = new InjectionToken<string>('DEVS_URL', {
  factory: () => 'data/devs.json',
});
