# AI Challenge Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a GitHub Pages-ready dashboard that shows AI competitions by live registration priority and refreshes contest data through GitHub Actions.

**Architecture:** Use a static vanilla HTML/CSS/JavaScript frontend backed by `data/contests.json`. Shared date/status logic lives in `web/js/contestLogic.mjs` so it can be tested with Node and reused by the browser. A Node refresh script fetches official pages, normalizes known contests, and preserves curated fallback data when details are unavailable.

**Tech Stack:** Node.js built-in test runner, vanilla ES modules, static HTML/CSS, GitHub Actions.

---

### File Structure

- Create `package.json`: project scripts for test and data update.
- Create `data/contests.seed.json`: curated official-source fallback data.
- Create `data/contests.json`: current published dataset.
- Create `web/js/contestLogic.mjs`: status, priority, date parsing, and timeline-state functions.
- Create `web/js/app.mjs`: browser rendering, filtering, row selection, detail panel.
- Create `web/styles.css`: responsive dashboard styling.
- Create `index.html`: GitHub Pages entrypoint.
- Create `scripts/update-data.mjs`: fetch and normalize contest data.
- Create `tests/contestLogic.test.mjs`: TDD tests for priority/status/timeline logic.
- Create `tests/dataSchema.test.mjs`: generated data shape tests.
- Create `.github/workflows/update-data.yml`: scheduled data refresh and Pages-friendly commit.
- Create `.gitignore`: ignore local preview and brainstorming artifacts.

### Task 1: Project Skeleton And Logic Tests

**Files:**
- Create: `package.json`
- Create: `web/js/contestLogic.mjs`
- Test: `tests/contestLogic.test.mjs`

- [ ] **Step 1: Write failing logic tests**

Add tests for open, closing-soon, upcoming, closed, ambiguous sorting, and timeline step state.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/contestLogic.test.mjs`
Expected: FAIL because `web/js/contestLogic.mjs` does not exist or exports are missing.

- [ ] **Step 3: Implement minimal contest logic**

Implement `getContestStatus`, `sortContestsByPriority`, `getTimelineStepState`, and supporting helpers.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/contestLogic.test.mjs`
Expected: PASS.

### Task 2: Seed Data And Schema Tests

**Files:**
- Create: `data/contests.seed.json`
- Create: `data/contests.json`
- Test: `tests/dataSchema.test.mjs`

- [ ] **Step 1: Write failing schema tests**

Validate that every contest has required IDs, source URLs, registration display text, prize display, summary, and timeline array.

- [ ] **Step 2: Run schema test to verify it fails**

Run: `node --test tests/dataSchema.test.mjs`
Expected: FAIL because data files do not exist.

- [ ] **Step 3: Add seed and published data**

Use official page and official announcement data gathered during discovery.

- [ ] **Step 4: Run tests**

Run: `node --test tests/*.test.mjs`
Expected: PASS.

### Task 3: Static Dashboard UI

**Files:**
- Create: `index.html`
- Create: `web/js/app.mjs`
- Create: `web/styles.css`

- [ ] **Step 1: Implement static shell**

Create a dashboard layout with summary metrics, filters, table/list, and detail panel.

- [ ] **Step 2: Render data with shared logic**

Fetch `data/contests.json`, compute runtime status, sort by priority, and render rows.

- [ ] **Step 3: Implement interactions**

Add keyword/status/audience filters and click-to-open timeline detail panel.

- [ ] **Step 4: Verify browser-loadable static files**

Run a local static server and inspect the page.

### Task 4: Data Refresh Script

**Files:**
- Create: `scripts/update-data.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write a script that starts from seed data**

Load `data/contests.seed.json`, fetch official pages where possible, update `lastFetchedAt`, and write `data/contests.json`.

- [ ] **Step 2: Add conservative extraction**

Extract source status labels and obvious registration text from official pages without deleting curated fields when extraction fails.

- [ ] **Step 3: Verify update script**

Run: `node scripts/update-data.mjs`
Expected: `data/contests.json` exists and schema tests pass.

### Task 5: GitHub Actions And Final Verification

**Files:**
- Create: `.github/workflows/update-data.yml`
- Create: `.gitignore`
- Modify: `package.json`

- [ ] **Step 1: Add scheduled workflow**

Schedule daily refresh, run tests, and commit changed `data/contests.json`.

- [ ] **Step 2: Run full verification**

Run: `node --test tests/*.test.mjs`
Run: `node scripts/update-data.mjs`
Run: `node --test tests/*.test.mjs`

- [ ] **Step 3: Preview the dashboard**

Start a local static server and provide the URL.
