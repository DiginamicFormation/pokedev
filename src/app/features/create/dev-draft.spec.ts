import { TEST_DEVS } from '../../testing/dev-fixtures';
import { devToDraft, draftToDev, emptyDraft, splitLanguages } from './dev-draft';

describe('splitLanguages', () => {
  it('découpe, nettoie et ignore les éléments vides', () => {
    expect(splitLanguages(', TypeScript, , SQL ,')).toEqual(['TypeScript', 'SQL']);
  });
});

describe('draftToDev', () => {
  it("n'ajoute pas de type secondaire vide", () => {
    const dev = draftToDev({ ...emptyDraft(), name: ' Testeuse ', primaryType: 'data' });
    expect(dev.name).toBe('Testeuse');
    expect(dev.types).toEqual(['data']);
  });

  it('conserve le type secondaire', () => {
    const dev = draftToDev({ ...emptyDraft(), primaryType: 'data', secondaryType: 'backend' });
    expect(dev.types).toEqual(['data', 'backend']);
  });
});

describe('devToDraft', () => {
  it('reprend les types et les langages du dev', () => {
    const draft = devToDraft(TEST_DEVS[2]);
    expect(draft.primaryType).toBe('data');
    expect(draft.secondaryType).toBe('backend');
    expect(draft.languages).toBe('SQL, Python');
  });

  it("laisse le type secondaire vide pour un dev d'un seul type", () => {
    expect(devToDraft(TEST_DEVS[1]).secondaryType).toBe('');
  });

  it('redonne le même dev si le formulaire est renvoyé sans changement', () => {
    expect({ id: 11, ...draftToDev(devToDraft(TEST_DEVS[2])) }).toEqual(TEST_DEVS[2]);
  });
});
