const DAY_MS = 24 * 60 * 60 * 1000;

const STATUS_META = {
  'closing-soon': { label: '마감 임박', rank: 0 },
  open: { label: '접수중', rank: 1 },
  upcoming: { label: '예정', rank: 2 },
  ambiguous: { label: '일정 확인 필요', rank: 3 },
  closed: { label: '마감', rank: 4 },
};

function toDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function compareDateValues(a, b) {
  const aDate = toDateOnly(a);
  const bDate = toDateOnly(b);
  if (!aDate && !bDate) return 0;
  if (!aDate) return 1;
  if (!bDate) return -1;
  return aDate.getTime() - bDate.getTime();
}

function daysBetween(from, to) {
  const fromDate = toDateOnly(from);
  const toDate = toDateOnly(to);
  if (!fromDate || !toDate) return null;
  return Math.round((toDate.getTime() - fromDate.getTime()) / DAY_MS);
}

export function getContestStatus(contest, today = new Date()) {
  const start = toDateOnly(contest.registrationStart);
  const end = toDateOnly(contest.registrationEnd);
  const todayDate = toDateOnly(typeof today === 'string' ? today : today);

  if (contest.registrationConfidence !== 'exact' || !start || !end || !todayDate) {
    return {
      key: 'ambiguous',
      label: STATUS_META.ambiguous.label,
      rank: STATUS_META.ambiguous.rank,
      daysUntilEnd: null,
    };
  }

  if (todayDate < start) {
    return {
      key: 'upcoming',
      label: STATUS_META.upcoming.label,
      rank: STATUS_META.upcoming.rank,
      daysUntilStart: daysBetween(todayDate, start),
      daysUntilEnd: daysBetween(todayDate, end),
    };
  }

  if (todayDate > end) {
    return {
      key: 'closed',
      label: STATUS_META.closed.label,
      rank: STATUS_META.closed.rank,
      daysSinceEnd: Math.abs(daysBetween(todayDate, end)),
      daysUntilEnd: daysBetween(todayDate, end),
    };
  }

  const daysUntilEnd = daysBetween(todayDate, end);
  const key = daysUntilEnd <= 7 ? 'closing-soon' : 'open';

  return {
    key,
    label: STATUS_META[key].label,
    rank: STATUS_META[key].rank,
    daysUntilEnd,
  };
}

function priorityDate(contest, status) {
  if (status.key === 'closing-soon' || status.key === 'open') return contest.registrationEnd;
  if (status.key === 'upcoming') return contest.registrationStart;
  if (status.key === 'closed') return contest.registrationEnd;
  return contest.registrationStart || contest.registrationEnd || null;
}

export function sortContestsByPriority(contests, today = new Date()) {
  return [...contests].sort((a, b) => {
    const aStatus = getContestStatus(a, today);
    const bStatus = getContestStatus(b, today);

    if (aStatus.rank !== bStatus.rank) return aStatus.rank - bStatus.rank;

    if (aStatus.key === 'closed') {
      const recentFirst = compareDateValues(priorityDate(b, bStatus), priorityDate(a, aStatus));
      if (recentFirst !== 0) return recentFirst;
    } else {
      const soonestFirst = compareDateValues(priorityDate(a, aStatus), priorityDate(b, bStatus));
      if (soonestFirst !== 0) return soonestFirst;
    }

    return String(a.title || '').localeCompare(String(b.title || ''), 'ko');
  });
}

export function getTimelineStepState(step, today = new Date()) {
  const todayDate = toDateOnly(typeof today === 'string' ? today : today);
  const start = toDateOnly(step.start);
  const end = toDateOnly(step.end || step.start);

  if (!todayDate || !start || !end) return 'unknown';
  if (todayDate < start) return 'upcoming';
  if (todayDate > end) return 'past';
  return 'current';
}

export function formatRelativeStatus(status) {
  if (status.key === 'closing-soon') return `${status.label} · D-${status.daysUntilEnd}`;
  if (status.key === 'open') return `${status.label} · D-${status.daysUntilEnd}`;
  if (status.key === 'upcoming') return `${status.label} · ${status.daysUntilStart}일 후 시작`;
  return status.label;
}

export function getPrizeRangeSummary(contest) {
  const fallbackDisplay = contest.maxPrizeDisplay || contest.prizeDisplay || '확인 필요';
  const fallbackBasis = contest.maxPrizeBasis || '수상 팀 1팀 수령액 기준';
  const display = contest.prizeRangeDisplay || fallbackDisplay;
  const basis = contest.prizeRangeBasis || fallbackBasis;
  const items = Array.isArray(contest.prizeRangeItems) && contest.prizeRangeItems.length > 0
    ? contest.prizeRangeItems
    : [{
      label: '상금',
      display,
      minKrw: contest.prizeRangeMinKrw ?? contest.maxPrizeAmountKrw ?? null,
      maxKrw: contest.prizeRangeMaxKrw ?? contest.maxPrizeAmountKrw ?? null,
      basis,
    }];

  return { display, basis, items };
}

export function summarizeCounts(contests, today = new Date()) {
  const counts = {
    total: contests.length,
    'closing-soon': 0,
    open: 0,
    upcoming: 0,
    ambiguous: 0,
    closed: 0,
  };

  for (const contest of contests) {
    counts[getContestStatus(contest, today).key] += 1;
  }

  return counts;
}
