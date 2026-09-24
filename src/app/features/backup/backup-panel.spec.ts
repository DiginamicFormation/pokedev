import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { createBackup } from '../../core/backup/backup-file';
import { DevRepository } from '../../core/data/dev-repository';
import { Confirmation } from '../../core/dialog/confirmation';
import { Pc } from '../../core/pc/pc';
import { Team } from '../../core/team/team';
import { TEST_DEVS } from '../../testing/dev-fixtures';
import { BackupPanel } from './backup-panel';

describe('BackupPanel', () => {
  let element: HTMLElement;
  let team: Team;
  let pc: Pc;

  const stable = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(BackupPanel);
    element = fixture.nativeElement;
    team = TestBed.inject(Team);
    pc = TestBed.inject(Pc);
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne('data/devs.json').flush(TEST_DEVS);
    await stable();
  });

  const button = (text: string) =>
    Array.from(element.querySelectorAll('button')).find(
      (node) => node.textContent?.trim() === text,
    )!;
  const status = () => element.querySelector('[role="status"]')!;

  /** Simule le choix d'un fichier dans le champ masqué. */
  function choose(content: string): void {
    const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File([content], 'pokedev.json', { type: 'application/json' });
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
  }

  /** Attend la fin de l'import : il affiche toujours un message, sauf s'il est annulé. */
  async function imported(): Promise<void> {
    await vi.waitFor(() => expect(status().textContent?.trim()).not.toBe(''));
    await stable();
  }

  const exportText = JSON.stringify(createBackup([TEST_DEVS[0]], [TEST_DEVS[2]], new Date()));

  it("désactive l'export tant que l'équipe et le PC sont vides", async () => {
    expect(button("Exporter l'équipe et le PC").disabled).toBe(true);

    pc.add(11);
    await stable();

    expect(button("Exporter l'équipe et le PC").disabled).toBe(false);
  });

  it('télécharge un fichier JSON daté', async () => {
    team.toggle(1);
    await stable();
    URL.createObjectURL = vi.fn(() => 'blob:pokedev');
    URL.revokeObjectURL = vi.fn();
    // Pas de vrai téléchargement : on récupère le lien cliqué.
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    button("Exporter l'équipe et le PC").click();

    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toMatch(/^pokedev-\d{4}-\d{2}-\d{2}\.json$/);
    expect(link.href).toBe('blob:pokedev');
    click.mockRestore();
  });

  it("importe une sauvegarde sans confirmation quand l'équipe et le PC sont vides", async () => {
    const ask = vi.spyOn(TestBed.inject(Confirmation), 'ask');

    choose(exportText);
    await imported();

    expect(ask).not.toHaveBeenCalled();
    expect(team.members().map((dev) => dev.id)).toEqual([1]);
    expect(pc.members().map((dev) => dev.id)).toEqual([11]);
    expect(status().textContent).toContain("1 dev(s) dans l'équipe, 1 au PC");
  });

  it("demande confirmation avant de remplacer l'équipe et le PC", async () => {
    team.toggle(2);
    const ask = vi.spyOn(TestBed.inject(Confirmation), 'ask').mockResolvedValue(true);

    choose(exportText);
    await imported();

    expect(ask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Importer la sauvegarde ?' }),
    );
    expect(team.members().map((dev) => dev.id)).toEqual([1]);
  });

  it("ne change rien si l'utilisateur annule", async () => {
    team.toggle(2);
    const ask = vi.spyOn(TestBed.inject(Confirmation), 'ask').mockResolvedValue(false);

    choose(exportText);
    await vi.waitFor(() => expect(ask).toHaveBeenCalled());
    // Laisse la réponse à la popin être traitée.
    await new Promise((resolve) => setTimeout(resolve));
    await stable();

    expect(team.members().map((dev) => dev.id)).toEqual([2]);
    expect(status().textContent?.trim()).toBe('');
  });

  it("affiche l'erreur d'un fichier invalide", async () => {
    choose('{pas du json');
    await imported();

    expect(status().textContent).toContain('pas un fichier JSON valide');
    expect(status().classList).toContain('error');
  });

  it('signale les devs ajoutés au pokédex', async () => {
    const stranger = { ...TEST_DEVS[1], id: 40, name: 'Testeuse', custom: true };
    choose(JSON.stringify(createBackup([stranger], [], new Date())));
    await imported();

    expect(status().textContent).toContain('1 dev(s) ajouté(s) au pokédex.');
    expect(status().classList).not.toContain('error');
  });

  it('ouvre le sélecteur de fichier', () => {
    const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
    const click = vi.spyOn(input, 'click').mockImplementation(() => undefined);

    button('Importer une sauvegarde').click();

    expect(click).toHaveBeenCalled();
  });

  it('ne fait rien si aucun fichier n’est choisi', async () => {
    const input = element.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [], configurable: true });

    input.dispatchEvent(new Event('change'));
    await stable();

    expect(status().textContent?.trim()).toBe('');
  });

  it("désactive l'import pendant le chargement du pokédex et s'il a échoué", async () => {
    TestBed.inject(DevRepository).reload();
    TestBed.tick();
    expect(button('Importer une sauvegarde').disabled).toBe(true);

    TestBed.inject(HttpTestingController)
      .expectOne('data/devs.json')
      .flush('Erreur', { status: 500, statusText: 'Server Error' });
    await stable();
    expect(button('Importer une sauvegarde').disabled).toBe(true);
  });
});
