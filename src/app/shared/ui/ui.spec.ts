import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TYPE_COLORS } from '../directives/type-color';
import { DevAvatar } from './dev-avatar';
import { EmptyState } from './empty-state';
import { StatBar } from './stat-bar';
import { TypeBadge } from './type-badge';

/** Crée un composant, lui passe ses entrées et renvoie son élément hôte rendu. */
async function render<T>(component: new () => T, inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(component);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('DevAvatar', () => {
  it.each([
    ['Requêtor', 'R'],
    ['jean-claude dusse', 'JC'],
    ['Ada  Lovelace Byron', 'AL'],
  ])('affiche les initiales de « %s » : %s', async (name, initials) => {
    const element = await render(DevAvatar, { name, type: 'data' });

    expect(element.textContent).toBe(initials);
  });

  it('est une image décrite, à la couleur du type', async () => {
    const element = await render(DevAvatar, { name: 'Requêtor', type: 'data' });

    expect(element.getAttribute('role')).toBe('img');
    expect(element.getAttribute('aria-label')).toBe('Avatar de Requêtor');
    expect(element.style.getPropertyValue('--type-color')).toBe(TYPE_COLORS['data']);
  });
});

describe('StatBar', () => {
  it('affiche la valeur et remplit la barre en proportion, sur 100 par défaut', async () => {
    const element = await render(StatBar, { label: 'Code', value: 35 });

    expect(element.querySelector('.label')?.textContent).toBe('Code');
    expect(element.querySelector('.value')?.textContent).toBe('35');
    expect(element.querySelector<HTMLElement>('.fill')?.style.width).toBe('35%');
  });

  it('se rapporte au maximum donné', async () => {
    const element = await render(StatBar, { label: 'Total', value: 210, max: 420 });

    expect(element.querySelector<HTMLElement>('.fill')?.style.width).toBe('50%');
  });

  it('ne déborde pas au-delà du maximum', async () => {
    const element = await render(StatBar, { label: 'Total', value: 500, max: 420 });

    expect(element.querySelector<HTMLElement>('.fill')?.style.width).toBe('100%');
  });

  it('se présente comme une jauge accessible', async () => {
    const element = await render(StatBar, { label: 'Code', value: 35, max: 420 });

    expect(element.getAttribute('role')).toBe('meter');
    expect(element.getAttribute('aria-label')).toBe('Code');
    expect(element.getAttribute('aria-valuenow')).toBe('35');
    expect(element.getAttribute('aria-valuemin')).toBe('0');
    expect(element.getAttribute('aria-valuemax')).toBe('420');
  });

  it('peut être mise en avant', async () => {
    expect((await render(StatBar, { label: 'Code', value: 35 })).classList).not.toContain(
      'highlight',
    );
    expect(
      (await render(StatBar, { label: 'Code', value: 35, highlight: true })).classList,
    ).toContain('highlight');
  });
});

describe('TypeBadge', () => {
  it('affiche le libellé du type sur sa couleur', async () => {
    const element = await render(TypeBadge, { type: 'securite' });

    expect(element.textContent).toBe('Sécurité');
    expect(element.style.getPropertyValue('--type-color')).toBe(TYPE_COLORS['securite']);
  });
});

@Component({
  imports: [EmptyState],
  template: `
    <app-empty-state>
      <p>Rien ici.</p>
      <a actions href="/devs">Retour</a>
    </app-empty-state>
  `,
})
class EmptyStateHost {}

describe('EmptyState', () => {
  it('place le message et les actions dans leurs zones', async () => {
    const element = await render(EmptyStateHost, {});

    expect(element.querySelector('.message p')?.textContent).toBe('Rien ici.');
    expect(element.querySelector('.actions a')?.textContent).toBe('Retour');
  });
});
