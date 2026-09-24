import { DexNumberPipe } from './dex-number-pipe';
import { TotalStatsPipe } from './total-stats-pipe';
import { TypeLabelPipe } from './type-label-pipe';

describe('DexNumberPipe', () => {
  it('complète le numéro sur trois chiffres', () => {
    expect(new DexNumberPipe().transform(7)).toBe('#007');
  });

  it.each([
    [123, '#123'],
    [1024, '#1024'],
  ])('test %i → %s', (id, expected) => {
    expect(new DexNumberPipe().transform(id)).toBe(expected);
  });
});

describe('TypeLabelPipe', () => {
  it('renvoie le libellé français', () => {
    expect(new TypeLabelPipe().transform('securite')).toBe('Sécurité');
  });
});

describe('TotalStatsPipe', () => {
  it('additionne les six statistiques', () => {
    const stats = { code: 35, debug: 20, archi: 10, tests: 15, communication: 40, cafe: 60 };
    expect(new TotalStatsPipe().transform(stats)).toBe(180);
  });
});
