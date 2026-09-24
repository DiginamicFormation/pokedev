import type { MockInstance } from 'vitest';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Account, AccountError } from '../../core/account/account';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  let element: HTMLElement;
  const login = vi.fn<Account['login']>();
  let navigate: MockInstance<Router['navigate']>;

  const stable = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(async () => {
    login.mockReset().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: Account, useValue: { login } }],
    });
    const fixture = TestBed.createComponent(LoginPage);
    element = fixture.nativeElement;
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await stable();
  });

  async function type(selector: string, value: string): Promise<void> {
    const field = element.querySelector<HTMLInputElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await stable();
  }

  async function submit(): Promise<void> {
    element.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await stable();
  }

  const alert = () => element.querySelector('[role="alert"]');

  it('prépare les champs pour les gestionnaires de mots de passe', () => {
    expect(element.querySelector('#username')?.getAttribute('autocomplete')).toBe('username');
    expect(element.querySelector('#password')?.getAttribute('type')).toBe('password');
    expect(element.querySelector('#password')?.getAttribute('autocomplete')).toBe(
      'current-password',
    );
  });

  it('demande un identifiant et un mot de passe', async () => {
    await submit();

    expect(element.textContent).toContain('L’identifiant est obligatoire.');
    expect(element.textContent).toContain('Le mot de passe est obligatoire.');
    expect(login).not.toHaveBeenCalled();
  });

  it('se connecte puis ouvre la page du compte', async () => {
    await type('#username', ' sacha ');
    await type('#password', 'secret123');

    await submit();

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/compte']));
    expect(login).toHaveBeenCalledWith('sacha', 'secret123');
  });

  it('affiche le refus du serveur, puis le retire au nouvel essai', async () => {
    login.mockRejectedValueOnce(new AccountError('Identifiant ou mot de passe incorrect.', 401));
    await type('#username', 'sacha');
    await type('#password', 'mauvais-mot');

    await submit();
    await vi.waitFor(() =>
      expect(alert()?.textContent).toBe('Identifiant ou mot de passe incorrect.'),
    );
    expect(navigate).not.toHaveBeenCalled();

    await submit();
    await vi.waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(alert()).toBeNull();
  });

  it('propose de créer un compte', () => {
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/compte/inscription');
  });
});
