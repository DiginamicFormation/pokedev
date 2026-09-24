import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DevRepository } from '../../core/data/dev-repository';
import { Team } from '../../core/team/team';
import { TEST_DEVS } from '../../testing/dev-fixtures';
import { TeamPage } from './team-page';

describe('TeamPage', () => {
  let element: HTMLElement;
  let team: Team;

  const stable = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(TeamPage);
    element = fixture.nativeElement;
    team = TestBed.inject(Team);
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne('data/devs.json').flush(TEST_DEVS);
    await stable();
  });

  /** Compose l'équipe puis attend le rendu. */
  async function recruit(...ids: number[]): Promise<void> {
    team.replace(ids);
    await stable();
  }

  /** Texte de la page, espaces du template réduits. */
  const text = () => element.textContent?.replace(/\s+/g, ' ');
  const members = () =>
    Array.from(element.querySelectorAll('.members a')).map((link) => link.textContent?.trim());
  const meter = (label: string) =>
    element.querySelector(`app-stat-bar[aria-label="${label}"]`)?.getAttribute('aria-valuenow');
  const button = (text: string) =>
    Array.from(element.querySelectorAll('button')).find(
      (node) => node.textContent?.trim() === text,
    )!;

  it('invite à choisir des devs quand l’équipe est vide', () => {
    expect(element.querySelector('h1')?.textContent).toBe('Mon équipe (0/6)');
    expect(element.textContent).toContain('Votre équipe est vide.');
    expect(element.querySelector('app-empty-state a')?.getAttribute('href')).toBe('/devs');
  });

  it('liste les membres avec un lien vers leur fiche', async () => {
    await recruit(1, 11);

    expect(element.querySelector('h1')?.textContent).toBe('Mon équipe (2/6)');
    expect(members()).toEqual(['#001 Stagiairon', '#011 Requêtor']);
    expect(element.querySelector('.members a')?.getAttribute('href')).toBe('/devs/1');
  });

  it("affiche le total de l'équipe", async () => {
    await recruit(1, 11);

    expect(meter('Total équipe')).toBe('515');
  });

  it('indique les types manquants', async () => {
    await recruit(1, 11);

    expect(element.querySelector('#coverage-title')?.textContent).toBe(
      'Couverture : 3 type(s) sur 6',
    );
    expect(text()).toContain('Il manque : DevOps, Mobile, Sécurité.');
  });

  it('signale quand tous les types sont couverts', async () => {
    const repository = TestBed.inject(DevRepository);
    const extra = repository.add({
      ...TEST_DEVS[0],
      name: 'Polyvalent',
      types: ['devops', 'mobile'],
    });
    const secu = repository.add({ ...TEST_DEVS[0], name: 'Pentesteur', types: ['securite'] });

    await recruit(1, 11, extra, secu);

    expect(element.textContent).toContain('Tous les types sont couverts.');
  });

  it("affiche la moyenne de l'équipe", async () => {
    await recruit(1, 11);

    expect(element.querySelector('#average-title')?.textContent).toBe(
      "Moyenne de l'équipe · total 259",
    );
    expect(meter('Code')).toBe('50');
    expect(meter('Tests')).toBe('33');
  });

  it('retire un membre', async () => {
    await recruit(1, 11);

    button('Retirer').click();
    await stable();

    expect(members()).toEqual(['#011 Requêtor']);
  });

  it("vide l'équipe", async () => {
    await recruit(1, 11);

    button("Vider l'équipe").click();
    await stable();

    expect(team.size()).toBe(0);
    expect(element.textContent).toContain('Votre équipe est vide.');
  });

  it('propose la sauvegarde, même quand l’équipe est vide', () => {
    expect(element.querySelector('app-backup-panel')).not.toBeNull();
  });
});
