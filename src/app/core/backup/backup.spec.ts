import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Dev } from '../../domain/dev.model';
import { TEST_DEVS } from '../../testing/dev-fixtures';
import { DevRepository } from '../data/dev-repository';
import { Pc } from '../pc/pc';
import { Team } from '../team/team';
import { Backup } from './backup';
import { createBackup } from './backup-file';

/** Dev personnalisé créé dans un autre navigateur : son numéro n'a pas de sens ici. */
const TESTEUSE: Dev = { ...TEST_DEVS[0], id: 40, name: 'Testeuse', custom: true };

const DATE = new Date('2026-09-24T10:30:00Z');

describe('Backup', () => {
  let backup: Backup;
  let repository: DevRepository;
  let team: Team;
  let pc: Pc;

  async function setup(): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backup = TestBed.inject(Backup);
    repository = TestBed.inject(DevRepository);
    team = TestBed.inject(Team);
    pc = TestBed.inject(Pc);
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne('data/devs.json').flush(TEST_DEVS);
    await TestBed.inject(ApplicationRef).whenStable();
  }

  const ids = (devs: readonly Dev[]) => devs.map((dev) => dev.id);

  beforeEach(async () => {
    localStorage.clear();
    await setup();
  });

  it("exporte les devs complets de l'équipe et du PC", () => {
    team.toggle(1);
    pc.add(11);

    const file = backup.create();

    expect(file.team.map((dev) => dev.name)).toEqual(['Stagiairon']);
    expect(file.pc.map((dev) => dev.name)).toEqual(['Requêtor']);
  });

  it("n'autorise l'export que si l'équipe ou le PC contient un dev", () => {
    expect(backup.isEmpty()).toBe(true);
    pc.add(11);
    expect(backup.isEmpty()).toBe(false);
  });

  it("remplace l'équipe et le PC par ceux de la sauvegarde", () => {
    team.toggle(2);
    const result = backup.restore(createBackup([TEST_DEVS[0]], [TEST_DEVS[2]], DATE));
    TestBed.tick();

    expect(ids(team.members())).toEqual([1]);
    expect(ids(pc.members())).toEqual([11]);
    expect(result).toEqual({ team: 1, pc: 1, created: 0 });
    expect(localStorage.getItem('pokedev.team.v1')).toBe('[1]');
    expect(localStorage.getItem('pokedev.pc.v1')).toBe('[11]');
  });

  it("reconnaît un dev du fichier JSON à son numéro, même si le fichier l'a renommé depuis", () => {
    const exported = { ...TEST_DEVS[0], name: 'Ancien nom' };

    const result = backup.restore(createBackup([exported], [], DATE));

    expect(team.members().map((dev) => [dev.id, dev.name])).toEqual([[1, 'Stagiairon']]);
    expect(result.created).toBe(0);
  });

  it('ajoute au pokédex un dev personnalisé inconnu, sans son évolution', () => {
    const result = backup.restore(createBackup([TESTEUSE], [], DATE));

    const created = team.members()[0];
    expect(created.name).toBe('Testeuse');
    expect(created.id).toBe(12);
    expect(created.custom).toBe(true);
    expect(created.evolvesTo).toBeUndefined();
    expect(result.created).toBe(1);
  });

  it('ne recrée pas un dev personnalisé déjà importé', () => {
    const file = createBackup([TESTEUSE], [], DATE);
    backup.restore(file);

    const result = backup.restore(file);

    expect(result.created).toBe(0);
    expect(repository.devs()).toHaveLength(4);
  });

  it('recrée comme dev personnalisé un dev qui a disparu du fichier JSON', () => {
    const retired = { ...TEST_DEVS[1], id: 50, name: 'Retraité' };

    const result = backup.restore(createBackup([], [retired], DATE));

    expect(pc.members().map((dev) => [dev.id, dev.name, dev.custom])).toEqual([
      [12, 'Retraité', true],
    ]);
    expect(result.created).toBe(1);
  });

  it("garde dans l'équipe un dev présent aussi au PC, sans doublon", () => {
    const file = createBackup([TEST_DEVS[0]], [TEST_DEVS[0], TEST_DEVS[2], TEST_DEVS[2]], DATE);

    const result = backup.restore(file);

    expect(ids(team.members())).toEqual([1]);
    expect(ids(pc.members())).toEqual([11]);
    expect(result).toEqual({ team: 1, pc: 1, created: 0 });
  });
});
