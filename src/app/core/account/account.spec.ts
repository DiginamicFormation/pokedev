import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TEST_DEVS } from '../../testing/dev-fixtures';
import { createBackup } from '../backup/backup-file';
import { Team } from '../team/team';
import { API_URL, Account, AccountError } from './account';

const SESSION_KEY = 'pokedev.session.v1';

describe('Account', () => {
  let http: HttpTestingController;
  let account: Account;

  function setup(apiUrl?: string): void {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ...(apiUrl ? [{ provide: API_URL, useValue: apiUrl }] : []),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    account = TestBed.inject(Account);
  }

  /** Session déjà ouverte dans ce navigateur, avant le démarrage. */
  function signedIn(): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ username: 'sacha', token: 'jeton' }));
    setup();
  }

  /** Attend la requête vers l'URL donnée, envoyée une fois les précédentes terminées. */
  const next = (url: string): Promise<TestRequest> => vi.waitFor(() => http.expectOne(url));

  const failure = (promise: Promise<unknown>) =>
    promise.then(
      () => expect.fail('la promesse aurait dû échouer'),
      (error: unknown) => error as AccountError,
    );

  beforeEach(() => localStorage.clear());

  afterEach(() => {
    // Le pokédex (data/devs.json) est chargé par la sauvegarde ; seul l'API nous intéresse ici.
    http.match('data/devs.json');
    http.verify();
  });

  describe('inscription et connexion', () => {
    beforeEach(() => setup());

    it("crée le compte, puis s'y connecte", async () => {
      const done = account.register('sacha', 'p@ss=w;rd +é');

      const created = await next('/api/accounts');
      expect(created.request.method).toBe('POST');
      // Formulaire HTML codé par HttpParams : @ = ; restent tels quels.
      expect(created.request.body.toString()).toBe('username=sacha&password=p@ss=w;rd%20%2B%C3%A9');
      created.flush('Compte créé.', { status: 201, statusText: 'Created' });

      const login = await next('/api/sessions');
      expect(login.request.method).toBe('POST');
      login.flush({ token: 'jeton', username: 'sacha' });
      await done;

      expect(account.username()).toBe('sacha');
    });

    it('refuse un identifiant déjà pris', async () => {
      const done = failure(account.register('sacha', 'secret123'));

      (await next('/api/accounts')).flush('Pris', { status: 409, statusText: 'Conflict' });

      const error = await done;
      expect(error).toBeInstanceOf(AccountError);
      expect(error.message).toBe('Cet identifiant est déjà pris.');
      expect(account.username()).toBeUndefined();
    });

    it('relaie le message du serveur pour une demande invalide', async () => {
      const done = failure(account.register('s', 'secret123'));

      (await next('/api/accounts')).flush('Identifiant invalide.', {
        status: 400,
        statusText: 'Bad Request',
      });

      expect((await done).message).toBe('Identifiant invalide.');
    });

    it('garde la session dans le navigateur', async () => {
      const done = account.login('SACHA', 'secret123');
      (await next('/api/sessions')).flush({ token: 'jeton', username: 'sacha' });
      await done;
      TestBed.tick();

      expect(JSON.parse(localStorage.getItem(SESSION_KEY)!)).toEqual({
        username: 'sacha',
        token: 'jeton',
      });
    });

    it('refuse de mauvais identifiants', async () => {
      const done = failure(account.login('sacha', 'mauvais'));

      (await next('/api/sessions')).flush('Non', { status: 401, statusText: 'Unauthorized' });

      expect((await done).message).toBe('Identifiant ou mot de passe incorrect.');
      expect(account.username()).toBeUndefined();
    });

    it('signale un serveur injoignable', async () => {
      const done = failure(account.login('sacha', 'secret123'));

      (await next('/api/sessions')).error(new ProgressEvent('error'));

      expect((await done).message).toContain('Serveur injoignable');
    });

    it('signale une panne du serveur', async () => {
      const done = failure(account.login('sacha', 'secret123'));

      (await next('/api/sessions')).flush('Oups', { status: 500, statusText: 'Server Error' });

      expect((await done).message).toBe('Le serveur a rencontré un problème.');
    });
  });

  it("utilise l'adresse du jeton API_URL", async () => {
    setup('https://pokedev.test/api');

    const done = account.login('sacha', 'secret123');

    (await next('https://pokedev.test/api/sessions')).flush({ token: 'jeton', username: 'sacha' });
    await done;
  });

  it('reste déconnecté quand la page est rechargée après une déconnexion', async () => {
    signedIn();
    const done = account.logout();
    (await next('/api/sessions/current')).flush(null, { status: 204, statusText: 'No Content' });
    await done;
    TestBed.tick();
    expect(localStorage.getItem(SESSION_KEY)).toBe('null');

    TestBed.resetTestingModule();
    setup();

    expect(account.username()).toBeUndefined();
  });

  it('retrouve la session au redémarrage, et ignore une session illisible', () => {
    signedIn();
    expect(account.username()).toBe('sacha');

    TestBed.resetTestingModule();
    localStorage.setItem(SESSION_KEY, JSON.stringify({ username: 'sacha' }));
    setup();
    expect(account.username()).toBeUndefined();
  });

  describe('avec une session', () => {
    beforeEach(() => signedIn());

    it("sauvegarde l'équipe et le PC avec le jeton de session", async () => {
      TestBed.tick();
      http.expectOne('data/devs.json').flush(TEST_DEVS);
      const team = TestBed.inject(Team);
      team.toggle(1);
      await vi.waitFor(() => expect(team.members()).toHaveLength(1));

      const done = account.save();

      const save = await next('/api/accounts/me/save');
      expect(save.request.method).toBe('PUT');
      expect(save.request.headers.get('Authorization')).toBe('Bearer jeton');
      expect(save.request.body).toMatchObject({ format: 'pokedev-backup', pc: [] });
      expect(save.request.body.team.map((dev: { name: string }) => dev.name)).toEqual([
        'Stagiairon',
      ]);
      save.flush(null, { status: 204, statusText: 'No Content' });
      await done;
    });

    it('signale une sauvegarde trop volumineuse', async () => {
      const done = failure(account.save());

      (await next('/api/accounts/me/save')).flush('Trop', {
        status: 413,
        statusText: 'Payload Too Large',
      });

      expect((await done).message).toBe('Sauvegarde trop volumineuse.');
    });

    it('relit la sauvegarde du serveur', async () => {
      const saved = createBackup([TEST_DEVS[0]], [TEST_DEVS[2]], new Date('2026-09-24T10:00:00Z'));
      const done = account.load();

      const load = await next('/api/accounts/me/save');
      expect(load.request.headers.get('Authorization')).toBe('Bearer jeton');
      load.flush(JSON.stringify(saved));

      expect(await done).toEqual(saved);
    });

    it("renvoie undefined s'il n'y a pas encore de sauvegarde", async () => {
      const done = account.load();

      (await next('/api/accounts/me/save')).flush('Aucune', {
        status: 404,
        statusText: 'Not Found',
      });

      expect(await done).toBeUndefined();
    });

    it('refuse une sauvegarde illisible', async () => {
      const done = account.load().catch((error: Error) => error);

      (await next('/api/accounts/me/save')).flush('pas du json');

      expect(((await done) as Error).message).toContain('pas un fichier JSON valide');
    });

    it('met fin à la session quand le serveur refuse le jeton', async () => {
      const done = failure(account.load());

      (await next('/api/accounts/me/save')).flush('Expirée', {
        status: 401,
        statusText: 'Unauthorized',
      });

      expect((await done).message).toBe('Votre session a expiré : reconnectez-vous.');
      expect(account.username()).toBeUndefined();
    });

    it('supprime le compte et met fin à la session', async () => {
      const done = account.deleteAccount();

      const deletion = await next('/api/accounts/me');
      expect(deletion.request.method).toBe('DELETE');
      expect(deletion.request.headers.get('Authorization')).toBe('Bearer jeton');
      deletion.flush(null, { status: 204, statusText: 'No Content' });
      await done;

      expect(account.username()).toBeUndefined();
    });

    it('garde la session si la suppression échoue', async () => {
      const done = failure(account.deleteAccount());

      (await next('/api/accounts/me')).flush('Oups', { status: 500, statusText: 'Server Error' });

      await done;
      expect(account.username()).toBe('sacha');
    });

    it('se déconnecte tout de suite, même si le serveur ne répond pas', async () => {
      const done = account.logout();
      expect(account.username()).toBeUndefined();

      const logout = await next('/api/sessions/current');
      expect(logout.request.method).toBe('DELETE');
      expect(logout.request.headers.get('Authorization')).toBe('Bearer jeton');
      logout.error(new ProgressEvent('error'));

      await expect(done).resolves.toBeUndefined();
    });
  });

  describe('sans session', () => {
    beforeEach(() => setup());

    it('refuse les actions réservées aux comptes, sans appeler le serveur', async () => {
      expect((await failure(account.save())).message).toBe('Connectez-vous d’abord.');
    });

    it('se déconnecte sans appeler le serveur', async () => {
      await account.logout();
    });
  });
});
