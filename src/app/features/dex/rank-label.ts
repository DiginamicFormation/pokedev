import { Component, computed, input } from '@angular/core';

type Rank = 'junior' | 'confirme' | 'senior';

/** Niveau d'un dev selon le total de ses statistiques. */
@Component({
  selector: 'app-rank-label',
  template: `
    @let current = rank();

    @switch (current) {
      @case ('junior') {
        <span>Junior</span>
      }
      @case ('confirme') {
        <span>Confirmé</span>
      }
      @default {
        <strong>Senior</strong>
      }
    }
    &nbsp;<span class="muted">({{ total() }} points)</span>
  `,
})
export class RankLabel {
  readonly total = input.required<number>();

  protected readonly rank = computed<Rank>(() => {
    const total = this.total();
    return total < 250 ? 'junior' : total < 350 ? 'confirme' : 'senior';
  });
}
