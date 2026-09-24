import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TEST_DEVS } from '../../testing/dev-fixtures';
import { DevCard } from './dev-card';

describe('DevCard', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  async function render(inTeam = false, teamFull = false, inPc = false) {
    const fixture = TestBed.createComponent(DevCard);
    fixture.componentRef.setInput('dev', TEST_DEVS[2]);
    fixture.componentRef.setInput('inTeam', inTeam);
    fixture.componentRef.setInput('teamFull', teamFull);
    fixture.componentRef.setInput('inPc', inPc);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('le composant est instancié', async () => {
    const { element } = await render();
    const text = element.textContent ?? '';

    expect(text).not.toBe('');
  });

  it('affiche le numéro, le nom, les types et le niveau', async () => {
    const { element } = await render();
    const text = element.textContent ?? '';

    expect(text).toContain('#011');
    expect(text).toContain('Requêtor');
    expect(text).toContain('Data');
    expect(text).toContain('Back-end');
    expect(element.querySelector('.total')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Confirmé (335 points)',
    );
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/devs/11');
  });

  it('émet le numéro du dev au clic', async () => {
    const { fixture, element } = await render();
    const emitted: number[] = [];
    fixture.componentInstance.teamToggled.subscribe((id) => emitted.push(id));

    element.querySelector('button')!.click();

    expect(emitted).toEqual([11]);
  });

  it("distingue un membre de l'équipe", async () => {
    const outside = (await render(false)).element;
    expect(outside.querySelector('.card')?.classList).not.toContain('in-team');
    expect(outside.querySelector('button')?.getAttribute('aria-pressed')).toBe('false');

    const member = (await render(true)).element;
    expect(member.querySelector('.card')?.classList).toContain('in-team');
    expect(member.querySelector('button')?.getAttribute('aria-pressed')).toBe('true');
  });

  it("quand l'équipe est pleine : le bouton n'est pas désactivé", async () => {
    const { element } = await render(false, true);
    expect(element.querySelector('button')!.disabled).toBe(false);
    expect(element.querySelector('button')?.textContent).toContain('Ajouter à l’équipe');
  });

  it("permet de retirer un membre lorsque l'équipe est pleine", async () => {
    const { element } = await render(true, true);
    const button = element.querySelector('button')!;
    expect(button.disabled).toBe(false);
    expect(button.textContent).toContain('Retirer');
  });

  it('signale que le dev est au PC', async () => {
    const { element } = await render(false, true, true);
    const button = element.querySelector('button')!;
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('PC');
  });
});
