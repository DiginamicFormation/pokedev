import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { Loading } from './core/http/loading';
import { Pc } from './core/pc/pc';
import { Team } from './core/team/team';
import { TEST_DEVS } from './testing/dev-fixtures';

describe('App', () => {
  let element: HTMLElement;

  const stable = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(App);
    element = fixture.nativeElement;
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne('data/devs.json').flush(TEST_DEVS);
    await stable();
  });

  const link = (href: string) => element.querySelector(`nav a[href="${href}"]`);

  it('propose la navigation principale', () => {
    const links = Array.from(element.querySelectorAll('nav a'));

    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/devs',
      '/equipe',
      '/pc',
      '/creer',
      '/compte',
    ]);
    expect(element.querySelector('.brand')?.getAttribute('href')).toBe('/devs');
  });

  it("compte les devs de l'équipe et du PC", async () => {
    TestBed.inject(Team).toggle(1);
    TestBed.inject(Pc).add(2);
    TestBed.inject(Pc).add(11);
    await stable();

    expect(link('/equipe')?.querySelector('.count')?.textContent).toBe('1');
    expect(link('/pc')?.querySelector('.count')?.textContent).toBe('2');
  });

  it('affiche une barre de progression pendant les requêtes', async () => {
    expect(element.querySelector('[role="progressbar"]')).toBeNull();

    TestBed.inject(Loading).start();
    await stable();
    expect(element.querySelector('[role="progressbar"]')).not.toBeNull();

    TestBed.inject(Loading).stop();
    await stable();
    expect(element.querySelector('[role="progressbar"]')).toBeNull();
  });

  it('affiche la météo dans la barre de navigation', () => {
    // jsdom n'a pas de géolocalisation : la météo est indisponible.
    expect(element.querySelector('header app-weather-widget')?.textContent?.trim()).toBe(
      'Météo indisponible',
    );
  });

  it('contient la popin de confirmation partagée', () => {
    expect(element.querySelector('app-confirm-dialog dialog')).not.toBeNull();
  });
});
