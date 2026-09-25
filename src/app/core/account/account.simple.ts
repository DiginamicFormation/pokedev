import { InjectionToken, Service, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Backup } from '../backup/backup';
import { BackupFile, parseBackup } from '../backup/backup-file';
import { persistedSignal } from '../storage/persisted-signal';
import { firstValueFrom } from 'rxjs';

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

@Service()
export class Account {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);
  private readonly backup = inject(Backup);
  private readonly session = persistedSignal<Session | null>(SESSION_KEY, null, isSession);

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
      const session = this.session();
      if (!session) {
        throw new Error('Connectez-vous d’abord.');
      }
      await this.http.delete(
        `${this.url}/sessions/current`,
        { headers: new HttpHeaders({ Authorization: `Bearer ${this.session()?.token}` }) }
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
    const session = this.session();
    if (!session) {
      throw new Error('Connectez-vous d’abord.');
    }
    try {
      this.http.put(
        `${this.url}/accounts/me/save`,
        this.backup.create(),
        {
          headers: new HttpHeaders({
            Authorization: `Bearer ${this.session()?.token}`
          })
        });
    } catch (error) {
      const { status, error: body } = error as HttpErrorResponse;
      switch (status) {
        case 401: throw new Error('identifiants incorrects');
        default: throw new Error(body);
      }
    }
  }
}
