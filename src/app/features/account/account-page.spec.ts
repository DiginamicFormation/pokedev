import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Account, AccountError } from '../../core/account/account';
import { Backup } from '../../core/backup/backup';
import { createBackup } from '../../core/backup/backup-file';
import { Confirmation } from '../../core/dialog/confirmation';
import { AccountPage } from './account-page';

const SAVED = createBackup([], [], new Date('2026-09-24T10:00:00Z'));

describe('AccountPage', () => {
  let element: HTMLElement;
  const username = signal<string | undefined>('sacha');
  const account = {
    username,
    save: vi.fn<Account['save']>(),
    load: vi.fn<Account['load']>(),
    logout: vi.fn<Account['logout']>(),
    deleteAccount: vi.fn<Account['deleteAccount']>(),
  };
  const backup = {
    isEmpty: vi.fn(() => true),
    restore: vi.fn(() => ({ team: 1, pc: 2, created: 0 })),
  };

  const stable = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(async () => {
    username.set('sacha');
    vi.clearAllMocks();
    backup.isEmpty.mockReturnValue(true);
    account.logout.mockImplementation(async () => username.set(undefined));
    account.deleteAccount.mockImplementation(async () => username.set(undefined));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Account, useValue: account },
        { provide: Backup, useValue: backup },
      ],
    });
    const fixture = TestBed.createComponent(AccountPage);
    element = fixture.nativeElement;
    await stable();
  });

  const button = (text: string) =>
    Array.from(element.querySelectorAll('button')).find(
      (node) => node.textContent?.trim() === text,
    )!;
  const status = () => element.querySelector('[role="status"]')!;

  /** Clique sur un bouton puis attend la fin de l'action : les doubles répondent en microtâches. */
  async function click(text: string): Promise<void> {
    button(text).click();
    await new Promise((resolve) => setTimeout(resolve));
    await stable();
  }

  const ask = () => vi.spyOn(TestBed.inject(Confirmation), 'ask');

  it('invite à se connecter ou à créer un compte sans session', async () => {
    username.set(undefined);
    await stable();

    const links = Array.from(element.querySelectorAll('app-empty-state a'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/compte/connexion',
      '/compte/inscription',
    ]);
    expect(element.querySelector('button')).toBeNull();
  });

  it('indique le compte connecté', () => {
    expect(element.textContent).toContain('Connecté en tant que sacha.');
  });

  it("sauvegarde l'équipe et le PC sur le serveur", async () => {
    await click('Sauvegarder mon équipe et mon PC');

    expect(account.save).toHaveBeenCalled();
    expect(status().textContent).toBe('Équipe et PC sauvegardés sur le serveur.');
    expect(status().classList).not.toContain('error');
  });

  it('affiche un échec de sauvegarde', async () => {
    account.save.mockRejectedValue(new AccountError('Serveur injoignable.', 0));

    await click('Sauvegarder mon équipe et mon PC');

    expect(status().textContent).toBe('Serveur injoignable.');
    expect(status().classList).toContain('error');
  });

  it("bloque les boutons pendant l'action", async () => {
    let finish!: () => void;
    account.save.mockReturnValue(new Promise((resolve) => (finish = resolve)));

    button('Sauvegarder mon équipe et mon PC').click();
    await stable();
    expect(Array.from(element.querySelectorAll('button')).every((b) => b.disabled)).toBe(true);

    finish();
    await vi.waitFor(() => expect(element.querySelector('button:disabled')).toBeNull());
  });

  it('restaure la sauvegarde en ligne', async () => {
    account.load.mockResolvedValue(SAVED);
    const confirm = ask();

    await click('Restaurer ma sauvegarde');

    expect(confirm).not.toHaveBeenCalled();
    expect(backup.restore).toHaveBeenCalledWith(SAVED);
    expect(status().textContent).toBe("Sauvegarde restaurée : 1 dev(s) dans l'équipe, 2 au PC.");
  });

  it("demande confirmation avant de remplacer l'équipe et le PC", async () => {
    account.load.mockResolvedValue(SAVED);
    backup.isEmpty.mockReturnValue(false);
    const confirm = ask().mockResolvedValue(false);

    await click('Restaurer ma sauvegarde');

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Restaurer la sauvegarde ?' }),
    );
    expect(backup.restore).not.toHaveBeenCalled();
    expect(status().textContent).toBe('');
  });

  it("signale l'absence de sauvegarde en ligne", async () => {
    account.load.mockResolvedValue(undefined);

    await click('Restaurer ma sauvegarde');

    expect(backup.restore).not.toHaveBeenCalled();
    expect(status().textContent).toBe('Aucune sauvegarde en ligne pour ce compte.');
  });

  it('se déconnecte', async () => {
    await click('Se déconnecter');

    expect(account.logout).toHaveBeenCalled();
    expect(status().textContent).toBe('Vous êtes déconnecté.');
    expect(element.querySelector('app-empty-state')).not.toBeNull();
  });

  it('supprime le compte après confirmation', async () => {
    const confirm = ask().mockResolvedValue(true);

    await click('Supprimer mon compte');

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Supprimer votre compte ?' }),
    );
    expect(account.deleteAccount).toHaveBeenCalled();
    expect(status().textContent).toBe('Votre compte a été supprimé.');
  });

  it("ne supprime rien si l'utilisateur annule", async () => {
    ask().mockResolvedValue(false);

    await click('Supprimer mon compte');

    expect(account.deleteAccount).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Connecté en tant que sacha.');
  });
});
