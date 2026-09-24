import { Component, input } from '@angular/core';
import { DevType } from '../../domain/dev.model';
import { TypeColor } from '../directives/type-color';
import { TypeLabelPipe } from '../pipes/type-label-pipe';

/** Pastille colorée affichant un type. La directive TypeColor est appliquée à l'hôte. */
@Component({
  selector: 'app-type-badge',
  imports: [TypeLabelPipe],
  hostDirectives: [{ directive: TypeColor, inputs: ['appTypeColor: type'] }],
  template: `{{ type() | typeLabel }}`,
  styles: `
    :host {
      display: inline-block;
      padding: 0.1rem 0.6rem;
      border-radius: 999px;
      background: var(--type-color);
      color: #fff;
      font-size: 0.8rem;
      font-weight: 600;
    }
  `,
})
export class TypeBadge {
  readonly type = input.required<DevType>();
}
