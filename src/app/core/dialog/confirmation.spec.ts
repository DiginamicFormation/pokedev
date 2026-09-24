import { TestBed } from '@angular/core/testing';
import { Confirmation, ConfirmationRequest } from './confirmation';

const REQUEST: ConfirmationRequest = {
  title: 'Supprimer ?',
  message: 'Action définitive.',
  confirmLabel: 'Supprimer',
};

describe('Confirmation', () => {
  let confirmation: Confirmation;

  beforeEach(() => {
    confirmation = TestBed.inject(Confirmation);
  });

  it("n'a aucune question en cours au départ", () => {
    expect(confirmation.request()).toBeUndefined();
  });

  it('expose la question posée', () => {
    confirmation.ask(REQUEST);

    expect(confirmation.request()).toEqual(REQUEST);
  });

  it.each([true, false])(
    'résout la promesse avec la réponse %s et ferme la question',
    async (answer) => {
      const response = confirmation.ask(REQUEST);

      confirmation.answer(answer);

      await expect(response).resolves.toBe(answer);
      expect(confirmation.request()).toBeUndefined();
    },
  );

  it('considère la question précédente comme refusée', async () => {
    const first = confirmation.ask(REQUEST);
    const second = confirmation.ask({ ...REQUEST, title: 'Autre question' });

    await expect(first).resolves.toBe(false);
    expect(confirmation.request()?.title).toBe('Autre question');

    confirmation.answer(true);
    await expect(second).resolves.toBe(true);
  });

  it('ignore une réponse sans question en cours', () => {
    expect(() => confirmation.answer(true)).not.toThrow();
  });
});
