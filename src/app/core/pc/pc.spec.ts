import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TEST_DEVS } from '../../testing/dev-fixtures';
import { Confirmation } from '../dialog/confirmation';
import { Pc } from './pc';

describe('Pc', () => {
  let pc: Pc;

  async function setup(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    pc = TestBed.inject(Pc);
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne('data/devs.json').flush(TEST_DEVS);
    await TestBed.inject(ApplicationRef).whenStable();
  }

  const ids = () => pc.members().map((dev) => dev.id);

  beforeEach(() => localStorage.clear());

  it('ajoute un dev une seule fois', async () => {
    await setup();
    pc.add(11);
    pc.add(11);

    expect(pc.has(11)).toBe(true);
    expect(pc.size()).toBe(1);
    expect(pc.members().map((dev) => dev.name)).toEqual(['Requêtor']);
  });

  it('retire un dev', async () => {
    await setup();
    pc.add(1);
    pc.add(11);

    pc.remove(1);

    expect(ids()).toEqual([11]);
  });

  it('remplace tout son contenu', async () => {
    await setup();
    pc.add(1);

    pc.replace([2, 11]);

    expect(ids()).toEqual([2, 11]);
  });

  it('ignore les numéros qui ne correspondent à aucun dev', async () => {
    localStorage.setItem('pokedev.pc.v1', JSON.stringify([2, 99]));
    await setup();

    expect(ids()).toEqual([2]);
  });

  it('sauvegarde son contenu', async () => {
    await setup();
    pc.add(2);
    TestBed.tick();

    expect(localStorage.getItem('pokedev.pc.v1')).toBe('[2]');
  });

  it('ignore un contenu de stockage invalide', async () => {
    localStorage.setItem('pokedev.pc.v1', JSON.stringify(['a', 'b']));
    await setup();

    expect(pc.size()).toBe(0);
  });

  describe('offer', () => {
    const spyOnAsk = () => vi.spyOn(TestBed.inject(Confirmation), 'ask');

    beforeEach(() => setup());

    it('envoie le dev au PC si l’utilisateur accepte', async () => {
      const ask = spyOnAsk().mockResolvedValue(true);

      await pc.offer(11);

      expect(ask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Équipe pleine',
          message: expect.stringContaining('envoyer Requêtor au PC'),
        }),
      );
      expect(pc.has(11)).toBe(true);
    });

    it('ne fait rien si l’utilisateur refuse', async () => {
      spyOnAsk().mockResolvedValue(false);

      await pc.offer(11);

      expect(pc.has(11)).toBe(false);
    });

    it('ne pose pas la question pour un dev inconnu', async () => {
      const ask = spyOnAsk();

      await pc.offer(99);

      expect(ask).not.toHaveBeenCalled();
      expect(pc.size()).toBe(0);
    });

    it('ne pose pas la question pour un dev déjà au PC', async () => {
      const ask = spyOnAsk();
      pc.add(11);

      await pc.offer(11);

      expect(ask).not.toHaveBeenCalled();
    });
  });
});
