import { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { isIdList, persistedSignal } from './persisted-signal';

const KEY = 'pokedev.test.v1';

describe('isIdList', () => {
  it.each([[[]], [[1, 2, 3]]])('accepte %j', (value) => {
    expect(isIdList(value)).toBe(true);
  });

  it.each([[null], ['1,2'], [[1, '2']], [[1.5]], [{ 0: 1 }]])('refuse %j', (value) => {
    expect(isIdList(value)).toBe(false);
  });
});

describe('persistedSignal', () => {
  /** Crée le signal dans un contexte d'injection, comme dans un service. */
  const create = (): WritableSignal<number[]> =>
    TestBed.runInInjectionContext(() => persistedSignal<number[]>(KEY, [], isIdList));

  beforeEach(() => localStorage.clear());

  afterEach(() => vi.restoreAllMocks());

  it('part de la valeur initiale si rien n’est sauvegardé', () => {
    expect(create()()).toEqual([]);
  });

  it('relit la valeur sauvegardée', () => {
    localStorage.setItem(KEY, '[4,2]');

    expect(create()()).toEqual([4, 2]);
  });

  it('ignore une valeur sauvegardée qui ne passe pas la validation', () => {
    localStorage.setItem(KEY, '{"id":4}');

    expect(create()()).toEqual([]);
  });

  it('ignore un contenu qui n’est pas du JSON', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    localStorage.setItem(KEY, '{pas du json');

    expect(create()()).toEqual([]);
    expect(error).toHaveBeenCalled();
  });

  it('sauvegarde chaque modification', () => {
    const state = create();

    state.set([7]);
    TestBed.tick();

    expect(localStorage.getItem(KEY)).toBe('[7]');
  });

  it('continue de fonctionner si le stockage est plein', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota dépassé', 'QuotaExceededError');
    });
    const state = create();

    state.set([7]);
    TestBed.tick();

    expect(state()).toEqual([7]);
    expect(error).toHaveBeenCalledWith(expect.any(String), 'Quota dépassé');
  });
});
