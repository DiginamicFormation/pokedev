import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TEST_DEVS } from '../../testing/dev-fixtures';
import { Pc } from '../pc/pc';
import { Team } from './team';

describe('Team', () => {
  let team: Team;

  async function setup(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    team = TestBed.inject(Team);
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne('data/devs.json').flush(TEST_DEVS);
    await TestBed.inject(ApplicationRef).whenStable();
  }

  beforeEach(() => localStorage.clear());

  it('ajoute puis retire un dev', async () => {
    await setup();
    team.toggle(1);
    expect(team.has(1)).toBe(true);
    expect(team.members().map((dev) => dev.name)).toEqual(['Stagiairon']);

    team.toggle(1);
    expect(team.size()).toBe(0);
  });

  it('retire un dev précis, sans effet si absent', async () => {
    await setup();
    team.toggle(1);
    team.toggle(2);

    team.remove(1);
    team.remove(11);

    expect(team.members().map((dev) => dev.id)).toEqual([2]);
  });

  it('refuse un septième membre', async () => {
    await setup();
    for (const id of [1, 2, 3, 4, 5, 6]) {
      team.toggle(id);
    }
    expect(team.isFull()).toBe(true);
    expect(team.toggle(7)).toBe(false);
    expect(team.size()).toBe(6);
  });

  it('calcule la couverture des types', async () => {
    await setup();
    team.toggle(1);
    team.toggle(11);
    expect(team.coverage()).toEqual(['frontend', 'backend', 'data']);
  });

  it("relit l'équipe sauvegardée", async () => {
    localStorage.setItem('pokedev.team.v1', JSON.stringify([2, 11]));
    await setup();
    expect(team.members().map((dev) => dev.id)).toEqual([2, 11]);
  });

  it('ignore un contenu de stockage corrompu', async () => {
    localStorage.setItem('pokedev.team.v1', '{pas du json');
    await setup();
    expect(team.size()).toBe(0);
  });

  it('ignore une version différente', async () => {
    localStorage.setItem('pokedev.team.v0', JSON.stringify([2, 11]));
    await setup();
    expect(team.size()).toBe(0);
  });

  it("vider l'équipe", async () => {
    localStorage.setItem('pokedev.team.v1', JSON.stringify([2, 11]));
    await setup();
    team.clear();
    expect(team.size()).toBe(0);
  });

  it("calcule l'average", async () => {
    localStorage.setItem('pokedev.team.v1', JSON.stringify([2, 11]));
    await setup();
    expect(team.average()).not.toBe(null);

    expect(team.average()).toEqual({
      code: 60,
      debug: 50,
      archi: 43,
      tests: 43,
      communication: 48,
      cafe: 63,
    });
  });

  it('calcule le total stats', async () => {
    localStorage.setItem('pokedev.team.v1', JSON.stringify([2, 11]));
    await setup();

    expect(team.total()).toBe(610);
  });

  it('retire du PC un dev qui rejoint l’équipe', async () => {
    await setup();
    const pc = TestBed.inject(Pc);
    pc.add(11);

    team.toggle(11);

    expect(team.has(11)).toBe(true);
    expect(pc.has(11)).toBe(false);
  });

  it("remplace toute l'équipe, dans la limite de six devs", async () => {
    await setup();
    team.toggle(1);

    team.replace([2, 11]);
    expect(team.members().map((dev) => dev.id)).toEqual([2, 11]);

    team.replace([1, 2, 3, 4, 5, 6, 7]);
    expect(team.size()).toBe(6);
  });
});
