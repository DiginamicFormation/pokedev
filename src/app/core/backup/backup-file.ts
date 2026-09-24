import { Dev, MAX_TEAM_SIZE } from '../../domain/dev.model';
import { isDev } from '../data/dev-validation';

const BACKUP_FORMAT = 'pokedev-backup';
const BACKUP_VERSION = 1;

/**
 * Contenu d'un fichier de sauvegarde : l'équipe et le PC, avec les devs complets.
 * Les devs personnalisés n'existent que dans le navigateur qui les a créés :
 * les exporter en entier permet de les recréer ailleurs.
 */
export interface BackupFile {
  readonly format: typeof BACKUP_FORMAT;
  readonly version: typeof BACKUP_VERSION;
  /** Date de l'export au format ISO. */
  readonly exportedAt: string;
  readonly team: readonly Dev[];
  readonly pc: readonly Dev[];
}

export function createBackup(team: readonly Dev[], pc: readonly Dev[], date: Date): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: date.toISOString(),
    team,
    pc,
  };
}

/** Nom du fichier proposé au téléchargement : pokedev-2026-09-24.json */
export function backupFileName(backup: BackupFile): string {
  return `pokedev-${backup.exportedAt.slice(0, 10)}.json`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDevList(value: unknown): value is Dev[] {
  return Array.isArray(value) && value.every(isDev);
}

/** Lit le texte d'un fichier de sauvegarde ; lève une erreur au message affichable s'il est invalide. */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Ce fichier n'est pas un fichier JSON valide.");
  }
  if (!isRecord(raw) || raw['format'] !== BACKUP_FORMAT) {
    throw new Error("Ce fichier n'est pas une sauvegarde Pokedev.");
  }
  if (raw['version'] !== BACKUP_VERSION) {
    throw new Error("Cette version de sauvegarde n'est pas prise en charge.");
  }
  const { exportedAt, team, pc } = raw;
  if (typeof exportedAt !== 'string' || !isDevList(team) || !isDevList(pc)) {
    throw new Error('La sauvegarde est incomplète ou contient un dev invalide.');
  }
  if (team.length > MAX_TEAM_SIZE) {
    throw new Error(`L'équipe de la sauvegarde dépasse ${MAX_TEAM_SIZE} devs.`);
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt, team, pc };
}
