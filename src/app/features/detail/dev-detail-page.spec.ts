import { ApplicationRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DevRepository } from '../../core/data/dev-repository';
import { TEST_DEVS } from '../../testing/dev-fixtures';
import { DevDetailPage } from './dev-detail-page';

/** La page retrouve le dev à partir du numéro ; le contenu de la fiche est testé dans DevProfile. */
describe('DevDetailPage', () => {
  let fixture: ComponentFixture<DevDetailPage>;
  let element: HTMLElement;

  const stable = () => TestBed.inject(ApplicationRef).whenStable();
  const heading = () => element.querySelector('app-dev-profile h1')?.textContent;

  /** Affiche la page d'un numéro ; le fichier JSON n'est chargé que si `load` est vrai. */
  async function render(id: number, load = true): Promise<void> {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(DevDetailPage);
    fixture.componentRef.setInput('id', id);
    element = fixture.nativeElement;
    TestBed.tick();
    if (load) {
      TestBed.inject(HttpTestingController).expectOne('data/devs.json').flush(TEST_DEVS);
      await stable();
    } else {
      // La requête reste en attente : l'application ne sera jamais stable.
      TestBed.tick();
    }
  }

  it('affiche la fiche du dev portant le numéro', async () => {
    await render(2);

    expect(heading()).toBe('Juniorax');
  });

  it('suit le changement de numéro dans la route', async () => {
    await render(2);

    fixture.componentRef.setInput('id', 11);
    await stable();

    expect(heading()).toBe('Requêtor');
  });

  it('signale un numéro inconnu', async () => {
    await render(99);

    expect(element.querySelector('app-dev-profile')).toBeNull();
    expect(element.textContent).toContain('Aucun dev ne porte le numéro #099.');
    expect(element.querySelector('app-empty-state a')?.getAttribute('href')).toBe('/devs');
  });

  it('signale le dev comme introuvable une fois supprimé', async () => {
    await render(12);
    const repository = TestBed.inject(DevRepository);
    repository.add({ ...TEST_DEVS[1], name: 'Testeuse' });
    await stable();
    expect(heading()).toBe('Testeuse');

    repository.remove(12);
    await stable();

    expect(element.textContent).toContain('Aucun dev ne porte le numéro #012.');
  });

  it('patiente pendant le chargement', async () => {
    await render(2, false);

    expect(element.textContent).toContain('Chargement…');
  });
});
