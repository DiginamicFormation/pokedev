import { DOCUMENT, Service, computed, inject } from '@angular/core';
import { Dev } from '../../domain/dev.model';
import { DevRepository } from '../data/dev-repository';
import { Pc } from '../pc/pc';
import { Team } from '../team/team';
import { BackupFile, backupFileName, createBackup, parseBackup } from './backup-file';

/** Bilan d'un import, pour informer l'utilisateur. */
export interface RestoreResult {
  readonly team: number;
  readonly pc: number;
  /** Devs absents de ce navigateur, ajoutés au pokédex comme devs personnalisés. */
  readonly created: number;
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Export et ré-import de l'équipe et du PC dans un fichier JSON. */
@Service()
export class Backup {
  private readonly document = inject(DOCUMENT);
  private readonly repository = inject(DevRepository);
  private readonly team = inject(Team);
  private readonly pc = inject(Pc);

  readonly isEmpty = computed(() => this.team.size() + this.pc.size() === 0);

  /**
   * L'import a besoin du pokédex complet pour reconnaître les devs :
   * sans lui, tous seraient recréés comme devs personnalisés.
   */
  readonly canRestore = computed(() => !this.repository.isLoading() && !this.repository.error());

  create(): BackupFile {
    return createBackup(this.team.members(), this.pc.members(), new Date());
  }

  /** Fait télécharger la sauvegarde au navigateur. */
  download(): void {
    const backup = this.create();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = backupFileName(backup);
    link.click();
    // Libère l'URL une fois le téléchargement lancé.
    setTimeout(() => URL.revokeObjectURL(url));
  }

  /** Lit un fichier choisi par l'utilisateur ; lève une erreur au message affichable s'il est invalide. */
  async read(file: File): Promise<BackupFile> {
    return parseBackup(await file.text());
  }

  /** Remplace l'équipe et le PC par ceux de la sauvegarde. */
  restore(backup: BackupFile): RestoreResult {
    let created = 0;
    const resolve = (dev: Dev): number => {
      const local = this.findLocal(dev);
      if (local) {
        return local.id;
      }
      created++;
      // L'évolution désigne un numéro du navigateur d'origine : elle n'est pas reprise.
      return this.repository.add({ ...dev, evolvesTo: undefined });
    };
    const team = [...new Set(backup.team.map(resolve))];
    // Un dev ne peut pas être à la fois dans l'équipe et au PC.
    const pc = [...new Set(backup.pc.map(resolve))].filter((id) => !team.includes(id));

    this.team.replace(team);
    this.pc.replace(pc);
    return { team: team.length, pc: pc.length, created };
  }

  /** Le dev de ce navigateur qui correspond à un dev de la sauvegarde. */
  private findLocal(dev: Dev): Dev | undefined {
    const devs = this.repository.devs();
    // Un dev du fichier JSON garde son numéro, même si le fichier l'a renommé depuis l'export.
    const original = dev.custom
      ? undefined
      : devs.find((local) => !local.custom && local.id === dev.id);
    // Sinon, on le reconnaît à son nom, unique dans le pokédex.
    return original ?? devs.find((local) => sameName(local.name, dev.name));
  }
}
