/** Les six types de développeur, équivalents des types élémentaires d'un pokédex. */
export const DEV_TYPES = ['frontend', 'backend', 'devops', 'data', 'mobile', 'securite'] as const;
export type DevType = (typeof DEV_TYPES)[number];

/** Les six statistiques d'un dev, chacune entre 0 et MAX_STAT. */
export const STAT_KEYS = ['code', 'debug', 'archi', 'tests', 'communication', 'cafe'] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type DevStats = Record<StatKey, number>;

export const MAX_STAT = 100;
export const MAX_TOTAL = 420;
export const MAX_TEAM_SIZE = 6;

export interface Dev {
  readonly id: number;
  readonly name: string;
  readonly title: string;
  /** Un ou deux types, le premier est le type principal. */
  readonly types: readonly DevType[];
  readonly stats: DevStats;
  progression: number;
  readonly languages: readonly string[];
  readonly catchphrase: string;
  /** Numéro du dev vers lequel celui-ci évolue. */
  readonly evolvesTo?: number;
  /**
   * Vrai pour un dev créé par l'utilisateur : seuls ceux-là peuvent être modifiés ou supprimés,
   * les devs du fichier JSON sont en lecture seule.
   */
  readonly custom?: boolean;
}

/** Tout ce qui décrit un dev, sauf son numéro et son origine, gérés par le dépôt. */
export type DevInfo = Omit<Dev, 'id' | 'custom'>;

export interface DevFilter {
  readonly query: string;
  readonly type?: DevType;
}
