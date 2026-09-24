import { TEST_DEVS } from '../../testing/dev-fixtures';
import { backupFileName, createBackup, parseBackup } from './backup-file';

const DATE = new Date('2026-09-24T10:30:00Z');

/** Texte d'un fichier de sauvegarde valide, modifié par `changes`. */
function backupText(changes: Record<string, unknown> = {}): string {
  return JSON.stringify({ ...createBackup([TEST_DEVS[0]], [TEST_DEVS[2]], DATE), ...changes });
}

describe('backup-file', () => {
  it('relit une sauvegarde exportée', () => {
    const backup = createBackup([TEST_DEVS[0]], [TEST_DEVS[1], TEST_DEVS[2]], DATE);

    expect(parseBackup(JSON.stringify(backup))).toEqual(backup);
  });

  it('nomme le fichier avec la date de l’export', () => {
    expect(backupFileName(createBackup([], [], DATE))).toBe('pokedev-2026-09-24.json');
  });

  it('refuse un fichier qui n’est pas du JSON', () => {
    expect(() => parseBackup('{pas du json')).toThrow('pas un fichier JSON valide');
  });

  it('refuse un JSON qui n’est pas une sauvegarde', () => {
    expect(() => parseBackup(JSON.stringify(TEST_DEVS))).toThrow('pas une sauvegarde Pokedev');
  });

  it('refuse une autre version', () => {
    expect(() => parseBackup(backupText({ version: 2 }))).toThrow('version');
  });

  it('refuse un dev invalide', () => {
    expect(() => parseBackup(backupText({ pc: [{ id: 'x' }] }))).toThrow('dev invalide');
  });

  it('refuse une sauvegarde incomplète', () => {
    expect(() => parseBackup(backupText({ team: undefined }))).toThrow('incomplète');
  });

  it('refuse une équipe de plus de six devs', () => {
    const team = Array.from({ length: 7 }, (_, i) => ({ ...TEST_DEVS[0], id: i + 1 }));

    expect(() => parseBackup(backupText({ team }))).toThrow('dépasse 6 devs');
  });
});
