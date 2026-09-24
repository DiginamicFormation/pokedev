/**
 * Depuis Node 25, Node définit son propre `localStorage` global, qui vaut `undefined`
 * sans l'option `--localstorage-file`. Vitest ne le remplace pas par celui de jsdom :
 * on rebranche donc le Web Storage de jsdom (exposé par Vitest via le global `jsdom`).
 */
declare const jsdom: { window: Window } | undefined;

if (typeof jsdom !== 'undefined') {
  for (const key of ['localStorage', 'sessionStorage'] as const) {
    Object.defineProperty(globalThis, key, {
      value: jsdom.window[key],
      configurable: true,
      writable: true,
    });
  }
}
