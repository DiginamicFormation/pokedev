import { TestBed } from '@angular/core/testing';
import { RankLabel } from './rank-label';

describe('RankLabel', () => {
  async function render(total: number): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(RankLabel);
    fixture.componentRef.setInput('total', total);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it.each([
    [0, 'Junior'],
    [249, 'Junior'],
    [250, 'Confirmé'],
    [349, 'Confirmé'],
    [350, 'Senior'],
    [420, 'Senior'],
  ])('classe un total de %i en %s', async (total, rank) => {
    const element = await render(total);

    expect(element.textContent).toContain(rank);
    expect(element.textContent).toContain(`(${total} points)`);
  });

  it('met le niveau senior en valeur', async () => {
    expect((await render(350)).querySelector('strong')?.textContent).toBe('Senior');
    expect((await render(349)).querySelector('strong')).toBeNull();
  });
});
