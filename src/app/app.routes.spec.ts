import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { appConfig } from './app.config';
import { TEST_DEVS } from './testing/dev-fixtures';

/** Navigation avec la vraie configuration de l'application, sans appel réseau. */
describe('routes', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, provideHttpClientTesting()],
    });
    harness = await RouterTestingHarness.create();
  });

  const url = () => TestBed.inject(Router).url;
  const title = () => TestBed.inject(Title).getTitle();
  const heading = () => harness.routeNativeElement?.querySelector('h1')?.textContent;

  it('redirige la racine vers le pokédex', async () => {
    await harness.navigateByUrl('/');

    expect(url()).toBe('/devs');
    expect(title()).toBe('Pokedev · Pokédex');
    expect(heading()).toBe('Pokédex');
  });

  it.each([
    ['/equipe', 'Pokedev · Mon équipe'],
    ['/pc', 'Pokedev · Mon PC'],
    ['/creer', 'Pokedev · Créer un dev'],
    ['/compte', 'Pokedev · Mon compte'],
    ['/compte/connexion', 'Pokedev · Connexion'],
    ['/compte/inscription', 'Pokedev · Créer un compte'],
    ['/devs/7', 'Pokedev · #007'],
    ['/devs/7/modifier', 'Pokedev · Modifier #007'],
  ])('donne un titre à la page %s', async (path, expected) => {
    await harness.navigateByUrl(path);

    expect(url()).toBe(path);
    expect(title()).toBe(expected);
  });

  it('passe le numéro de la route à la fiche du dev', async () => {
    await harness.navigateByUrl('/devs/11');
    TestBed.inject(HttpTestingController).expectOne('data/devs.json').flush(TEST_DEVS);
    await harness.fixture.whenStable();

    expect(heading()).toBe('Requêtor');
  });

  it.each(['/devs/abc', '/devs/0/modifier'])(
    'envoie le numéro invalide de %s vers la page introuvable',
    async (path) => {
      await harness.navigateByUrl(path);

      expect(url()).toBe('/introuvable');
      expect(heading()).toBe('Page introuvable');
    },
  );

  describe('saisies non enregistrées', () => {
    afterEach(() => vi.restoreAllMocks());

    /** Ouvre une page de formulaire et modifie un champ ; le dev n°12 est personnalisé, donc modifiable. */
    async function edit(path: string, field: string): Promise<void> {
      const custom = { ...TEST_DEVS[2], id: 12, name: 'Requêteuse', custom: true };
      localStorage.setItem('pokedev.custom-devs.v1', JSON.stringify([custom]));
      await harness.navigateByUrl(path);
      TestBed.inject(HttpTestingController).expectOne('data/devs.json').flush(TEST_DEVS);
      await harness.fixture.whenStable();
      const input = harness.routeNativeElement!.querySelector<HTMLInputElement>(field)!;
      input.value = 'Modifié';
      input.dispatchEvent(new Event('input'));
      await harness.fixture.whenStable();
    }

    it.each([
      ['/creer', '#name'],
      ['/devs/12/modifier', '#title'],
    ])('demande confirmation avant de quitter %s', async (path, field) => {
      await edit(path, field);
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

      await harness.navigateByUrl('/devs');
      expect(confirm).toHaveBeenCalled();
      expect(url()).toBe(path);

      confirm.mockReturnValue(true);
      await harness.navigateByUrl('/devs');
      expect(url()).toBe('/devs');
    });

    it('laisse partir sans question si rien n’a été saisi', async () => {
      await harness.navigateByUrl('/creer');
      const confirm = vi.spyOn(window, 'confirm');

      await harness.navigateByUrl('/devs');

      expect(confirm).not.toHaveBeenCalled();
      expect(url()).toBe('/devs');
    });
  });

  it('affiche la page introuvable pour une adresse inconnue', async () => {
    await harness.navigateByUrl('/nulle-part');

    expect(title()).toBe('Pokedev · Page introuvable');
    expect(heading()).toBe('Page introuvable');
  });
});
