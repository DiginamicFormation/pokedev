import { Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, debounce, form } from '@angular/forms/signals';
import { DevRepository } from '../../core/data/dev-repository';
import { isDevType } from '../../core/data/dev-validation';
import { Pc } from '../../core/pc/pc';
import { Team } from '../../core/team/team';
import { DEV_TYPES } from '../../domain/dev.model';
import { filterDevs } from '../../domain/dev-rules';
import { DevCard } from './dev-card';
import { TypeColor } from '../../shared/directives/type-color';
import { TypeLabelPipe } from '../../shared/pipes/type-label-pipe';
import { EmptyState } from '../../shared/ui/empty-state';

@Component({
  selector: 'app-dex-page',
  imports: [FormField, RouterLink, DevCard, EmptyState, TypeColor, TypeLabelPipe],
  template: `
    <h1>Pokédex</h1>

    <form class="filters" (submit)="$event.preventDefault()">
      <label for="search">Rechercher un dev <kbd>/</kbd></label>
      <input
        #searchInput
        id="search"
        type="search"
        autocomplete="off"
        aria-keyshortcuts="/"
        placeholder="Nom, poste ou langage"
        [formField]="searchForm.query"
      />
    </form>

    <nav class="types" aria-label="Filtrer par type">
      <a routerLink="." [queryParams]="{}" [class.active]="!selectedType()">Tous</a>
      @for (type of types; track type) {
        <a
          routerLink="."
          [queryParams]="{ type }"
          [appTypeColor]="type"
          [class.active]="selectedType() === type"
          [attr.aria-current]="selectedType() === type ? 'true' : null"
        >
          {{ type | typeLabel }}
        </a>
      }
    </nav>

    @if (isLoading()) {
      <p role="status">Chargement du pokédex…</p>
    } @else if (error()) {
      <app-empty-state>
        <p class="error">Impossible de charger le pokédex.</p>
        <button actions type="button" (click)="reload()">Réessayer</button>
      </app-empty-state>
    } @else {
      <p class="muted">{{ devs().length }} dev(s)</p>
      <ul class="grid">
        @for (dev of devs(); track dev.id) {
          <li>
            <app-dev-card
              [dev]="dev"
              [inTeam]="team.has(dev.id)"
              [teamFull]="team.isFull()"
              [inPc]="pc.has(dev.id)"
              (teamToggled)="toggleTeam($event)"
            />
          </li>
        }
      </ul>
    }
  `,
  styleUrl: './dex-page.css',
  // Raccourci « / » : écouté sur tout le document, pas seulement quand le focus est dans la page.
  host: {
    '(document:keydown)': 'focusSearch($event)',
  },
})
export class DexPage {
  private readonly repository = inject(DevRepository);
  protected readonly team = inject(Team);
  protected readonly pc = inject(Pc);

  /** Paramètre de requête ?type=…, lié par withComponentInputBinding(). */
  readonly type = input<string>();

  protected readonly types = DEV_TYPES;
  protected readonly isLoading = this.repository.isLoading;
  protected readonly error = this.repository.error;

  protected readonly search = signal({ query: '' });
  protected readonly searchForm = form(this.search, (path) => {
    debounce(path.query, 200);
  });

  private readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly selectedType = computed(() => {
    const type = this.type();
    return isDevType(type) ? type : undefined;
  });

  protected readonly devs = computed(() =>
    filterDevs(this.repository.devs(), {
      query: this.search().query,
      type: this.selectedType(),
    }),
  );

  protected reload(): void {
    this.repository.reload();
  }

  protected toggleTeam(id: number): void {
    if (!this.team.toggle(id)) {
      this.pc.offer(id);
    }
  }

  /**
   * La touche « / » place le curseur dans la recherche, sauf pendant une saisie.
   * On compare event.key plutôt que d'utiliser (keydown./) : sur un clavier AZERTY,
   * « / » s'obtient avec Maj, que le filtre d'Angular refuserait.
   */
  protected focusSearch(event: KeyboardEvent): void {
    if (event.key !== '/') {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select')) {
      return;
    }
    event.preventDefault();
    this.searchInput().nativeElement.focus();
  }
}
