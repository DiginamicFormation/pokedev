/** Géolocalisation simulée pour les tests : `answer` reçoit les rappels de succès et d'erreur. */
export function fakeGeolocation(
  answer: (success: PositionCallback, error: PositionErrorCallback) => void,
): Geolocation {
  return {
    getCurrentPosition: (success: PositionCallback, error?: PositionErrorCallback | null) =>
      answer(success, error!),
  } as Geolocation;
}

/** Géolocalisation qui trouve la position donnée. */
export const locatedAt = (latitude: number, longitude: number) =>
  fakeGeolocation((success) => success({ coords: { latitude, longitude } } as GeolocationPosition));

/** Géolocalisation qui échoue avec le code donné (1 : refusée, 2 : introuvable, 3 : délai dépassé). */
export const failingWith = (code: number) =>
  fakeGeolocation((_, error) => error({ code, message: '' } as GeolocationPositionError));
