import { Component, inject, signal } from '@angular/core';
import { Backup } from '../../core/backup/backup';
import { BackupFile } from '../../core/backup/backup-file';
import { Confirmation } from '../../core/dialog/confirmation';

interface Feedback {
  readonly text: string;
  readonly error: boolean;
}

/** Boutons d'export et d'import de l'équipe et du PC, avec le bilan de la dernière action. */
@Component({
  selector: 'app-backup-panel',
  template: `
    <section aria-labelledby="backup-title">
      <h2 id="backup-title">Sauvegarde</h2>
      <p class="muted">
        Exportez votre équipe et votre PC dans un fichier pour les retrouver plus tard, ou dans un
        autre navigateur.
      </p>
      <p class="actions">
        <button type="button" [disabled]="backup.isEmpty()" (click)="backup.download()">
          Exporter l'équipe et le PC
        </button>
        <!-- Le champ fichier natif est masqué : le bouton l'ouvre. -->
        <button type="button" [disabled]="!backup.canRestore()" (click)="fileInput.click()">
          Importer une sauvegarde
        </button>
        <input
          #fileInput
          type="file"
          accept=".json,application/json"
          hidden
          (change)="import(fileInput)"
        />
      </p>
      <p role="status" [class.error]="feedback()?.error">{{ feedback()?.text }}</p>
    </section>
  `,
  styles: `
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    [role='status']:empty {
      display: none;
    }
  `,
})
export class BackupPanel {
  protected readonly backup = inject(Backup);
  private readonly confirmation = inject(Confirmation);

  protected readonly feedback = signal<Feedback | undefined>(undefined);

  protected async import(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    // Vide le champ : choisir de nouveau le même fichier redéclenchera l'import.
    input.value = '';
    if (!file) {
      return;
    }

    let backup: BackupFile;
    try {
      backup = await this.backup.read(file);
    } catch (error) {
      this.feedback.set({ text: (error as Error).message, error: true });
      return;
    }

    if (!this.backup.isEmpty()) {
      const confirmed = await this.confirmation.ask({
        title: 'Importer la sauvegarde ?',
        message:
          `Votre équipe et votre PC seront remplacés par ceux du fichier : ` +
          `${backup.team.length} dev(s) dans l'équipe, ${backup.pc.length} au PC.`,
        confirmLabel: 'Remplacer',
      });
      if (!confirmed) {
        return;
      }
    }

    const result = this.backup.restore(backup);
    const created = result.created > 0 ? ` ${result.created} dev(s) ajouté(s) au pokédex.` : '';
    this.feedback.set({
      text: `Sauvegarde importée : ${result.team} dev(s) dans l'équipe, ${result.pc} au PC.${created}`,
      error: false,
    });
  }
}
