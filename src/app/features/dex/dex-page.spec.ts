import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Confirmation } from '../../core/dialog/confirmation';
import { DevRepository } from '../../core/data/dev-repository';
import { Pc } from '../../core/pc/pc';
import { Team } from '../../core/team/team';
import { TEST_DEVS } from '../../testing/dev-fixtures';
import { DexPage } from './dex-page';

describe('DexPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function render(type?: string) {
    const fixture = TestBed.createComponent(DexPage);
    if (type) {
      fixture.componentRef.setInput('type', type);
    }
    TestBed.tick();
    http.expectOne('data/devs.json').flush(TEST_DEVS);
    await TestBed.inject(ApplicationRef).whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const names = (element: HTMLElement) =>
    Array.from(element.querySelectorAll('app-dev-card h3')).map((h3) => h3.textContent?.trim());

  it('affiche tous les devs', async () => {
    const element = await render();
    expect(names(element)).toEqual(['Stagiairon', 'Juniorax', 'Requêtor']);
    expect(element.textContent).toContain('3 dev(s)');
  });

  it('filtre selon le paramètre de requête type', async () => {
    const element = await render('backend');
    expect(names(element)).toEqual(['Requêtor']);
  });

  it('met en avant le filtre de type actif', async () => {
    const link = (element: HTMLElement, text: string) =>
      Array.from(element.querySelectorAll<HTMLAnchorElement>('.types a')).find(
        (a) => a.textContent?.trim() === text,
      )!;

    const element = await render('backend');

    expect(link(element, 'Back-end').classList).toContain('active');
    expect(link(element, 'Back-end').getAttribute('aria-current')).toBe('true');
    expect(link(element, 'Back-end').getAttribute('href')).toBe('/?type=backend');
    expect(link(element, 'Tous').classList).not.toContain('active');
    expect(link(element, 'Data').getAttribute('aria-current')).toBeNull();
  });

  it('met en avant « Tous » sans filtre de type', async () => {
    const element = await render();

    expect(element.querySelector('.types a.active')?.textContent?.trim()).toBe('Tous');
    expect(element.querySelector('.types a[aria-current]')).toBeNull();
  });

  it('ignore un type inconnu', async () => {
    const element = await render('cobol');
    expect(names(element)).toHaveLength(3);
  });

  it('filtre selon la recherche après le debounce', async () => {
    const element = await render();
    const input = element.querySelector<HTMLInputElement>('#search')!;
    input.value = 'junior';
    input.dispatchEvent(new Event('input'));

    await new Promise((resolve) => setTimeout(resolve, 250));
    await TestBed.inject(ApplicationRef).whenStable();

    expect(names(element)).toEqual(['Juniorax']);
  });

  it('ajoute un dev à l’équipe depuis sa carte', async () => {
    const element = await render();
    element.querySelector<HTMLButtonElement>('app-dev-card button')!.click();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(element.querySelector('app-dev-card button')?.textContent).toContain('Retirer');
  });

  it('ne recharge pas la page quand on valide la recherche', async () => {
    const element = await render();
    const submit = new Event('submit', { cancelable: true });

    element.querySelector('form')!.dispatchEvent(submit);

    expect(submit.defaultPrevented).toBe(true);
  });

  it('propose de réessayer si le pokédex ne se charge pas', async () => {
    const fixture = TestBed.createComponent(DexPage);
    const element: HTMLElement = fixture.nativeElement;
    TestBed.tick();
    http.expectOne('data/devs.json').flush('Erreur', { status: 500, statusText: 'Server Error' });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(element.textContent).toContain('Impossible de charger le pokédex.');
    element.querySelector<HTMLButtonElement>('app-empty-state button')!.click();
    TestBed.tick();
    http.expectOne('data/devs.json').flush(TEST_DEVS);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(names(element)).toHaveLength(3);
  });

  it("propose le PC quand l'équipe est pleine", async () => {
    const element = await render();
    const repository = TestBed.inject(DevRepository);
    TestBed.inject(Team).replace(
      ['A', 'B', 'C', 'D', 'E', 'F'].map((name) => repository.add({ ...TEST_DEVS[0], name })),
    );
    const ask = vi.spyOn(TestBed.inject(Confirmation), 'ask').mockResolvedValue(true);
    await TestBed.inject(ApplicationRef).whenStable();

    element.querySelector<HTMLButtonElement>('app-dev-card button')!.click();
    await vi.waitFor(() => expect(TestBed.inject(Pc).has(1)).toBe(true));

    expect(ask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Équipe pleine' }));
  });

  describe('raccourci « / »', () => {
    /** Appuie sur une touche depuis un élément, comme le ferait le navigateur. */
    function press(key: string, from: Element = document.body, shiftKey = false): KeyboardEvent {
      const event = new KeyboardEvent('keydown', {
        key,
        shiftKey,
        bubbles: true,
        cancelable: true,
      });
      from.dispatchEvent(event);
      return event;
    }

    it('place le curseur dans la recherche', async () => {
      const element = await render();

      const event = press('/');

      expect(document.activeElement).toBe(element.querySelector('#search'));
      expect(event.defaultPrevented).toBe(true);
    });

    it('fonctionne avec Maj, comme sur un clavier AZERTY', async () => {
      const element = await render();

      press('/', document.body, true);

      expect(document.activeElement).toBe(element.querySelector('#search'));
    });

    it('laisse taper « / » dans un champ de saisie', async () => {
      await render();
      const field = document.body.appendChild(document.createElement('textarea'));
      field.focus();

      const event = press('/', field);

      expect(document.activeElement).toBe(field);
      expect(event.defaultPrevented).toBe(false);
      field.remove();
    });

    it('ignore les autres touches', async () => {
      const element = await render();

      const event = press('a');

      expect(document.activeElement).not.toBe(element.querySelector('#search'));
      expect(event.defaultPrevented).toBe(false);
    });
  });
});
