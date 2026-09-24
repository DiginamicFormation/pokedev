import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { DevRepository } from '../../core/data/dev-repository';
import { Dev } from '../../domain/dev.model';
import { TEST_DEVS } from '../../testing/dev-fixtures';
import { EditDevPage } from './edit-dev-page';

/** Dev créé par l'utilisateur : seuls ceux-là sont modifiables. */
const REQUETEUSE: Dev = { ...TEST_DEVS[2], id: 12, name: 'Requêteuse', custom: true };

describe('EditDevPage', () => {
  let element: HTMLElement;
  let component: EditDevPage;

  const stable = () => TestBed.inject(ApplicationRef).whenStable();

  async function render(id: number): Promise<void> {
    localStorage.clear();
    localStorage.setItem('pokedev.custom-devs.v1', JSON.stringify([REQUETEUSE]));
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(EditDevPage);
    fixture.componentRef.setInput('id', id);
    element = fixture.nativeElement;
    component = fixture.componentInstance;
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne('data/devs.json').flush(TEST_DEVS);
    await stable();
  }

  async function type(selector: string, value: string): Promise<void> {
    const field = element.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('change'));
    field.dispatchEvent(new Event('blur'));
    await stable();
  }

  const valueOf = (selector: string) =>
    element.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!.value;
  const submitButton = () => element.querySelector<HTMLButtonElement>('button[type=submit]')!;

  it('pré-remplit le formulaire avec le dev', async () => {
    await render(12);

    expect(element.querySelector('h1')?.textContent).toContain('Modifier Requêteuse');
    expect(valueOf('#name')).toBe('Requêteuse');
    expect(valueOf('#primaryType')).toBe('data');
    expect(valueOf('#secondaryType')).toBe('backend');
    expect(valueOf('#stat-code')).toBe('65');
    expect(valueOf('#languages')).toBe('SQL, Python');
    expect(submitButton().disabled).toBe(false);
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('patiente pendant le chargement', () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(EditDevPage);
    fixture.componentRef.setInput('id', 11);
    // La requête reste en attente : on déclenche le rendu sans attendre la stabilité.
    TestBed.tick();
    TestBed.tick();

    expect(fixture.nativeElement.textContent).toContain('Chargement…');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('propose d’enregistrer les modifications', async () => {
    await render(12);
    expect(submitButton().textContent?.trim()).toBe('Enregistrer');
  });

  it('propose de revenir à la fiche sans enregistrer', async () => {
    await render(12);
    expect(element.querySelector('form a')?.getAttribute('href')).toBe('/devs/12');
  });

  it("refuse le nom d'un autre dev", async () => {
    await render(12);
    await type('#name', 'juniorax');
    expect(element.textContent).toContain('Ce nom est déjà pris.');
  });

  it('enregistre les modifications et revient à la fiche', async () => {
    await render(12);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await type('#title', 'Data engineer');
    expect(component.hasUnsavedChanges()).toBe(true);

    submitButton().click();
    await stable();

    const updated = TestBed.inject(DevRepository).byId(12);
    expect(updated?.title).toBe('Data engineer');
    expect(updated?.name).toBe('Requêteuse');
    expect(navigate).toHaveBeenCalledWith(['/devs', 12]);
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it("refuse de modifier un dev du pokédex d'origine", async () => {
    await render(11);

    expect(element.querySelector('form')).toBeNull();
    expect(element.textContent).toContain(
      'Requêtor fait partie du pokédex d’origine : il ne peut pas être modifié.',
    );
    expect(element.querySelector('app-empty-state a')?.getAttribute('href')).toBe('/devs/11');
    expect(component.hasUnsavedChanges()).toBe(false);
  });

  it('signale un numéro inconnu', async () => {
    await render(99);
    expect(element.textContent).toContain('Aucun dev ne porte le numéro #099.');
    expect(element.querySelector('form')).toBeNull();
  });

  it("n'a rien à enregistrer pour un numéro inconnu", async () => {
    await render(99);
    expect(component.hasUnsavedChanges()).toBe(false);
  });
});
