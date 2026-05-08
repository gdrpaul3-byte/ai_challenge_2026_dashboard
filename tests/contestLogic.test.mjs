import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getContestStatus,
  getPrizeRangeSummary,
  getTimelineStepState,
  sortContestsByPriority,
} from '../web/js/contestLogic.mjs';

const today = '2026-05-08';

test('marks registration ending within seven days as closing soon', () => {
  const status = getContestStatus({
    registrationStart: '2026-04-20',
    registrationEnd: '2026-05-15',
    registrationConfidence: 'exact',
  }, today);

  assert.equal(status.key, 'closing-soon');
  assert.equal(status.daysUntilEnd, 7);
});

test('marks exact open, upcoming, closed, and ambiguous registration states', () => {
  assert.equal(getContestStatus({
    registrationStart: '2026-05-01',
    registrationEnd: '2026-05-30',
    registrationConfidence: 'exact',
  }, today).key, 'open');

  assert.equal(getContestStatus({
    registrationStart: '2026-06-01',
    registrationEnd: '2026-06-30',
    registrationConfidence: 'exact',
  }, today).key, 'upcoming');

  assert.equal(getContestStatus({
    registrationStart: '2026-03-01',
    registrationEnd: '2026-04-01',
    registrationConfidence: 'exact',
  }, today).key, 'closed');

  assert.equal(getContestStatus({
    registrationStart: null,
    registrationEnd: null,
    registrationConfidence: 'season',
  }, today).key, 'ambiguous');
});

test('sorts contests by operational priority and relevant date', () => {
  const contests = [
    {
      id: 'closed-recent',
      title: 'Closed Recent',
      registrationStart: '2026-03-01',
      registrationEnd: '2026-05-01',
      registrationConfidence: 'exact',
    },
    {
      id: 'upcoming',
      title: 'Upcoming',
      registrationStart: '2026-06-01',
      registrationEnd: '2026-06-30',
      registrationConfidence: 'exact',
    },
    {
      id: 'open-later',
      title: 'Open Later',
      registrationStart: '2026-04-01',
      registrationEnd: '2026-05-30',
      registrationConfidence: 'exact',
    },
    {
      id: 'closing',
      title: 'Closing',
      registrationStart: '2026-04-20',
      registrationEnd: '2026-05-15',
      registrationConfidence: 'exact',
    },
    {
      id: 'ambiguous',
      title: 'Ambiguous',
      registrationStart: null,
      registrationEnd: null,
      registrationConfidence: 'month',
    },
  ];

  assert.deepEqual(
    sortContestsByPriority(contests, today).map((contest) => contest.id),
    ['closing', 'open-later', 'upcoming', 'ambiguous', 'closed-recent'],
  );
});

test('calculates timeline step state from start and end dates', () => {
  assert.equal(getTimelineStepState({ start: '2026-04-01', end: '2026-04-30' }, today), 'past');
  assert.equal(getTimelineStepState({ start: '2026-05-01', end: '2026-05-20' }, today), 'current');
  assert.equal(getTimelineStepState({ start: '2026-06-01', end: '2026-06-02' }, today), 'upcoming');
  assert.equal(getTimelineStepState({ dateDisplay: '추후 공지' }, today), 'unknown');
});

test('summarizes prize range data and preserves per-category items', () => {
  const summary = getPrizeRangeSummary({
    prizeRangeDisplay: '100만~5,000만 원',
    prizeRangeBasis: '부문별 수상 팀 1팀 수령액 기준',
    prizeRangeItems: [
      {
        label: '실증 부문',
        display: '1,000만~5,000만 원',
        minKrw: 10000000,
        maxKrw: 50000000,
        basis: '대상 5,000만 원, 최우수상 2,000만 원, 우수상 1,000만 원',
      },
      {
        label: '아이디어 부문',
        display: '100만~500만 원',
        minKrw: 1000000,
        maxKrw: 5000000,
        basis: '대상 500만 원, 최우수상 300만 원, 우수상 100만 원',
      },
    ],
  });

  assert.equal(summary.display, '100만~5,000만 원');
  assert.equal(summary.basis, '부문별 수상 팀 1팀 수령액 기준');
  assert.deepEqual(summary.items.map((item) => item.label), ['실증 부문', '아이디어 부문']);
});
