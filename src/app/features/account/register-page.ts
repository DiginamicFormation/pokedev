import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  FormField,
  form,
  maxLength,
  minLength,
  pattern,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { Account, MAX_PASSWORD, MIN_PASSWORD, USERNAME_PATTERN } from '../../core/account/account';

@Component({
  selector: 'app-register-page',
  imports: [FormField, RouterLink],
  template: `
    <h1>Créer un compte</h1>

    <form (submit)="register($event)" novalidate>
      @for (field of fields; track field.id) {
        <div class="field">
          <label [for]="field.id">{{ field.label }}</label>
          <input
            [id]="field.id"
            [type]="field.type"
            [attr.autocomplete]="field.autocomplete"
            [formField]="registerForm[field.id]"
          />
          @if (registerForm[field.id]().touched()) {
            @for (error of registerForm[field.id]().errors(); track error.kind) {
              <p class="error">{{ error.message }}</p>
            }
          }
        </div>
      }
      @if (serverError()) {
        <p class="error" role="alert">{{ serverError() }}</p>
      }
      <p class="actions">
        <button type="submit" [disabled]="registerForm().submitting()">Créer mon compte</button>
      </p>
    </form>

    <p>Déjà un compte ? <a routerLink="/compte/connexion">Se connecter</a></p>
  `,
  styleUrl: './account-form.css',
})
export class RegisterPage {
  private readonly account = inject(Account);
  private readonly router = inject(Router);

  protected readonly fields = [
    { id: 'username', label: 'Identifiant', type: 'text', autocomplete: 'username' },
    { id: 'password', label: 'Mot de passe', type: 'password', autocomplete: 'new-password' },
    {
      id: 'confirmation',
      label: 'Confirmation du mot de passe',
      type: 'password',
      autocomplete: 'new-password',
    },
  ] as const;

  protected readonly draft = signal({ username: '', password: '', confirmation: '' });
  protected readonly registerForm = form(this.draft, (path) => {
    required(path.username, { message: 'L’identifiant est obligatoire.' });
    pattern(path.username, USERNAME_PATTERN, {
      message: '3 à 30 caractères : lettres sans accent, chiffres, points, tirets.',
    });
    required(path.password, { message: 'Le mot de passe est obligatoire.' });
    minLength(path.password, MIN_PASSWORD, { message: `Au moins ${MIN_PASSWORD} caractères.` });
    maxLength(path.password, MAX_PASSWORD, { message: `Au plus ${MAX_PASSWORD} caractères.` });
    validate(path.confirmation, ({ value, valueOf }) =>
      value() === valueOf(path.password)
        ? undefined
        : { kind: 'confirmation', message: 'Les deux mots de passe diffèrent.' },
    );
  });
  protected readonly serverError = signal('');

  protected async register(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.registerForm, async (field) => {
      const { username, password } = field().value();
      this.serverError.set('');
      try {
        await this.account.register(username, password);
        await this.router.navigate(['/compte']);
      } catch (error) {
        this.serverError.set((error as Error).message);
      }
      return undefined;
    });
  }
}
