import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { devIdGuard } from './dev-id-guard';
import { HasUnsavedChanges, unsavedChangesGuard } from './unsaved-changes-guard';

function routeWithId(id: string): ActivatedRouteSnapshot {
  return { paramMap: convertToParamMap({ id }) } as ActivatedRouteSnapshot;
}

describe('devIdGuard', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  const run = (id: string) =>
    TestBed.runInInjectionContext(() => devIdGuard(routeWithId(id), {} as RouterStateSnapshot));

  it('accepte un numéro entier positif', () => {
    expect(run('7')).toBe(true);
  });

  it.each(['abc', '0', '-3', '2.5'])('redirige « %s » vers la page 404', (id) => {
    const result = run(id);
    expect(result).toBeInstanceOf(UrlTree);
    expect(String(result)).toBe('/introuvable');
  });
});

describe('unsavedChangesGuard', () => {
  const run = (dirty: boolean) =>
    unsavedChangesGuard(
      { hasUnsavedChanges: () => dirty } as HasUnsavedChanges,
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
      {} as RouterStateSnapshot,
    );

  afterEach(() => vi.restoreAllMocks());

  it('laisse partir sans question si rien n’est modifié', () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    expect(run(false)).toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it("suit la réponse de l'utilisateur sinon", () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    expect(run(true)).toBe(false);
    expect(confirmSpy).toHaveBeenCalled();
  });
});
