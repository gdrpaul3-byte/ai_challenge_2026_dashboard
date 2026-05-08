import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

test('entrypoint uses the steampunk console shell and gauge dials', async () => {
  const html = await readFile('index.html', 'utf8');

  assert.match(html, /web\/steampunk\.css/);
  assert.match(html, /web\/js\/app\.mjs/);
  assert.match(html, /id="closingSoonDial"/);
  assert.match(html, /id="openDial"/);
  assert.match(html, /id="upcomingDial"/);
  assert.match(html, /class="console-frame"/);
});

test('scheduled data refresh workflow is not part of the static deployment', async () => {
  await assert.rejects(
    access('.github/workflows/update-data.yml'),
    { code: 'ENOENT' },
  );
});

test('steampunk gauges use content-driven responsive columns', async () => {
  const css = await readFile('web/steampunk.css', 'utf8');

  assert.match(css, /repeat\(auto-fit,\s*minmax\(min\(100%,\s*260px\),\s*1fr\)\)/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /\.gauge\s*{\s*grid-template-columns: minmax\(0,\s*1fr\)/);
});
