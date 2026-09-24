import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { DevRepository } from '../../core/data/dev-repository';
import { TEST_DEVS } from '../../testing/dev-fixtures';
import { CreateDevPage } from './create-dev-page';

describe('CreateDevPage', () => {
  let element: HTMLElement;
  let component: CreateDevPage;

  const stable = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(CreateDevPage);
    element = fixture.nativeElement;
    component = fixture.componentInstance;
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne('data/devs.json').flush(TEST_DEVS);
    await stable();
  });

  async function type(selector: string, value: string): Promise<void> {
    const field = element.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('change'));
    field.dispatchEvent(new Event('blur'));
    await stable();
  }

  const submitButton = () => element.querySelector<HTMLButtonElement>('button[type=submit]')!;

  it('est invalide au départ', () => {
    expect(submitButton().disabled).toBe(true);
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it("n'affiche aucune erreur avant que l'utilisateur ne saisisse", () => {
    expect(element.querySelectorAll('.error')).toHaveLength(0);
  });

  it('propose d’ajouter le dev au pokédex', () => {
    expect(submitButton().textContent?.trim()).toBe('Ajouter au pokédex');
  });

  it('affiche le total des statistiques en direct', async () => {
    const legend = () => element.querySelector('legend')?.textContent?.trim();
    expect(legend()).toBe('Statistiques · total 300/420');

    await type('#stat-code', '90');

    expect(legend()).toBe('Statistiques · total 340/420');
  });

  it('refuse un nom déjà pris', async () => {
    await type('#name', 'juniorax');
    expect(element.textContent).toContain('Ce nom est déjà pris.');
  });

  it('refuse deux types identiques', async () => {
    await type('#secondaryType', 'frontend');
    expect(element.textContent).toContain('Le type secondaire doit différer du type principal.');
  });

  it('refuse un total supérieur à 420', async () => {
    for (const key of ['code', 'debug', 'archi', 'tests', 'communication']) {
      await type(`#stat-${key}`, '90');
    }
    expect(element.textContent).toContain('Le total ne doit pas dépasser 420.');
  });

  it('enregistre un dev valide et ouvre sa fiche', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await type('#name', 'Testeuse');
    await type('#title', 'Ingénieure qualité');
    await type('#languages', 'Java, Gherkin');
    expect(component.hasUnsavedChanges()).toBe(true);
    expect(submitButton().disabled).toBe(false);

    submitButton().click();
    await stable();

    const created = TestBed.inject(DevRepository).byId(12);
    expect(created?.name).toBe('Testeuse');
    expect(created?.languages).toEqual(['Java', 'Gherkin']);
    expect(navigate).toHaveBeenCalledWith(['/devs', 12]);
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('exige un nom assez long, un poste et au moins un langage', async () => {
    await type('#name', 'T');
    await type('#title', '');
    await type('#languages', ' , ');

    expect(element.textContent).toContain('Au moins 2 caractères.');
    expect(element.textContent).toContain('Le poste est obligatoire.');
    expect(element.textContent).toContain('Indiquez au moins un langage.');
  });

  it('borne chaque statistique entre 0 et 100', async () => {
    await type('#stat-code', '-1');
    await type('#stat-debug', '101');

    expect(element.textContent).toContain('Minimum : 0.');
    expect(element.textContent).toContain('Maximum : 100.');
  });

  it('limite la phrase fétiche à 120 caractères', async () => {
    await type('#catchphrase', 'a'.repeat(121));

    expect(element.textContent).toContain('Au plus 120 caractères.');
  });
});
