import { Dev, DevStats } from './dev.model';
import {
  averageStats,
  bestStat,
  filterDevs,
  formatDexNumber,
  nextId,
  previousEvolution,
  teamCoverage,
  totalStats,
} from './dev-rules';

const stats = (value: number, overrides: Partial<DevStats> = {}): DevStats => ({
  code: value,
  debug: value,
  archi: value,
  tests: value,
  communication: value,
  cafe: value,
  ...overrides,
});

const dev = (overrides: Partial<Dev> = {}): Dev => ({
  id: 1,
  name: 'Stagiairon',
  title: 'Stagiaire front',
  types: ['frontend'],
  progression: 300,
  stats: stats(50),
  languages: ['HTML', 'CSS'],
  catchphrase: 'Ça marche sur ma machine.',
  ...overrides,
});

describe('totalStats', () => {
  it('additionne les six statistiques', () => {
    expect(totalStats(stats(10))).toBe(60);
  });
});

describe('bestStat', () => {
  it('renvoie la statistique la plus élevée', () => {
    expect(bestStat(stats(10, { cafe: 90 }))).toBe('cafe');
  });

  it("renvoie la première en cas d'égalité", () => {
    expect(bestStat(stats(10))).toBe('code');
  });
});

describe('formatDexNumber', () => {
  it.each([
    [7, '#007'],
    [42, '#042'],
    [151, '#151'],
    [1024, '#1024'],
  ])('%i → %s', (id, expected) => {
    expect(formatDexNumber(id)).toBe(expected);
  });
});

describe('filterDevs', () => {
  const devs = [
    dev({ id: 1, name: 'Stagiairon', types: ['frontend'], languages: ['HTML'] }),
    dev({ id: 2, name: 'Requêtor', types: ['data', 'backend'], languages: ['SQL'] }),
    dev({ id: 3, name: 'Kubernaute', types: ['devops'], languages: ['Go'] }),
  ];

  it('ne filtre rien avec un filtre vide', () => {
    expect(filterDevs(devs, { query: '' })).toHaveLength(3);
  });

  it('filtre par type, principal ou secondaire', () => {
    expect(filterDevs(devs, { query: '', type: 'backend' }).map((d) => d.id)).toEqual([2]);
  });

  it('cherche sans tenir compte de la casse ni des accents', () => {
    expect(filterDevs(devs, { query: 'REQUETOR' }).map((d) => d.id)).toEqual([2]);
  });

  it('cherche aussi dans les langages', () => {
    expect(filterDevs(devs, { query: 'go' }).map((d) => d.id)).toEqual([3]);
  });

  it('combine type et texte', () => {
    expect(filterDevs(devs, { query: 'sql', type: 'devops' })).toEqual([]);
  });
});

describe('teamCoverage', () => {
  it("liste les types présents, dans l'ordre de référence", () => {
    const team = [dev({ types: ['data', 'backend'] }), dev({ types: ['frontend'] })];
    expect(teamCoverage(team)).toEqual(['frontend', 'backend', 'data']);
  });
});

describe('averageStats', () => {
  it('renvoie null pour une équipe vide', () => {
    expect(averageStats([])).toBeNull();
  });

  it('calcule une moyenne arrondie', () => {
    const average = averageStats([dev({ stats: stats(10) }), dev({ stats: stats(15) })]);
    expect(average?.code).toBe(13);
  });
});

describe('nextId', () => {
  it('renvoie 1 pour une liste vide', () => {
    expect(nextId([])).toBe(1);
  });

  it('renvoie le plus grand numéro + 1', () => {
    expect(nextId([dev({ id: 4 }), dev({ id: 21 }), dev({ id: 9 })])).toBe(22);
  });
});

describe('previousEvolution', () => {
  it('trouve le dev qui évolue vers le dev donné', () => {
    const junior = dev({ id: 1, evolvesTo: 2 });
    const senior = dev({ id: 2 });
    expect(previousEvolution([junior, senior], senior)).toBe(junior);
    expect(previousEvolution([junior, senior], junior)).toBeUndefined();
  });
});
