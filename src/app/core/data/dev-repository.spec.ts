import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DevInfo } from '../../domain/dev.model';
import { TEST_DEVS } from '../../testing/dev-fixtures';
import { DevRepository } from './dev-repository';

/** Informations telles que le formulaire les envoie : sans numéro ni évolution. */
const TESTEUSE: DevInfo = {
  name: 'Testeuse',
  title: 'QA',
  types: ['backend'],
  stats: TEST_DEVS[0].stats,
  progression: TEST_DEVS[0].progression,
  languages: ['Java'],
  catchphrase: 'Et si le champ est vide ?',
};

describe('DevRepository', () => {
  let http: HttpTestingController;
  let repository: DevRepository;

  /** Crée un dépôt neuf, qui relit le localStorage. */
  function setup(): void {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    http = TestBed.inject(HttpTestingController);
    repository = TestBed.inject(DevRepository);

    TestBed.tick();
  }

  /** Répond à la requête du fichier JSON avec le jeu de test. */
  async function load(): Promise<void> {
    http.expectOne('data/devs.json').flush(TEST_DEVS);
    await TestBed.inject(ApplicationRef).whenStable();
  }

  beforeEach(() => {
    localStorage.clear();
    setup();
  });

  afterEach(() => http.verify());

  it('charge les devs depuis le fichier JSON', async () => {
    http.expectOne('data/devs.json').flush(TEST_DEVS);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(repository.devs()).toHaveLength(3);
    expect(repository.byId(11)?.name).toBe('Requêtor');
  });

  it('passe en erreur si la réponse est invalide', async () => {
    http.expectOne('data/devs.json').flush([{ id: 'x' }]);
    await TestBed.inject(ApplicationRef).whenStable();

    expect(repository.error()).toBeTruthy();
    expect(repository.devs()).toEqual([]);
  });

  it('ajoute un dev personnalisé avec le numéro suivant et le sauvegarde', async () => {
    http.expectOne('data/devs.json').flush(TEST_DEVS);
    await TestBed.inject(ApplicationRef).whenStable();

    const id = repository.add({
      name: 'Testeuse',
      title: 'QA',
      types: ['backend'],
      stats: TEST_DEVS[0].stats,
      progression: TEST_DEVS[0].progression,
      languages: ['Java'],
      catchphrase: 'Et si le champ est vide ?',
    });
    TestBed.tick();

    expect(id).toBe(12);
    expect(repository.byId(12)?.custom).toBe(true);
    expect(localStorage.getItem('pokedev.custom-devs.v1')).toContain('Testeuse');
  });

  it('refuse de modifier un dev du fichier JSON', async () => {
    await load();

    repository.update(1, TESTEUSE);

    expect(repository.byId(1)?.name).toBe('Stagiairon');
  });

  it('modifie un dev personnalisé sans changer son numéro ni sa place', async () => {
    await load();
    const id = repository.add(TESTEUSE);
    repository.add({ ...TESTEUSE, name: 'Autre' });

    repository.update(id, { ...TESTEUSE, title: 'Ingénieure qualité' });
    TestBed.tick();

    expect(repository.byId(id)?.title).toBe('Ingénieure qualité');
    expect(repository.byId(id)?.custom).toBe(true);
    expect(repository.devs().map((dev) => dev.id)).toEqual([1, 2, 11, 12, 13]);
    expect(localStorage.getItem('pokedev.custom-devs.v1')).toContain('Ingénieure qualité');
  });

  it('ne modifie que le dev personnalisé visé', async () => {
    await load();
    const first = repository.add(TESTEUSE);
    const second = repository.add({ ...TESTEUSE, name: 'Autre' });

    repository.update(first, { ...TESTEUSE, title: 'Ingénieure qualité' });

    expect(repository.byId(second)?.title).toBe('QA');
  });

  it('refuse de supprimer un dev du fichier JSON', async () => {
    await load();

    repository.remove(2);

    expect(repository.byId(2)?.name).toBe('Juniorax');
    expect(repository.devs()).toHaveLength(3);
  });

  it('supprime un dev personnalisé', async () => {
    await load();
    const id = repository.add(TESTEUSE);

    repository.remove(id);
    TestBed.tick();

    expect(repository.byId(id)).toBeUndefined();
    expect(localStorage.getItem('pokedev.custom-devs.v1')).toBe('[]');
  });

  it('ignore la modification ou la suppression d’un numéro inconnu', async () => {
    await load();

    repository.update(99, TESTEUSE);
    repository.remove(99);

    expect(repository.devs()).toHaveLength(3);
  });

  it('retrouve les devs personnalisés, modifiés ou supprimés, après un rechargement', async () => {
    await load();
    const kept = repository.add(TESTEUSE);
    const removed = repository.add({ ...TESTEUSE, name: 'Éphémère' });
    repository.update(kept, { ...TESTEUSE, title: 'Ingénieure qualité' });
    repository.remove(removed);
    TestBed.tick();

    TestBed.resetTestingModule();
    setup();
    await load();

    expect(repository.devs().map((dev) => dev.name)).toEqual([
      'Stagiairon',
      'Juniorax',
      'Requêtor',
      'Testeuse',
    ]);
    expect(repository.byId(kept)?.title).toBe('Ingénieure qualité');
  });

  it('ignore les modifications de devs du fichier JSON laissées par une ancienne version', async () => {
    await load();
    TestBed.resetTestingModule();
    localStorage.setItem(
      'pokedev.edited-devs.v1',
      JSON.stringify([{ ...TEST_DEVS[0], name: 'Modifié avant' }]),
    );
    localStorage.setItem('pokedev.deleted-devs.v1', '[2]');

    setup();
    await load();

    expect(repository.devs().map((dev) => dev.name)).toEqual([
      'Stagiairon',
      'Juniorax',
      'Requêtor',
    ]);
  });

  it('garde les devs personnalisés si le fichier JSON est indisponible', async () => {
    await load();
    repository.add(TESTEUSE);
    repository.reload();
    TestBed.tick();

    http.expectOne('data/devs.json').flush('Erreur', { status: 500, statusText: 'Server Error' });
    await TestBed.inject(ApplicationRef).whenStable();

    expect(repository.error()).toBeTruthy();
    expect(repository.devs().map((dev) => dev.name)).toEqual(['Testeuse']);
  });

  it('recharge le fichier JSON', async () => {
    await load();

    repository.reload();
    TestBed.tick();

    expect(repository.isLoading()).toBe(true);
    http.expectOne('data/devs.json').flush(TEST_DEVS.slice(0, 1));
    await TestBed.inject(ApplicationRef).whenStable();
    expect(repository.devs()).toHaveLength(1);
  });
});
