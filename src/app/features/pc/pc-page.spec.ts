import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DevRepository } from '../../core/data/dev-repository';
import { Pc } from '../../core/pc/pc';
import { Team } from '../../core/team/team';
import { TEST_DEVS } from '../../testing/dev-fixtures';
import { PcPage } from './pc-page';

describe('PcPage', () => {
  let element: HTMLElement;
  let pc: Pc;
  let team: Team;

  const stable = () => TestBed.inject(ApplicationRef).whenStable();

  /** Affiche la page ; le fichier JSON n'est chargé que si `load` est vrai. */
  async function render(load = true): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(PcPage);
    element = fixture.nativeElement;
    pc = TestBed.inject(Pc);
    team = TestBed.inject(Team);
    TestBed.tick();
    if (load) {
      TestBed.inject(HttpTestingController).expectOne('data/devs.json').flush(TEST_DEVS);
      await stable();
    } else {
      // La requête reste en attente : l'application ne sera jamais stable.
      TestBed.tick();
    }
  }

  /** Range des devs dans le PC puis attend le rendu. */
  async function store(...ids: number[]): Promise<void> {
    pc.replace(ids);
    await stable();
  }

  const current = () => element.querySelector('.slide h2')?.textContent?.trim();
  const position = () => element.querySelector('.position')?.textContent?.trim();
  const button = (text: string) =>
    Array.from(element.querySelectorAll('button')).find(
      (node) => node.textContent?.trim() === text || node.getAttribute('aria-label') === text,
    )!;

  async function click(text: string): Promise<void> {
    button(text).click();
    await stable();
  }

  async function press(key: 'ArrowLeft' | 'ArrowRight'): Promise<void> {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    await stable();
  }

  beforeEach(() => localStorage.clear());

  it('invite à parcourir le pokédex quand le PC est vide', async () => {
    await render();

    expect(element.querySelector('h1')?.textContent).toBe('Mon PC (0)');
    expect(element.textContent).toContain('Votre PC est vide.');
    expect(element.querySelector('app-empty-state a')?.getAttribute('href')).toBe('/devs');
  });

  it('patiente pendant le chargement du pokédex', async () => {
    localStorage.setItem('pokedev.pc.v1', '[2]');
    await render(false);

    expect(element.textContent).toContain('Chargement du PC…');
  });

  it('affiche le premier dev du PC', async () => {
    await render();
    await store(1, 2, 11);

    expect(element.querySelector('h1')?.textContent).toBe('Mon PC (3)');
    expect(current()).toBe('Stagiairon');
    expect(position()).toBe('1 / 3');
    expect(element.querySelector('.slide a')?.getAttribute('href')).toBe('/devs/1');
  });

  it('présente le dev : poste, types, phrase fétiche et total', async () => {
    await render();
    await store(11);

    const slide = element.querySelector('.slide')!;
    expect(slide.textContent).toContain('#011');
    expect(slide.textContent).toContain('Ingénieur data');
    expect(Array.from(slide.querySelectorAll('app-type-badge')).map((b) => b.textContent)).toEqual([
      'Data',
      'Back-end',
    ]);
    expect(slide.querySelector('blockquote')?.textContent).toBe('« Ajoute un index. »');
    expect(slide.querySelector('app-stat-bar')?.getAttribute('aria-valuenow')).toBe('335');
  });

  it('passe au dev suivant et boucle à la fin', async () => {
    await render();
    await store(1, 2, 11);

    await click('Dev suivant');
    expect(current()).toBe('Juniorax');

    await click('Dev suivant');
    await click('Dev suivant');
    expect(current()).toBe('Stagiairon');
  });

  it('revient au dev précédent et boucle au début', async () => {
    await render();
    await store(1, 2, 11);

    await click('Dev précédent');

    expect(current()).toBe('Requêtor');
    expect(position()).toBe('3 / 3');
  });

  it('se pilote avec les flèches du clavier', async () => {
    await render();
    await store(1, 2, 11);

    await press('ArrowRight');
    expect(current()).toBe('Juniorax');

    await press('ArrowLeft');
    await press('ArrowLeft');
    expect(current()).toBe('Requêtor');
  });

  it('ignore les flèches du clavier quand le PC est vide', async () => {
    await render();

    await press('ArrowRight');
    await store(11);

    // La position n'a pas été faussée : le carrousel fonctionne dès l'arrivée d'un dev.
    expect(current()).toBe('Requêtor');
    expect(position()).toBe('1 / 1');
  });

  it('affiche le dev choisi dans les vignettes', async () => {
    await render();
    await store(1, 2, 11);

    await click('Requêtor');

    expect(current()).toBe('Requêtor');
    const thumbs = Array.from(element.querySelectorAll('.thumb'));
    expect(thumbs.map((thumb) => thumb.getAttribute('aria-current'))).toEqual([null, null, 'true']);
  });

  it("désactive les flèches s'il n'y a qu'un dev", async () => {
    await render();
    await store(11);

    expect(button('Dev précédent').disabled).toBe(true);
    expect(button('Dev suivant').disabled).toBe(true);
  });

  it("envoie le dev dans l'équipe et affiche le suivant à sa place", async () => {
    await render();
    await store(1, 2, 11);
    await click('Dev suivant');

    await click('Ajouter à l’équipe');

    expect(team.has(2)).toBe(true);
    expect(pc.has(2)).toBe(false);
    expect(current()).toBe('Requêtor');
    expect(position()).toBe('2 / 2');
  });

  it('reste sur le dernier dev quand on retire le dernier', async () => {
    await render();
    await store(1, 2, 11);
    await click('Dev précédent');

    await click('Retirer du PC');

    expect(pc.has(11)).toBe(false);
    expect(current()).toBe('Juniorax');
  });

  it("empêche l'ajout quand l'équipe est pleine", async () => {
    await render();
    const repository = TestBed.inject(DevRepository);
    team.replace(
      ['A', 'B', 'C', 'D', 'E', 'F'].map((name) => repository.add({ ...TEST_DEVS[0], name })),
    );
    await store(11);

    expect(button('Ajouter à l’équipe').disabled).toBe(true);
    expect(element.textContent).toContain('Équipe pleine : retirez un membre');
  });
});
