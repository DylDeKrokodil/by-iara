import { TestBed } from '@angular/core/testing';
import { SidebarPreferences } from './sidebar-preferences';

describe('SidebarPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('starts with every navigation group open', () => {
    const preferences = TestBed.inject(SidebarPreferences);

    expect([...preferences.openGroupIds()]).toEqual([
      'appointments',
      'catalogue',
      'content',
      'business',
    ]);
  });

  it('persists collapsed groups', () => {
    const preferences = TestBed.inject(SidebarPreferences);
    preferences.toggleGroup('content');

    TestBed.resetTestingModule();
    const restored = TestBed.inject(SidebarPreferences);

    expect([...restored.openGroupIds()]).toEqual([
      'appointments',
      'catalogue',
      'business',
    ]);
  });

  it('opens a collapsed group without duplicating it', () => {
    const preferences = TestBed.inject(SidebarPreferences);
    preferences.toggleGroup('catalogue');
    preferences.openGroup('catalogue');
    preferences.openGroup('catalogue');

    expect([...preferences.openGroupIds()]).toEqual([
      'appointments',
      'content',
      'business',
      'catalogue',
    ]);
  });
});
