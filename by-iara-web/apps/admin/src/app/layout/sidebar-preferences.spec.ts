import { TestBed } from '@angular/core/testing';
import { SidebarPreferences } from './sidebar-preferences';

describe('SidebarPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('starts with Dashboard and Reports as favorites', () => {
    const preferences = TestBed.inject(SidebarPreferences);

    expect([...preferences.favoriteIds()]).toEqual(['dashboard', 'reports']);
  });

  it('persists user-selected favorites', () => {
    const preferences = TestBed.inject(SidebarPreferences);
    preferences.toggleFavorite('services');
    preferences.toggleFavorite('dashboard');

    TestBed.resetTestingModule();
    const restored = TestBed.inject(SidebarPreferences);

    expect([...restored.favoriteIds()]).toEqual(['reports', 'services']);
  });
});
