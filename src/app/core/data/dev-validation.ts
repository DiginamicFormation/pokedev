import { DEV_TYPES, Dev, DevType, STAT_KEYS } from '../../domain/dev.model';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isDevType(value: unknown): value is DevType {
  return typeof value === 'string' && (DEV_TYPES as readonly string[]).includes(value);
}

/** Vérifie à l'exécution qu'une valeur a bien la forme d'un Dev. */
export function isDev(value: unknown): value is Dev {
  if (!isRecord(value) || !isRecord(value['stats'])) {
    return false;
  }
  const stats = value['stats'];
  const types = value['types'];
  const languages = value['languages'];
  return (
    typeof value['id'] === 'number' &&
    typeof value['name'] === 'string' &&
    typeof value['title'] === 'string' &&
    typeof value['catchphrase'] === 'string' &&
    Array.isArray(types) &&
    types.length >= 1 &&
    types.length <= 2 &&
    types.every(isDevType) &&
    Array.isArray(languages) &&
    languages.every((language) => typeof language === 'string') &&
    STAT_KEYS.every((key) => typeof stats[key] === 'number') &&
    (value['evolvesTo'] === undefined || typeof value['evolvesTo'] === 'number')
  );
}

/** Valide une réponse brute ; lève une erreur si elle n'est pas une liste de devs. */
export function parseDevs(raw: unknown): Dev[] {
  if (!Array.isArray(raw)) {
    throw new Error('Réponse inattendue : une liste de devs était attendue.');
  }
  const invalid = raw.findIndex((item) => !isDev(item));
  if (invalid !== -1) {
    throw new Error(`Réponse inattendue : l'élément ${invalid} n'est pas un dev valide.`);
  }
  return raw as Dev[];
}
