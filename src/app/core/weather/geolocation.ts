import { InjectionToken } from '@angular/core';

/**
 * Géolocalisation du navigateur. Un jeton d'injection permet de la simuler dans les tests ;
 * elle vaut undefined là où elle n'existe pas (jsdom, vieux navigateurs).
 */
export const GEOLOCATION = new InjectionToken<Geolocation | undefined>('GEOLOCATION', {
  factory: () => globalThis.navigator?.geolocation,
});

export interface Coordinates {
  readonly latitude: number;
  readonly longitude: number;
}

/** La position n'a pas pu être obtenue ; `denied` vaut vrai si l'utilisateur l'a refusée. */
export class PositionUnavailableError extends Error {
  constructor(readonly denied: boolean) {
    super(denied ? 'Géolocalisation refusée.' : 'Position indisponible.');
  }
}

/** Valeur de GeolocationPositionError.PERMISSION_DENIED, classe absente de certains environnements. */
const PERMISSION_DENIED = 1;

/** Arrondi au centième de degré, soit environ 1 km : une météo n'a pas besoin de plus. */
const round = (degrees: number) => Math.round(degrees * 100) / 100;

/** Position actuelle, arrondie pour ne pas transmettre plus de précision que nécessaire. */
export function locate(geolocation: Geolocation | undefined): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!geolocation) {
      reject(new PositionUnavailableError(false));
      return;
    }
    geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({ latitude: round(coords.latitude), longitude: round(coords.longitude) }),
      (error) => reject(new PositionUnavailableError(error.code === PERMISSION_DENIED)),
      // Une position de moins de 10 minutes suffit ; au-delà de 15 secondes, on abandonne.
      { maximumAge: 10 * 60 * 1000, timeout: 15 * 1000 },
    );
  });
}
