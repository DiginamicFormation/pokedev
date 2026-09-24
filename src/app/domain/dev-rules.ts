import { DEV_TYPES, Dev, DevFilter, DevStats, DevType, STAT_KEYS, StatKey } from './dev.model';

/** Somme des six statistiques. */
export function totalStats(stats: DevStats): number {
  return STAT_KEYS.reduce((sum, key) => sum + stats[key], 0);
}

/** Statistique la plus élevée ; en cas d'égalité, la première dans l'ordre de STAT_KEYS. */
export function bestStat(stats: DevStats): StatKey {
  return STAT_KEYS.reduce((best, key) => (stats[key] > stats[best] ? key : best));
}

/** Numéro affiché façon pokédex : 7 → « #007 ». */
export function formatDexNumber(id: number): string {
  return `#${String(id).padStart(3, '0')}`;
}

/** Normalise une chaîne pour une recherche insensible à la casse et aux accents. */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function matchesFilter(dev: Dev, filter: DevFilter): boolean {
  if (filter.type && !dev.types.includes(filter.type)) {
    return false;
  }
  const query = normalize(filter.query);
  if (query === '') {
    return true;
  }
  return [dev.name, dev.title, ...dev.languages].some((text) => normalize(text).includes(query));
}

export function filterDevs(devs: readonly Dev[], filter: DevFilter): Dev[] {
  return devs.filter((dev) => matchesFilter(dev, filter));
}

/** Types représentés dans une équipe, dans l'ordre de DEV_TYPES. */
export function teamCoverage(devs: readonly Dev[]): DevType[] {
  return DEV_TYPES.filter((type) => devs.some((dev) => dev.types.includes(type)));
}

/** Moyenne arrondie de chaque statistique ; null pour une équipe vide. */
export function averageStats(devs: readonly Dev[]): DevStats | null {
  if (devs.length === 0) {
    return null;
  }
  const average = {} as DevStats;
  for (const key of STAT_KEYS) {
    average[key] = Math.round(devs.reduce((sum, dev) => sum + dev.stats[key], 0) / devs.length);
  }
  return average;
}

/** Numéro libre suivant : le plus grand numéro existant + 1. */
export function nextId(devs: readonly Dev[]): number {
  return devs.reduce((max, dev) => Math.max(max, dev.id), 0) + 1;
}

/** Le dev qui évolue vers `dev`, s'il existe. */
export function previousEvolution(devs: readonly Dev[], dev: Dev): Dev | undefined {
  return devs.find((candidate) => candidate.evolvesTo === dev.id);
}
