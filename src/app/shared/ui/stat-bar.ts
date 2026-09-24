import { Component, computed, input } from '@angular/core';
import { MAX_STAT } from '../../domain/dev.model';

/** Barre horizontale représentant une statistique sur 100. */
@Component({
  selector: 'app-stat-bar',
  template: `
    <span class="label">{{ label() }}</span>
    <span class="track" aria-hidden="true">
      <span class="fill" [style.width.%]="percent()"></span>
    </span>
    <span class="value">{{ value() }}</span>
  `,
  host: {
    role: 'meter',
    '[attr.aria-label]': 'label()',
    '[attr.aria-valuenow]': 'value()',
    'aria-valuemin': '0',
    '[attr.aria-valuemax]': 'max()',
    '[class.highlight]': 'highlight()',
  },
  styles: `
    :host {
      display: grid;
      grid-template-columns: 8rem 1fr 2.5rem;
      align-items: center;
      gap: 0.5rem;
    }
    .track {
      height: 0.6rem;
      border-radius: 999px;
      background: var(--border);
      overflow: hidden;
    }
    .fill {
      display: block;
      height: 100%;
      background: var(--type-color, var(--accent));
    }
    .value {
      text-align: end;
      font-variant-numeric: tabular-nums;
    }
    :host(.highlight) .label {
      font-weight: 700;
    }
  `,
})
export class StatBar {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly max = input(MAX_STAT);
  readonly highlight = input(false);

  protected readonly percent = computed(() =>
    Math.min(100, Math.round((this.value() / this.max()) * 100)),
  );
}
