import { TestBed } from '@angular/core/testing';
import { STREAK_FREEZE, StreakFreezeService } from './streak-freeze.service';
import { SkillSyncService } from './skill-sync.service';

describe('StreakFreezeService', () => {
  let markChanged: jasmine.Spy;

  function create(): StreakFreezeService {
    markChanged = jasmine.createSpy('markChanged');
    TestBed.configureTestingModule({
      providers: [{ provide: SkillSyncService, useValue: { register: () => {}, markChanged } }],
    });
    return TestBed.inject(StreakFreezeService);
  }

  beforeEach(() => localStorage.removeItem('streak-freeze-v1'));
  afterEach(() => localStorage.removeItem('streak-freeze-v1'));

  it('starts with one freeze', () => {
    expect(create().count()).toBe(STREAK_FREEZE.INITIAL);
  });

  it('consume() spends a freeze and refuses when empty', () => {
    const svc = create();
    expect(svc.consume()).toBeTrue();
    expect(svc.count()).toBe(0);
    expect(svc.consume()).toBeFalse();
    expect(markChanged).toHaveBeenCalledWith('streak-freeze-v1');
  });

  it('awards one freeze per 7-day milestone, once, up to the max', () => {
    const svc = create();
    expect(svc.onStreakReached(6)).toBeFalse();
    expect(svc.onStreakReached(7)).toBeTrue();
    expect(svc.count()).toBe(2);
    expect(svc.onStreakReached(7)).toBeFalse(); // same milestone again
    expect(svc.onStreakReached(14)).toBeFalse(); // already at max
    expect(svc.count()).toBe(STREAK_FREEZE.MAX);
  });

  it('persists across instances', () => {
    create().consume();
    TestBed.resetTestingModule();
    expect(create().count()).toBe(0);
  });
});
