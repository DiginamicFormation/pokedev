import type { MockInstance } from 'vitest';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Account, AccountError } from '../../core/account/account';
import { RegisterPage } from './register-page';

describe('RegisterPage', () => {
  let element: HTMLElement;
  const register = vi.fn<Account['register']>();
  let navigate: MockInstance<Router['navigate']>;

  const stable = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(async () => {
    register.mockReset().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: Account, useValue: { register } }],
    });
    const fixture = TestBed.createComponent(RegisterPage);
    element = fixture.nativeElement;
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await stable();
  });

  async function fill(username: string, password: string, confirmation = password): Promise<void> {
    for (const [selector, value] of [
      ['#username', username],
      ['#password', password],
      ['#confirmation', confirmation],
    ]) {
      const field = element.querySelector<HTMLInputElement>(selector)!;
      field.value = value;
      field.dispatchEvent(new Event('input'));
    }
    await stable();
  }

  async function submit(): Promise<void> {
    element.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await stable();
  }

  it('prépare les champs pour les gestionnaires de mots de passe', () => {
    const autocomplete = (id: string) => element.querySelector(id)?.getAttribute('autocomplete');
    expect(autocomplete('#username')).toBe('username');
    expect(autocomplete('#password')).toBe('new-password');
    expect(autocomplete('#confirmation')).toBe('new-password');
    expect(element.querySelector('#password')?.getAttribute('type')).toBe('password');
  });

  it('applique les règles du serveur avant de lui écrire', async () => {
    await fill('sacha ketchum', 'court', 'autre');

    await submit();

    expect(element.textContent).toContain(
      '3 à 30 caractères : lettres sans accent, chiffres, points, tirets.',
    );
    expect(element.textContent).toContain('Au moins 8 caractères.');
    expect(element.textContent).toContain('Les deux mots de passe diffèrent.');
    expect(register).not.toHaveBeenCalled();
  });

  it('limite la longueur du mot de passe', async () => {
    await fill('sacha', 'x'.repeat(129));

    await submit();

    expect(element.textContent).toContain('Au plus 128 caractères.');
  });

  it('crée le compte puis ouvre la page du compte', async () => {
    await fill('sacha', 'pikachu-2026');

    await submit();

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/compte']));
    expect(register).toHaveBeenCalledWith('sacha', 'pikachu-2026');
  });

  it('affiche le refus du serveur', async () => {
    register.mockRejectedValue(new AccountError('Cet identifiant est déjà pris.', 409));
    await fill('sacha', 'pikachu-2026');

    await submit();

    await vi.waitFor(() =>
      expect(element.querySelector('[role="alert"]')?.textContent).toBe(
        'Cet identifiant est déjà pris.',
      ),
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('propose de se connecter', () => {
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/compte/connexion');
  });
});
