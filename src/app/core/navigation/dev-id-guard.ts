import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/** Refuse les numéros invalides (/devs/abc, /devs/0) et redirige vers la page 404. */
export const devIdGuard: CanActivateFn = (route) => {
  const id = Number(route.paramMap.get('id'));
  return Number.isInteger(id) && id > 0 ? true : inject(Router).parseUrl('/introuvable');
};
