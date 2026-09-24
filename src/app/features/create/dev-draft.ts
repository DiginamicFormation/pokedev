import { Dev, DevInfo, DevStats, DevType } from '../../domain/dev.model';

/** Valeurs saisies dans le formulaire d'un dev, en création comme en modification. */
export interface DevDraft {
  name: string;
  title: string;
  primaryType: DevType;
  secondaryType: DevType | '';
  stats: DevStats;
  progression: number;
  /** Langages séparés par des virgules. */
  languages: string;
  catchphrase: string;
}

export function emptyDraft(): DevDraft {
  return {
    name: '',
    title: '',
    primaryType: 'frontend',
    secondaryType: '',
    stats: { code: 50, debug: 50, archi: 50, tests: 50, communication: 50, cafe: 50 },
    progression: 0,
    languages: '',
    catchphrase: '',
  };
}

/** Valeurs de départ du formulaire pour modifier un dev existant. */
export function devToDraft(dev: Dev): DevDraft {
  return {
    name: dev.name,
    title: dev.title,
    primaryType: dev.types[0],
    secondaryType: dev.types[1] ?? '',
    stats: { ...dev.stats },
    progression: dev.progression,
    languages: dev.languages.join(', '),
    catchphrase: dev.catchphrase,
  };
}

/** « TypeScript, , SQL » → ['TypeScript', 'SQL'] */
export function splitLanguages(text: string): string[] {
  return text
    .split(',')
    .map((language) => language.trim())
    .filter((language) => language !== '');
}

export function draftToDev(draft: DevDraft): DevInfo {
  return {
    name: draft.name.trim(),
    title: draft.title.trim(),
    types: draft.secondaryType ? [draft.primaryType, draft.secondaryType] : [draft.primaryType],
    stats: { ...draft.stats },
    progression: draft.progression,
    languages: splitLanguages(draft.languages),
    catchphrase: draft.catchphrase.trim(),
  };
}
