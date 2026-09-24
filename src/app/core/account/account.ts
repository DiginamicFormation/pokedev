import { InjectionToken, Service, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { Backup } from '../backup/backup';
import { BackupFile, parseBackup } from '../backup/backup-file';
import { persistedSignal } from '../storage/persisted-signal';

/** Adresse de l'API ; en développement, le proxy d'Angular la redirige vers le serveur local. */
export const API_URL = new InjectionToken<string>('API_URL', { factory: () => '/api' });

/** Règles du serveur pour l'identifiant et le mot de passe, vérifiées aussi par les formulaires. */
export const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,30}$/;
export const MIN_PASSWORD = 8;
export const MAX_PASSWORD = 128;

export interface Session {
  readonly username: string;
  readonly token: string;
}

/** Échec d'un appel au serveur, avec un message à afficher et le code HTTP. */
export class AccountError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const SESSION_KEY = 'pokedev.session.v1';

function isSession(value: unknown): value is Session | null {
  if (value === null) {
    return true;
  }
  const session = value as Partial<Record<keyof Session, unknown>>;
  return typeof session?.username === 'string' && typeof session.token === 'string';
}

/** Identifiants envoyés comme un formulaire HTML : le serveur n'a pas besoin de lire du JSON. */
const credentials = (username: string, password: string) =>
  new HttpParams({ fromObject: { username, password } });

/** Traduit une erreur HTTP en message ; `messages` précise le sens de certains codes. */
function toAccountError(error: unknown, messages: Record<number, string>): AccountError {
  // HttpClient ne rejette qu'avec des HttpErrorResponse.
  const { status, error: body } = error as HttpErrorResponse;
  const serverText = typeof body === 'string' ? body : '';
  const message =
    messages[status] ??
    (status === 0
      ? 'Serveur injoignable : est-il lancé ? (voir serveur/README.md)'
      : status === 400 && serverText
        ? serverText
        : 'Le serveur a rencontré un problème.');
  return new AccountError(message, status);
}

/** Compte en ligne : inscription, connexion et sauvegarde de l'équipe et du PC sur le serveur. */
@Service()
export class Account {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);
  private readonly backup = inject(Backup);
  private readonly session = persistedSignal<Session | null>(SESSION_KEY, null, isSession);

  /** Identifiant de l'utilisateur connecté ; undefined sans session. */
  readonly username = computed(() => this.session()?.username);

  /** Crée le compte puis s'y connecte. */
  async register(username: string, password: string): Promise<void> {
    await this.call(
      this.http.post(`${this.url}/accounts`, credentials(username, password), {
        responseType: 'text',
      }),
      { 409: 'Cet identifiant est déjà pris.' },
    );
    await this.login(username, password);
  }

  async login(username: string, password: string): Promise<void> {
    const session = await this.call(
      this.http.post<Session>(`${this.url}/sessions`, credentials(username, password)),
      { 401: 'Identifiant ou mot de passe incorrect.' },
    );
    this.session.set({ username: session.username, token: session.token });
  }

  /** La session est oubliée tout de suite ; le serveur révoque le jeton s'il est joignable. */
  async logout(): Promise<void> {
    const session = this.session();
    this.session.set(null);
    if (session) {
      await firstValueFrom(
        this.http.delete(`${this.url}/sessions/current`, { headers: bearer(session) }),
      ).catch(() => undefined);
    }
  }

  /** Supprime le compte et sa sauvegarde en ligne ; l'équipe et le PC restent dans le navigateur. */
  async deleteAccount(): Promise<void> {
    await this.authenticated((headers) => this.http.delete(`${this.url}/accounts/me`, { headers }));
    this.session.set(null);
  }

  /** Envoie l'équipe et le PC au serveur : le même contenu que l'export en fichier. */
  async save(): Promise<void> {
    await this.authenticated(
      (headers) => this.http.put(`${this.url}/accounts/me/save`, this.backup.create(), { headers }),
      { 413: 'Sauvegarde trop volumineuse.' },
    );
  }

  /** Relit la sauvegarde du serveur ; undefined s'il n'y en a pas encore. */
  async load(): Promise<BackupFile | undefined> {
    try {
      const text = await this.authenticated((headers) =>
        this.http.get(`${this.url}/accounts/me/save`, { headers, responseType: 'text' }),
      );
      return parseBackup(text);
    } catch (error) {
      if (error instanceof AccountError && error.status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  private async call<T>(request: Observable<T>, messages: Record<number, string>): Promise<T> {
    try {
      return await firstValueFrom(request);
    } catch (error) {
      throw toAccountError(error, messages);
    }
  }

  /** Appel avec le jeton de session ; un jeton refusé (expiré, compte supprimé) déconnecte. */
  private async authenticated<T>(
    request: (headers: HttpHeaders) => Observable<T>,
    messages: Record<number, string> = {},
  ): Promise<T> {
    const session = this.session();
    if (!session) {
      throw new AccountError('Connectez-vous d’abord.', 401);
    }
    try {
      return await this.call(request(bearer(session)), {
        401: 'Votre session a expiré : reconnectez-vous.',
        ...messages,
      });
    } catch (error) {
      if (error instanceof AccountError && error.status === 401) {
        this.session.set(null);
      }
      throw error;
    }
  }
}

function bearer(session: Session): HttpHeaders {
  return new HttpHeaders({ Authorization: `Bearer ${session.token}` });
}
