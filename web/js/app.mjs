import {
  formatRelativeStatus,
  getContestStatus,
  getPrizeRangeSummary,
  getTimelineStepState,
  sortContestsByPriority,
  summarizeCounts,
} from './contestLogic.mjs';
import { renderGauge, nextGid } from './gauge.mjs';

const state = {
  contests: [],
  visible: [],
  selectedId: null,
  todayIso: toLocalIsoDate(new Date()),
};

const els = {
  todayLabel:        document.querySelector('#todayLabel'),
  refreshLabel:      document.querySelector('#refreshLabel'),
  closingSoonCount:  document.querySelector('#closingSoonCount'),
  openCount:         document.querySelector('#openCount'),
  upcomingCount:     document.querySelector('#upcomingCount'),
  ambiguousCount:    document.querySelector('#ambiguousCount'),
  closedCount:       document.querySelector('#closedCount'),
  closingSoonDial:   document.querySelector('#closingSoonDial'),
  openDial:          document.querySelector('#openDial'),
  upcomingDial:      document.querySelector('#upcomingDial'),
  ambiguousDial:     document.querySelector('#ambiguousDial'),
  closedDial:        document.querySelector('#closedDial'),
  resultCount:       document.querySelector('#resultCount'),
  searchInput:       document.querySelector('#searchInput'),
  statusFilter:      document.querySelector('#statusFilter'),
  audienceFilter:    document.querySelector('#audienceFilter'),
  contestRows:       document.querySelector('#contestRows'),
  detailEmpty:       document.querySelector('#detailEmpty'),
  detailContent:     document.querySelector('#detailContent'),
};

// Assign gauge ids so SVG defs are unique
[els.closingSoonDial, els.openDial, els.upcomingDial, els.ambiguousDial, els.closedDial].forEach((el) => {
  if (el) el.dataset.gid = String(nextGid());
});

function toLocalIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateTime(value) {
  if (!value) return '알 수 없음';
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function moneyLabel(amount) {
  if (!Number.isFinite(amount)) return '미확인';
  if (amount >= 100000000) return `${Math.round(amount / 100000000)}억 원`;
  if (amount >= 10000) return `${Math.round(amount / 10000).toLocaleString('ko-KR')}만 원`;
  return `${amount.toLocaleString('ko-KR')}원`;
}

async function loadContests() {
  els.todayLabel.textContent = `${state.todayIso} 기록`;
  try {
    const response = await fetch('data/contests.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.contests = await response.json();
    state.selectedId = state.contests[0]?.id ?? null;
    hydrateAudienceFilter();
    render();
  } catch (error) {
    els.contestRows.innerHTML = `
      <tr><td colspan="5" class="load-error">⚠ DATA TRANSMISSION FAILED — ${escapeHtml(error.message)}</td></tr>
    `;
  }
}

function hydrateAudienceFilter() {
  const audiences = [...new Set(state.contests.flatMap((c) =>
    c.audience.split(',').map((s) => s.trim()).filter(Boolean)
  ))].sort((a, b) => a.localeCompare(b, 'ko'));
  els.audienceFilter.innerHTML = '<option value="all">— 전체 대상 —</option>';
  for (const a of audiences) {
    const opt = document.createElement('option');
    opt.value = a; opt.textContent = a;
    els.audienceFilter.append(opt);
  }
}

function render() {
  const sorted = sortContestsByPriority(state.contests, state.todayIso);
  const search = els.searchInput.value.trim().toLowerCase();
  const statusFilter = els.statusFilter.value;
  const audienceFilter = els.audienceFilter.value;

  state.visible = sorted.filter((c) => {
    const status = getContestStatus(c, state.todayIso);
    const haystack = [
      c.title, c.audience, c.summary, c.contestContent,
      c.prizeDisplay, c.prizeRangeDisplay, c.prizeRangeBasis,
      ...(c.prizeRangeItems ?? []).flatMap((i) => [i.label, i.display, i.basis]),
    ].join(' ').toLowerCase();
    return (!search || haystack.includes(search))
        && (statusFilter === 'all' || status.key === statusFilter)
        && (audienceFilter === 'all' || c.audience.includes(audienceFilter));
  });

  if (!state.visible.some((c) => c.id === state.selectedId)) {
    state.selectedId = state.visible[0]?.id ?? null;
  }

  renderSummary();
  renderTable();
  renderDetail();
}

function renderSummary() {
  const counts = summarizeCounts(state.contests, state.todayIso);
  const total = Math.max(counts.total, 1);

  els.closingSoonCount.textContent = counts['closing-soon'];
  els.openCount.textContent = counts.open;
  els.upcomingCount.textContent = counts.upcoming;
  els.ambiguousCount.textContent = counts.ambiguous;
  els.closedCount.textContent = counts.closed;

  // Pressure-gauge needles. Closing-soon swings hard right (DANGER zone).
  renderGauge(els.closingSoonDial, { ratio: counts['closing-soon'] === 0 ? 0.05 : 0.55 + Math.min(counts['closing-soon'] / total, 1) * 0.45, color: '#a82618' });
  renderGauge(els.openDial,        { ratio: counts.open / total, color: '#2d6a3a' });
  renderGauge(els.upcomingDial,    { ratio: counts.upcoming / total, color: '#1f4f8c' });
  renderGauge(els.ambiguousDial,   { ratio: counts.ambiguous / total, color: '#5a3a6e' });
  renderGauge(els.closedDial,      { ratio: counts.closed / total, color: '#3d3328' });

  els.resultCount.textContent = `${state.visible.length.toLocaleString('ko-KR')} 항목 표시`;

  const latest = state.contests
    .map((c) => c.lastFetchedAt).filter(Boolean).sort().at(-1);
  els.refreshLabel.innerHTML = `<strong>Last Telegram</strong>${escapeHtml(formatDateTime(latest))}`;
}

function confidenceLabel(confidence) {
  return {
    exact: '일 단위 확정',
    month: '월 단위 공개',
    season: '시즌 단위 공개',
    unknown: '공식 확인 필요',
  }[confidence] ?? '공식 확인 필요';
}

function renderTable() {
  if (state.visible.length === 0) {
    els.contestRows.innerHTML = '<tr><td colspan="5" class="load-error">— NO ENTRIES MATCH THE CURRENT GAUGES —</td></tr>';
    return;
  }
  els.contestRows.innerHTML = state.visible.map((c) => {
    const status = getContestStatus(c, state.todayIso);
    const prize = getPrizeRangeSummary(c);
    const sel = c.id === state.selectedId ? ' selected' : '';
    return `
      <tr class="contest-row${sel}" data-id="${escapeHtml(c.id)}" tabindex="0">
        <td>
          <span class="status-pill ${escapeHtml(status.key)}">${escapeHtml(formatRelativeStatus(status))}</span>
          <span class="source-status">${escapeHtml(c.statusLabelFromSource)}</span>
        </td>
        <td>
          <span class="cell-title">${escapeHtml(c.title)}</span>
          <span class="cell-meta">${escapeHtml(c.audience)}</span>
        </td>
        <td>
          <span class="cell-title" style="font-size:.92rem">${escapeHtml(c.registrationDisplay)}</span>
          <span class="cell-meta">${confidenceLabel(c.registrationConfidence)}</span>
        </td>
        <td>
          <span class="cell-prize">${escapeHtml(prize.display)}</span>
          <span class="cell-meta">${escapeHtml(prize.basis)}</span>
        </td>
        <td><span class="cell-summary">${escapeHtml(c.summary)}</span></td>
      </tr>
    `;
  }).join('');
}

function renderDetail() {
  const c = state.contests.find((x) => x.id === state.selectedId);
  if (!c) {
    els.detailEmpty.hidden = false;
    els.detailContent.hidden = true;
    els.detailContent.innerHTML = '';
    return;
  }
  const status = getContestStatus(c, state.todayIso);
  const prize = getPrizeRangeSummary(c);

  els.detailEmpty.hidden = true;
  els.detailContent.hidden = false;
  els.detailContent.innerHTML = `
    <div class="detail-header">
      <span class="status-pill ${escapeHtml(status.key)}">${escapeHtml(formatRelativeStatus(status))}</span>
      <h2>${escapeHtml(c.title)}</h2>
      <p>${escapeHtml(c.contestContent)}</p>
      <hr class="detail-rule">
    </div>

    <dl class="detail-facts">
      <div><dt>대상</dt><dd>${escapeHtml(c.audience)}</dd></div>
      <div><dt>접수일정</dt><dd>${escapeHtml(c.registrationDisplay)}</dd></div>
      <div><dt>상금 범위</dt><dd>${escapeHtml(prize.display)}<span>${escapeHtml(prize.basis)}</span></dd></div>
      <div><dt>총 규모</dt><dd>${escapeHtml(c.prizeDisplay)}<span>${escapeHtml(moneyLabel(c.prizeAmountKrw))}</span></dd></div>
      <div><dt>일정 신뢰도</dt><dd>${confidenceLabel(c.registrationConfidence)}</dd></div>
    </dl>

    <section class="prize-section">
      <h3>수상금 명세</h3>
      <ul class="prize-breakdown">
        ${prize.items.map((it) => `
          <li>
            <strong>${escapeHtml(it.label)}</strong>
            <span class="prize-amount">${escapeHtml(it.display)}</span>
            ${it.basis ? `<p>${escapeHtml(it.basis)}</p>` : ''}
          </li>`).join('')}
      </ul>
    </section>

    <div class="detail-links">
      <a href="${escapeHtml(c.sourceUrl)}" target="_blank" rel="noreferrer">공식 상세</a>
      <a class="copper" href="${escapeHtml(c.applyUrl)}" target="_blank" rel="noreferrer">접수 · 참여</a>
    </div>

    <section class="timeline-section">
      <h3>진행 일정</h3>
      <ol class="timeline">
        ${c.timeline.map((step) => renderTimelineStep(step)).join('')}
      </ol>
    </section>

    ${c.notes ? `<p class="notes">${escapeHtml(c.notes)}</p>` : ''}
  `;
}

function cogSvg(state) {
  const fill = state === 'current' ? '#a82618'
             : state === 'past'    ? '#8a6a2a'
             : '#7a6a4a';
  return `
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g fill="${fill}" stroke="#3d2410" stroke-width="0.7">
        <path d="M 20 2
                 L 22.5 4 L 25.5 3.5
                 L 27 6 L 30 6.5
                 L 30.5 9.5 L 33 11
                 L 32.5 14 L 34.5 16.5
                 L 33 19.5 L 34 22.5
                 L 32 24.5 L 32 27.5
                 L 29.5 28.5 L 28.5 31
                 L 25.5 31 L 24 33.5
                 L 21 33 L 19 35
                 L 16.5 32.5 L 13.5 32.5
                 L 12 30 L 9 29.5
                 L 8.5 26.5 L 6 25
                 L 6.5 22 L 4.5 19.5
                 L 6 16.5 L 5 13.5
                 L 7 11.5 L 7 8.5
                 L 9.5 7.5 L 10.5 5
                 L 13.5 5 L 15 2.5
                 Z"/>
      </g>
      <circle cx="20" cy="20" r="6" fill="#f0e0b8" stroke="#3d2410" stroke-width="0.8"/>
      <circle cx="20" cy="20" r="2.4" fill="#3d2410"/>
    </svg>
  `;
}

function renderTimelineStep(step) {
  const stateKey = getTimelineStepState(step, state.todayIso);
  return `
    <li class="${escapeHtml(stateKey)}">
      <div class="cog ${escapeHtml(stateKey)}" aria-hidden="true">${cogSvg(stateKey)}</div>
      <div class="timeline-body">
        <span class="timeline-date">${escapeHtml(step.dateDisplay)}</span>
        <strong>${escapeHtml(step.label)}</strong>
        <p>${escapeHtml(step.description ?? '')}</p>
      </div>
    </li>
  `;
}

els.searchInput.addEventListener('input', render);
els.statusFilter.addEventListener('change', render);
els.audienceFilter.addEventListener('change', render);
els.contestRows.addEventListener('click', (e) => {
  const row = e.target.closest('.contest-row'); if (!row) return;
  state.selectedId = row.dataset.id; render();
});
els.contestRows.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const row = e.target.closest('.contest-row'); if (!row) return;
  e.preventDefault();
  state.selectedId = row.dataset.id; render();
});

loadContests();
