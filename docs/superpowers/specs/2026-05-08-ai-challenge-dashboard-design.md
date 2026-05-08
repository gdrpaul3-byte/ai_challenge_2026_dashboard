# AI Challenge Dashboard Design

## Goal

Build a public web dashboard for competitions listed from `https://aichallenge4all.or.kr/university`. The dashboard must make each competition's registration period, competition content, prize scale, and current urgency visible at a glance, sorted by registration schedule. Clicking a competition shows its broader event timeline.

## Deployment Model

Use a GitHub Pages-friendly static frontend with a scheduled GitHub Actions data refresh.

- The published dashboard is static HTML/CSS/JavaScript.
- A refresh script crawls official pages and known detail links, normalizes contest data, and writes `data/contests.json`.
- GitHub Actions runs the refresh daily and commits updated data when it changes.
- The frontend calculates status and priority at runtime based on the visitor's current date, so "upcoming", "open", "closing soon", and "closed" remain accurate between data refreshes.

## Data Sources

Primary source:

- `https://aichallenge4all.or.kr/university`

Detail sources include:

- Official competition detail pages under `aichallenge4all.or.kr/competitions/...`
- Linked official microsites such as `ai-rookie.or.kr`, `ai-checker.or.kr`, `fipa-ai.kr`, `culture.go.kr/digicon`, `mogefdatacontest.co.kr`, and `science.go.kr`
- The official 2026 integrated announcement PDF when page details are incomplete

The scraper should prefer official/detail-page data over third-party summaries. When exact registration dates are missing and only a month range is published, store an approximate range with a confidence flag.

## Data Model

Each contest record should include:

- `id`
- `title`
- `audience`
- `statusLabelFromSource`
- `registrationStart`
- `registrationEnd`
- `registrationDisplay`
- `registrationConfidence`: `exact`, `month`, `season`, or `unknown`
- `summary`
- `contestContent`
- `prizeDisplay`
- `prizeAmountKrw`
- `sourceUrl`
- `applyUrl`
- `timeline`: ordered steps with `label`, `dateDisplay`, optional `start`, optional `end`, and `description`
- `lastFetchedAt`
- `notes`

## Priority Rules

At display time, contests are grouped and sorted as follows:

1. Closing soon: registration is open and ends within 7 days.
2. Open: registration is open and not closing within 7 days.
3. Upcoming: registration starts in the future.
4. Date ambiguous: registration period cannot be converted into exact dates.
5. Closed: registration ended.

Within each group:

- Closing soon sorts by nearest registration end date.
- Open sorts by nearest registration end date.
- Upcoming sorts by nearest registration start date.
- Closed sorts by most recently ended first.
- Ambiguous sorts by the best available date, then title.

## Interface

Use a dense, work-focused dashboard layout rather than a marketing page.

Top summary:

- Count of open contests
- Count closing within 7 days
- Count upcoming
- Count closed
- Largest prize pool or total visible prize scale
- Last data refresh timestamp

Main table/list:

- Contest title
- Audience
- Registration period
- Computed status
- Prize scale
- Short competition content summary
- Source/apply link

Interactions:

- Clicking a row opens a detail panel.
- The detail panel shows official source links, a longer content summary, prize notes, registration confidence, and a step timeline.
- Timeline steps are visually marked as past, current, or upcoming based on today's date.
- Filters support status, audience, and keyword search.
- Default ordering follows the priority rules above.

## Error Handling

If scraping fails:

- Preserve the previous `data/contests.json` rather than publishing an empty dataset.
- Write a scraper report artifact in CI.
- Surface stale data in the UI with the last successful fetch timestamp.

If a contest has incomplete dates:

- Show the original display text.
- Place it in the date ambiguous group.
- Keep it searchable and clickable.

## Testing

Add tests for:

- Date/status calculation.
- Sorting priority.
- Timeline step state calculation.
- Scraper normalization from representative fixture HTML/PDF text snippets.
- The generated JSON schema shape.

## Implementation Scope

Initial version should be small and maintainable:

- Static app files at the repository root or `web/`.
- `scripts/update-data.mjs` for data refresh.
- `data/contests.json` checked into the repo.
- `tests/*.test.mjs` using Node's built-in test runner.
- `.github/workflows/update-data.yml` for scheduled refresh and GitHub Pages-compatible output.
