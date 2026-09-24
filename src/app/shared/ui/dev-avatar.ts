import { Component, computed, input } from '@angular/core';
import { DevType } from '../../domain/dev.model';
import { TypeColor } from '../directives/type-color';

/** Avatar généré : initiales du dev sur la couleur de son type principal. */
@Component({
  selector: 'app-dev-avatar',
  hostDirectives: [{ directive: TypeColor, inputs: ['appTypeColor: type'] }],
  host: { role: 'img', '[attr.aria-label]': '"Avatar de " + name()' },
  template: `{{ initials() }}`,
  styles: `
    :host {
      display: grid;
      place-items: center;
      width: var(--avatar-size, 3.5rem);
      aspect-ratio: 1;
      border-radius: 50%;
      background: var(--type-color);
      color: #fff;
      font-weight: 700;
      font-size: calc(var(--avatar-size, 3.5rem) / 2.6);
    }
  `,
})
export class DevAvatar {
  readonly name = input.required<string>();
  readonly type = input.required<DevType>();

  protected readonly initials = computed(() =>
    this.name()
      .split(/[\s-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join(''),
  );
}
