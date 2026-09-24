import { isDev, isDevType, parseDevs } from './dev-validation';

const valid = {
  id: 1,
  name: 'Stagiairon',
  title: 'Stagiaire front-end',
  types: ['frontend'],
  stats: { code: 35, debug: 20, archi: 10, tests: 15, communication: 40, cafe: 60 },
  languages: ['HTML', 'CSS'],
  catchphrase: 'Ça marche sur ma machine.',
  evolvesTo: 2,
};

describe('isDev', () => {
  it('accepte un dev valide', () => {
    expect(isDev(valid)).toBe(true);
  });

  it.each([
    ['null', null],
    ['un id texte', { ...valid, id: '1' }],
    ['un type inconnu', { ...valid, types: ['cobol'] }],
    ['trois types', { ...valid, types: ['frontend', 'backend', 'data'] }],
    ['une statistique manquante', { ...valid, stats: { code: 1 } }],
    ['un langage non textuel', { ...valid, languages: [42] }],
    ['aucun type', { ...valid, types: [] }],
    ['un nom manquant', { ...valid, name: undefined }],
    ['une phrase fétiche manquante', { ...valid, catchphrase: undefined }],
    ['des statistiques absentes', { ...valid, stats: null }],
    ['une statistique texte', { ...valid, stats: { ...valid.stats, cafe: '60' } }],
    ['une évolution texte', { ...valid, evolvesTo: '2' }],
  ])('refuse %s', (_label, value) => {
    expect(isDev(value)).toBe(false);
  });

  it('accepte un dev sans évolution', () => {
    expect(isDev({ ...valid, evolvesTo: undefined })).toBe(true);
  });
});

describe('isDevType', () => {
  it.each(['frontend', 'securite'])('accepte « %s »', (value) => {
    expect(isDevType(value)).toBe(true);
  });

  it.each(['cobol', 'Frontend', 42, undefined])('refuse %s', (value) => {
    expect(isDevType(value)).toBe(false);
  });
});

describe('parseDevs', () => {
  it('renvoie la liste validée', () => {
    expect(parseDevs([valid])).toEqual([valid]);
  });

  it("lève une erreur si la réponse n'est pas un tableau", () => {
    expect(() => parseDevs({ devs: [] })).toThrow(/liste de devs/);
  });

  it("indique l'élément invalide", () => {
    expect(() => parseDevs([valid, { id: 2 }])).toThrow(/élément 1/);
  });
});
