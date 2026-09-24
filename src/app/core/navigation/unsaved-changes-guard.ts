import { CanDeactivateFn } from '@angular/router';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

/** Demande confirmation avant de quitter une page qui contient des saisies non enregistrées. */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) =>
  !component.hasUnsavedChanges() ||
  confirm('Vos saisies ne sont pas enregistrées. Quitter quand même ?');
