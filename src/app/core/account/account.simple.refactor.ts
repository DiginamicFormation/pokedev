import { InjectionToken, Service, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Backup } from '../backup/backup';
import { BackupFile, parseBackup } from '../backup/backup-file';
import { persistedSignal } from '../storage/persisted-signal';
import { Observable, firstValueFrom } from 'rxjs';

export const API_URL = new InjectionToken<string>('API_URL', { factory: () => '/api' });

export interface Session {
  readonly username: string;
  readonly token: string;
}

const SESSION_KEY = 'pokedev.session.v1';

function isSession(value: unknown): value is Session | null {
  if (value === null) {
    return true;
  }
  const session = value as Partial<Record<keyof Session, unknown>>;
  return typeof session?.username === 'string' && typeof session.token === 'string';
}

interface ErrorMessages {
  readonly status: Number;
  readonly message: string;
}

@Service()
export class Account {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);
  private readonly backup = inject(Backup);
  private readonly session = persistedSignal<Session | null>(SESSION_KEY, null, isSession);

  isLoggedIn(): void {
    const session = this.session();
    if (!session) {
      throw new Error('Connectez-vous d’abord.');
    }
  }

  authenticationHeaders(): Object {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.session()?.token}` }) };
  }

  async request<T>(
    request: Observable<T>,
    errors: ErrorMessages[],
    authenticated: boolean = false
  ): Promise<void> {
    if (authenticated) this.isLoggedIn();
    try {
      const response = await firstValueFrom(request);
    } catch (error) {
      const { status, error: body } = error as HttpErrorResponse;

      errors.forEach(element => {
        if (element.status === status) throw new Error(element.message);
      });

      throw new Error(body)
    }
  }

  async register(username: string, password: string): Promise<void> {
    try {
      await this.http.post(
        `${this.url}/accounts`,
        new HttpParams({ fromObject: { username, password } })
      );
    } catch (error) {
      const { status, error: body } = error as HttpErrorResponse;
      switch (status) {
        case 409: throw new Error('Ce username est déjà pris');
        default: throw new Error(body);
      }
    }
  }

  async login(username: string, password: string): Promise<void> {
    try {
      const response = await this.http.post<Session>(
        `${this.url}/sessions`,
        new HttpParams({ fromObject: { username, password } })
      );
      const session = await firstValueFrom(response);
      this.session.set({ username: session.username, token: session.token });

    } catch (error) {
      const { status, error: body } = error as HttpErrorResponse;
      switch (status) {
        case 401: throw new Error('identifiants incorrects');
        default: throw new Error(body);
      }
    }
  }

  async logout(username: string, password: string): Promise<void> {
    try {
      this.isLoggedIn();
      await this.http.delete(
        `${this.url}/sessions/current`,
        this.authenticationHeaders()
      );
    } catch (error) {
      const { status, error: body } = error as HttpErrorResponse;
      switch (status) {
        case 401: throw new Error('identifiants incorrects');
        default: throw new Error(body);
      }
    }
  }

  async save(): Promise<void> {
    await this.request(
      this.http.put(
        `${this.url}/accounts/me/save`,
        this.backup.create(),
        this.authenticationHeaders()
      ),
      [{ status: 403, message: 'non authentifié' }],
      true
    )
  }
}
