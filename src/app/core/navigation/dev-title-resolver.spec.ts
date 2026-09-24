import { ActivatedRouteSnapshot, RouterStateSnapshot, convertToParamMap } from '@angular/router';
import { devTitleResolver, editDevTitleResolver } from './dev-title-resolver';

function routeWithId(id: string): ActivatedRouteSnapshot {
  return { paramMap: convertToParamMap({ id }) } as ActivatedRouteSnapshot;
}

const state = {} as RouterStateSnapshot;

describe('devTitleResolver', () => {
  it('donne le numéro du dev façon pokédex', () => {
    expect(devTitleResolver(routeWithId('7'), state)).toBe('Pokedev · #007');
  });
});

describe('editDevTitleResolver', () => {
  it('précise que la page modifie le dev', () => {
    expect(editDevTitleResolver(routeWithId('42'), state)).toBe('Pokedev · Modifier #042');
  });
});
