import { TestBed } from '@angular/core/testing';
import { Loading } from './loading';

describe('Loading', () => {
  let loading: Loading;

  beforeEach(() => {
    loading = TestBed.inject(Loading);
  });

  it('est inactif au départ', () => {
    expect(loading.active()).toBe(false);
  });

  it('reste actif tant que toutes les requêtes ne sont pas terminées', () => {
    loading.start();
    loading.start();

    loading.stop();
    expect(loading.active()).toBe(true);

    loading.stop();
    expect(loading.active()).toBe(false);
  });

  it('ne compte pas en dessous de zéro', () => {
    loading.stop();

    loading.start();

    expect(loading.active()).toBe(true);
  });
});
