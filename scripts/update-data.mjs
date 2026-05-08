import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const SEED_PATH = 'data/contests.seed.json';
const OUTPUT_PATH = 'data/contests.json';
const REPORT_PATH = 'data/update-report.json';
const LISTING_URL = 'https://aichallenge4all.or.kr/university';
const FETCH_TIMEOUT_MS = 10000;

const titleAliases = new Map([
  ['ai-rookie', ['대학생 AI ROOKIE 대회', 'AI ROOKIE']],
  ['ai-error-checker', ['전국민 AI 오류 찾기 챌린지', 'AI 오류']],
  ['ai-case-contest', ['전국민 AI 활용 사례 공모전', 'AI 활용 사례 공모전']],
  ['ai-quiz', ['전국민 AI 퀴즈대회', 'AI 퀴즈대회']],
  ['ai-sciencecenter-creative', ['전국민 인공지능(AI) 창작 경진대회']],
  ['law-data-idea', ['제2회 법령데이터 활용 아이디어 공모전']],
  ['culture-ai-data', ['문화체육관광 인공지능·데이터 활용 공모전']],
  ['smart-aquaculture', ['스마트양식 도전해']],
  ['ai-robotics', ['로보틱스 챌린지']],
  ['ai-creative', ['AI 창작대회']],
  ['national-happiness-it', ['국민 행복 IT 경진대회']],
  ['reboot-ai', ['리부트 AI 활용대회']],
  ['click-on-ai', ['클릭온 AI']],
  ['mogef-ai-data', ['성평등가족부 AI·공공데이터']],
  ['ai-hack-camp', ['AI Hack Camp 2026']],
]);

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'ai-challenge-dashboard/0.1 (+https://github.com/)',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '\n')
    .replace(/<style[\s\S]*?<\/style>/gi, '\n')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

function extractListingStatus(listingText, contest) {
  const aliases = titleAliases.get(contest.id) ?? [contest.title];
  for (const alias of aliases) {
    const index = listingText.indexOf(alias);
    if (index === -1) continue;
    const window = listingText.slice(index, index + 350);
    const status = window.match(/참가 접수중|참가 마감|준비중/)?.[0];
    if (status) return status;
  }
  return contest.statusLabelFromSource;
}

function extractDetailSignals(text) {
  const lines = text.split('\n');
  const registrationLineIndex = lines.findIndex((line) => /^접수기간\b|접수기간\s*:/.test(line));
  const registrationDisplay = registrationLineIndex !== -1
    ? lines.slice(registrationLineIndex, registrationLineIndex + 3).join(' ').replace(/^접수기간\s*:?\s*/, '').trim()
    : null;

  return {
    registrationDisplay: registrationDisplay || null,
    hasScheduleSection: text.includes('대회일정') || text.includes('추진 일정') || text.includes('대회 일정'),
  };
}

async function main() {
  const fetchedAt = new Date().toISOString();
  const seed = await readJson(SEED_PATH);
  const report = {
    fetchedAt,
    listingUrl: LISTING_URL,
    listingReachable: false,
    pages: [],
    warnings: [],
  };

  let listingText = '';
  try {
    listingText = htmlToText(await fetchText(LISTING_URL));
    report.listingReachable = true;
  } catch (error) {
    report.warnings.push(`Listing fetch failed: ${error.message}`);
  }

  const updated = [];
  for (const contest of seed) {
    const next = {
      ...contest,
      statusLabelFromSource: listingText ? extractListingStatus(listingText, contest) : contest.statusLabelFromSource,
      lastFetchedAt: fetchedAt,
    };

    try {
      const detailText = htmlToText(await fetchText(contest.sourceUrl));
      const signals = extractDetailSignals(detailText);
      next.scrape = {
        sourceReachable: true,
        hasScheduleSection: signals.hasScheduleSection,
      };

      if (contest.registrationConfidence === 'unknown' && signals.registrationDisplay) {
        next.registrationDisplay = signals.registrationDisplay;
      }

      report.pages.push({
        id: contest.id,
        sourceUrl: contest.sourceUrl,
        ok: true,
        hasScheduleSection: signals.hasScheduleSection,
      });
    } catch (error) {
      next.scrape = {
        sourceReachable: false,
        error: error.message,
      };
      report.pages.push({
        id: contest.id,
        sourceUrl: contest.sourceUrl,
        ok: false,
        error: error.message,
      });
    }

    updated.push(next);
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const failedPages = report.pages.filter((page) => !page.ok).length;
  console.log(`Updated ${OUTPUT_PATH} with ${updated.length} contests at ${fetchedAt}`);
  console.log(`Listing reachable: ${report.listingReachable}; failed detail pages: ${failedPages}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
