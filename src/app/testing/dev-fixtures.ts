import { Dev } from '../domain/dev.model';

/** Jeu de données réduit pour les tests. */
export const TEST_DEVS: Dev[] = [
  {
    id: 1,
    name: 'Stagiairon',
    title: 'Stagiaire front-end',
    types: ['frontend'],
    progression: 180,
    stats: { code: 35, debug: 20, archi: 10, tests: 15, communication: 40, cafe: 60 },
    languages: ['HTML', 'CSS'],
    catchphrase: 'Ça marche sur ma machine.',
    evolvesTo: 2,
  },
  {
    id: 2,
    name: 'Juniorax',
    title: 'Développeur front-end junior',
    types: ['frontend'],
    progression: 240,
    stats: { code: 55, debug: 40, archi: 25, tests: 35, communication: 50, cafe: 70 },
    languages: ['TypeScript'],
    catchphrase: "J'ai trouvé la réponse sur un forum.",
  },
  {
    id: 11,
    name: 'Requêtor',
    title: 'Ingénieur data',
    types: ['data', 'backend'],
    progression: 335,
    stats: { code: 65, debug: 60, archi: 60, tests: 50, communication: 45, cafe: 55 },
    languages: ['SQL', 'Python'],
    catchphrase: 'Ajoute un index.',
  },
];
