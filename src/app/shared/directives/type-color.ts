import { Directive, computed, input } from '@angular/core';
import { DevType } from '../../domain/dev.model';

export const TYPE_COLORS: Record<DevType, string> = {
  frontend: '#d9480f',
  backend: '#1864ab',
  devops: '#2b8a3e',
  data: '#862e9c',
  mobile: '#c2255c',
  securite: '#495057',
};

/**
 * Directive d'attribut : applique la couleur d'un type à l'élément hôte,
 * via la variable CSS --type-color.
 * Usage : <span [appTypeColor]="'data'">Data</span>
 */
@Directive({
  selector: '[appTypeColor]',
  host: {
    '[style.--type-color]': 'color()',
    '[attr.data-type]': 'appTypeColor()',
  },
})
export class TypeColor {
  readonly appTypeColor = input.required<DevType>();

  protected readonly color = computed(() => TYPE_COLORS[this.appTypeColor()]);
}
