import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Account } from '../../core/account/account';
import { Backup } from '../../core/backup/backup';
import { Confirmation } from '../../core/dialog/confirmation';
import { EmptyState } from '../../shared/ui/empty-state';

interface Feedback {
  readonly text: string;
  readonly error: boolean;
}

/** Compte en ligne : sauvegarde de l'équipe et du PC, déconnexion et suppression du compte. */
@Component({
  selector: 'app-account-page',
  imports: [RouterLink, EmptyState],
  template: `
    <h1>Mon compte</h1>

    @if (account.username(); as username) {
      <p>
        Connecté en tant que <strong>{{ username }}</strong
        >.
      </p>

      <section aria-labelledby="online-save-title">
        <h2 id="online-save-title">Sauvegarde en ligne</h2>
        <p class="muted">Retrouvez votre équipe et votre PC sur n’importe quel navigateur.</p>
        <p class="actions">
          <button type="button" [disabled]="busy()" (click)="save()">
            Sauvegarder mon équipe et mon PC
          </button>
          <button type="button" [disabled]="busy()" (click)="restore()">
            Restaurer ma sauvegarde
          </button>
        </p>
      </section>

      <p class="actions">
        <button type="button" [disabled]="busy()" (click)="logout()">Se déconnecter</button>
        <button type="button" class="danger" [disabled]="busy()" (click)="deleteAccount()">
          Supprimer mon compte
        </button>
      </p>
    } @else {
      <app-empty-state>
        <p>Connectez-vous pour sauvegarder votre équipe et votre PC en ligne.</p>
        <a actions routerLink="/compte/connexion">Se connecter</a>
        <a actions routerLink="/compte/inscription">Créer un compte</a>
      </app-empty-state>
    }

    <p role="status" [class.error]="feedback()?.error">{{ feedback()?.text }}</p>
  `,
  styles: `
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    app-empty-state a + a {
      margin-left: 1rem;
    }
    .danger {
      border-color: var(--error);
      color: var(--error);
    }
    [role='status']:empty {
      display: none;
    }
  `,
})
export class AccountPage {
  protected readonly account = inject(Account);
  private readonly backup = inject(Backup);
  private readonly confirmation = inject(Confirmation);

  protected readonly busy = signal(false);
  protected readonly feedback = signal<Feedback | undefined>(undefined);

  protected save(): Promise<void> {
    return this.run(async () => {
      await this.account.save();
      return 'Équipe et PC sauvegardés sur le serveur.';
    });
  }

  protected restore(): Promise<void> {
    return this.run(async () => {
      const saved = await this.account.load();
      if (!saved) {
        return 'Aucune sauvegarde en ligne pour ce compte.';
      }
      const replace =
        this.backup.isEmpty() ||
        (await this.confirmation.ask({
          title: 'Restaurer la sauvegarde ?',
          message: 'Votre équipe et votre PC seront remplacés par ceux sauvegardés en ligne.',
          confirmLabel: 'Remplacer',
        }));
      if (!replace) {
        return undefined;
      }
      const result = this.backup.restore(saved);
      return `Sauvegarde restaurée : ${result.team} dev(s) dans l'équipe, ${result.pc} au PC.`;
    });
  }

  protected logout(): Promise<void> {
    return this.run(async () => {
      await this.account.logout();
      return 'Vous êtes déconnecté.';
    });
  }

  protected deleteAccount(): Promise<void> {
    return this.run(async () => {
      const confirmed = await this.confirmation.ask({
        title: 'Supprimer votre compte ?',
        message:
          'Votre compte et sa sauvegarde en ligne seront définitivement supprimés. ' +
          'Votre équipe et votre PC restent dans ce navigateur.',
        confirmLabel: 'Supprimer',
      });
      if (!confirmed) {
        return undefined;
      }
      await this.account.deleteAccount();
      return 'Votre compte a été supprimé.';
    });
  }

  /** Exécute une action en bloquant les boutons, puis affiche son résultat ou son erreur. */
  private async run(action: () => Promise<string | undefined>): Promise<void> {
    this.busy.set(true);
    this.feedback.set(undefined);
    try {
      const text = await action();
      if (text) {
        this.feedback.set({ text, error: false });
      }
    } catch (error) {
      this.feedback.set({ text: (error as Error).message, error: true });
    } finally {
      this.busy.set(false);
    }
  }
}
