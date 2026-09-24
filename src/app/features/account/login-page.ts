import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormField, form, required, submit } from '@angular/forms/signals';
import { Account } from '../../core/account/account';

@Component({
  selector: 'app-login-page',
  imports: [FormField, RouterLink],
  template: `
    <h1>Connexion</h1>

    <form (submit)="login($event)" novalidate>
      <div class="field">
        <label for="username">Identifiant</label>
        <input id="username" autocomplete="username" [formField]="loginForm.username" />
        @if (loginForm.username().touched()) {
          @for (error of loginForm.username().errors(); track error.kind) {
            <p class="error">{{ error.message }}</p>
          }
        }
      </div>
      <div class="field">
        <label for="password">Mot de passe</label>
        <input
          id="password"
          type="password"
          autocomplete="current-password"
          [formField]="loginForm.password"
        />
        @if (loginForm.password().touched()) {
          @for (error of loginForm.password().errors(); track error.kind) {
            <p class="error">{{ error.message }}</p>
          }
        }
      </div>
      @if (serverError()) {
        <p class="error" role="alert">{{ serverError() }}</p>
      }
      <p class="actions">
        <button type="submit" [disabled]="loginForm().submitting()">Se connecter</button>
      </p>
    </form>

    <p>Pas encore de compte ? <a routerLink="/compte/inscription">Créer un compte</a></p>
  `,
  styleUrl: './account-form.css',
})
export class LoginPage {
  private readonly account = inject(Account);
  private readonly router = inject(Router);

  protected readonly credentials = signal({ username: '', password: '' });
  protected readonly loginForm = form(this.credentials, (path) => {
    required(path.username, { message: 'L’identifiant est obligatoire.' });
    required(path.password, { message: 'Le mot de passe est obligatoire.' });
  });
  protected readonly serverError = signal('');

  protected async login(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.loginForm, async (field) => {
      const { username, password } = field().value();
      this.serverError.set('');
      try {
        await this.account.login(username.trim(), password);
        await this.router.navigate(['/compte']);
      } catch (error) {
        this.serverError.set((error as Error).message);
      }
      return undefined;
    });
  }
}
