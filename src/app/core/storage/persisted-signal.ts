import { WritableSignal, effect, signal } from '@angular/core';

/** Validation d'une liste de numéros de devs relue depuis le localStorage. */
export function isIdList(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((id) => Number.isInteger(id));
}

function read<T>(key: string, initial: T, isValid: (value: unknown) => value is T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (isValid(parsed)) {
        return parsed;
      }
    }
  } catch {
    console.error('Localstorage invalide pour la clé', key);
  }
  return initial;
}

/**
 * Signal dont la valeur est sauvegardée dans le localStorage à chaque modification.
 * `isValid` vérifie la valeur relue : le contenu du localStorage n'est pas fiable.
 * À appeler dans un contexte d'injection (champ ou constructeur d'un service).
 */
export function persistedSignal<T>(
  key: string,
  initial: T,
  isValid: (value: unknown) => value is T,
): WritableSignal<T> {
  // on lit depuis le localstorage
  const stateValues = read(key, initial, isValid);
  // on crée un state (signal)
  const state = signal<T>(stateValues);

  // on déclare un effect (s'exécute de manière autonome à partir du changement de state())
  effect(() => {
    const value = state();
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // Stockage plein ou désactivé : setItem lève une DOMException.
      console.error('Oulala le localstorage va pas bien', (e as Error).message);
    }
  });

  return state;
}
