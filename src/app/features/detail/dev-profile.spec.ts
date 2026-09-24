import { ApplicationRef } from '@angular/core';
import { ComponentFixture, DeferBlockState, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { DevRepository } from '../../core/data/dev-repository';
import { Confirmation } from '../../core/dialog/confirmation';
import { Pc } from '../../core/pc/pc';
import { Team } from '../../core/team/team';
import { Dev } from '../../domain/dev.model';
import { TEST_DEVS } from '../../testing/dev-fixtures';
import { DevProfile } from './dev-profile';

const [STAGIAIRON, JUNIORAX, REQUETOR] = TEST_DEVS;
/** Dev créé par l'utilisateur : le seul genre de dev modifiable et supprimable. */
const TESTEUSE: Dev = { ...JUNIORAX, id: 12, name: 'Testeuse', custom: true };

describe('DevProfile', () => {
  let fixture: ComponentFixture<DevProfile>;
  let element: HTMLElement;

  const stable = () => TestBed.inject(ApplicationRef).whenStable();

  /** Affiche la fiche d'un dev, une fois le pokédex chargé (devs personnalisés compris). */
  async function render(dev: Dev): Promise<void> {
    localStorage.clear();
    if (dev.custom) {
      localStorage.setItem('pokedev.custom-devs.v1', JSON.stringify([dev]));
    }
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(DevProfile);
    fixture.componentRef.setInput('dev', dev);
    element = fixture.nativeElement;
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne('data/devs.json').flush(TEST_DEVS);
    await stable();
  }

  const byText = <T extends HTMLElement>(selector: string, text: string) =>
    Array.from(element.querySelectorAll<T>(selector)).find(
      (node) => node.textContent?.trim() === text,
    );
  /** Texte de la fiche, espaces du template réduits. */
  const text = () => element.textContent?.replace(/\s+/g, ' ');

  async function click(text: string): Promise<void> {
    byText<HTMLButtonElement>('button', text)!.click();
    await stable();
  }

  describe('fiche de Juniorax', () => {
    beforeEach(() => render(JUNIORAX));

    it("affiche l'identité du dev", () => {
      expect(element.querySelector('h1')?.textContent).toBe('Juniorax');
      expect(element.textContent).toContain('#002');
      expect(element.textContent).toContain('Développeur front-end junior');
      expect(element.querySelector('app-type-badge')?.textContent).toBe('Front-end');
      expect(element.querySelector('blockquote')?.textContent).toBe(
        "« J'ai trouvé la réponse sur un forum. »",
      );
      expect(element.querySelector('.languages')?.textContent?.trim()).toBe('TypeScript');
    });

    it('affiche chaque statistique et leur total', () => {
      const meter = (selector: string) =>
        element.querySelector(`app-stat-bar${selector}`)?.getAttribute('aria-valuenow');

      expect(meter('[aria-label="Code"]')).toBe('55');
      expect(meter('[aria-label="Café"]')).toBe('70');
      // La jauge du total est la seule graduée sur 420.
      expect(meter('[aria-valuemax="420"]')).toBe('275');
    });

    it('met en avant la meilleure statistique du dev', () => {
      expect(text()).toContain('Café : 70/100, rang 1 sur 3.');
      expect(byText('button', 'Café')?.getAttribute('aria-pressed')).toBe('true');
    });

    it('met en avant la statistique choisie', async () => {
      await click('Code');

      expect(text()).toContain('Code : 55/100, rang 2 sur 3.');
      expect(byText('button', 'Code')?.getAttribute('aria-pressed')).toBe('true');
      expect(byText('button', 'Café')?.getAttribute('aria-pressed')).toBe('false');
    });

    it('oublie la statistique choisie quand on passe à un autre dev', async () => {
      await click('Tests');

      fixture.componentRef.setInput('dev', REQUETOR);
      await stable();

      // La meilleure statistique de Requêtor est le code.
      expect(text()).toContain('Code : 65/100, rang 1 sur 3.');
    });

    it('relie le dev à sa forme précédente', () => {
      expect(byText('a', '← Stagiairon')?.getAttribute('href')).toBe('/devs/1');
      expect(text()).not.toContain('→');
    });

    it("ne propose ni modification ni suppression d'un dev du pokédex d'origine", () => {
      expect(byText('a', 'Modifier')).toBeUndefined();
      expect(byText('button', 'Supprimer')).toBeUndefined();
      expect(text()).toContain('Dev du pokédex d’origine : ni modifiable, ni supprimable.');
    });

    it("ajoute le dev à l'équipe puis l'en retire", async () => {
      const team = TestBed.inject(Team);

      await click('Ajouter à l’équipe');
      expect(team.has(2)).toBe(true);

      await click('Retirer de l’équipe');
      expect(team.has(2)).toBe(false);
    });

    it("propose le PC quand l'équipe est pleine", async () => {
      const repository = TestBed.inject(DevRepository);
      TestBed.inject(Team).replace(
        ['A', 'B', 'C', 'D', 'E', 'F'].map((name) => repository.add({ ...STAGIAIRON, name })),
      );
      const ask = vi.spyOn(TestBed.inject(Confirmation), 'ask').mockResolvedValue(true);
      await stable();

      byText<HTMLButtonElement>('button', 'Ajouter à l’équipe')!.click();
      await vi.waitFor(() => expect(TestBed.inject(Pc).has(2)).toBe(true));
      await stable();

      expect(ask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Équipe pleine' }));
      expect(byText<HTMLButtonElement>('button', 'Déjà au PC')?.disabled).toBe(true);
    });

    it('liste les autres devs du même type quand la section devient visible', async () => {
      expect(text()).toContain('Devs du même type…');

      const [sameType] = await fixture.getDeferBlocks();
      await sameType.render(DeferBlockState.Complete);

      expect(byText('a', '#001 Stagiairon')?.getAttribute('href')).toBe('/devs/1');
    });
  });

  describe("fiche d'un dev personnalisé", () => {
    beforeEach(() => render(TESTEUSE));

    it('propose un lien vers la modification du dev', () => {
      expect(byText('a', 'Modifier')?.getAttribute('href')).toBe('/devs/12/modifier');
      expect(text()).not.toContain('ni modifiable');
    });

    it("supprime le dev après confirmation, et le retire de l'équipe et du PC", async () => {
      const team = TestBed.inject(Team);
      const pc = TestBed.inject(Pc);
      team.toggle(12);
      pc.add(12);
      const ask = vi.spyOn(TestBed.inject(Confirmation), 'ask').mockResolvedValue(true);
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      await click('Supprimer');

      expect(ask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Supprimer Testeuse ?' }));
      expect(TestBed.inject(DevRepository).byId(12)).toBeUndefined();
      expect(team.has(12)).toBe(false);
      expect(pc.has(12)).toBe(false);
      expect(navigate).toHaveBeenCalledWith(['/devs']);
    });

    it("ne supprime rien si l'utilisateur annule", async () => {
      vi.spyOn(TestBed.inject(Confirmation), 'ask').mockResolvedValue(false);
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');

      await click('Supprimer');

      expect(TestBed.inject(DevRepository).byId(12)?.name).toBe('Testeuse');
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  it('relie le dev à son évolution', async () => {
    await render(STAGIAIRON);

    const next = Array.from(element.querySelectorAll('.evolution a')).at(-1);
    expect(next?.textContent?.trim()).toBe('Juniorax →');
    expect(next?.getAttribute('href')).toBe('/devs/2');
  });

  it("n'affiche pas d'évolution pour un dev qui n'en a pas", async () => {
    await render(REQUETOR);

    expect(element.querySelector('#evolution-title')).toBeNull();
  });

  it('signale un dev sans autre dev du même type', async () => {
    await render(REQUETOR);

    const [sameType] = await fixture.getDeferBlocks();
    await sameType.render(DeferBlockState.Complete);

    expect(element.textContent).toContain('Aucun autre dev de ce type.');
  });

  it('signale un dev sans langage', async () => {
    await render({ ...JUNIORAX, languages: [] });

    expect(element.textContent).toContain('Aucun langage renseigné.');
  });
});
