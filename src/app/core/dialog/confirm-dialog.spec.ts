import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfirmDialog } from './confirm-dialog';
import { Confirmation } from './confirmation';

describe('ConfirmDialog', () => {
  let element: HTMLElement;
  let confirmation: Confirmation;
  // jsdom n'implémente pas showModal() : on reproduit l'ouverture.
  const showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });

  const stable = () => TestBed.inject(ApplicationRef).whenStable();
  const dialog = () => element.querySelector('dialog')!;

  /** Fermeture native de la popin : bouton du formulaire, touche Échap ou clic à l'extérieur. */
  function close(returnValue: string): void {
    dialog().returnValue = returnValue;
    dialog().open = false;
    dialog().dispatchEvent(new Event('close'));
  }

  beforeEach(async () => {
    showModal.mockClear();
    HTMLDialogElement.prototype.showModal = showModal;

    const fixture = TestBed.createComponent(ConfirmDialog);
    element = fixture.nativeElement;
    confirmation = TestBed.inject(Confirmation);
    await stable();
  });

  it('reste fermée sans question', () => {
    expect(showModal).not.toHaveBeenCalled();
    expect(dialog().textContent?.trim()).toBe('');
  });

  it('ouvre la popin avec la question posée', async () => {
    confirmation.ask({ title: 'Supprimer ?', message: 'Action définitive.', confirmLabel: 'Oui' });
    await stable();

    expect(showModal).toHaveBeenCalledTimes(1);
    expect(element.querySelector('h2')?.textContent).toBe('Supprimer ?');
    expect(element.querySelector('#confirm-message')?.textContent).toBe('Action définitive.');
    const buttons = Array.from(element.querySelectorAll('button'));
    expect(buttons.map((button) => [button.value, button.textContent?.trim()])).toEqual([
      ['cancel', 'Annuler'],
      ['confirm', 'Oui'],
    ]);
  });

  it("affiche le libellé d'annulation demandé", async () => {
    confirmation.ask({ title: 'T', message: 'M', confirmLabel: 'Oui', cancelLabel: 'Non merci' });
    await stable();

    expect(element.querySelector('button[value="cancel"]')?.textContent?.trim()).toBe('Non merci');
  });

  it('répond oui quand la popin se ferme sur le bouton de confirmation', async () => {
    const response = confirmation.ask({ title: 'T', message: 'M', confirmLabel: 'Oui' });
    await stable();

    close('confirm');

    await expect(response).resolves.toBe(true);
    expect(confirmation.request()).toBeUndefined();
  });

  it.each([
    ['le bouton Annuler', 'cancel'],
    ['Échap ou un clic à l’extérieur', ''],
  ])('répond non quand la popin se ferme avec %s', async (_, returnValue) => {
    const response = confirmation.ask({ title: 'T', message: 'M', confirmLabel: 'Oui' });
    await stable();

    close(returnValue);

    await expect(response).resolves.toBe(false);
  });

  it('rouvre la popin pour une nouvelle question', async () => {
    confirmation.ask({ title: 'Première', message: 'M', confirmLabel: 'Oui' });
    await stable();
    close('confirm');
    await stable();

    confirmation.ask({ title: 'Seconde', message: 'M', confirmLabel: 'Oui' });
    await stable();

    expect(showModal).toHaveBeenCalledTimes(2);
    expect(element.querySelector('h2')?.textContent).toBe('Seconde');
  });
});
