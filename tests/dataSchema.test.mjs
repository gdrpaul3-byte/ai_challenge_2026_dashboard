import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const requiredStringFields = [
  'id',
  'title',
  'audience',
  'registrationDisplay',
  'summary',
  'contestContent',
  'prizeDisplay',
  'prizeRangeDisplay',
  'prizeRangeBasis',
  'sourceUrl',
  'lastFetchedAt',
];

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

for (const path of ['data/contests.seed.json', 'data/contests.json']) {
  test(`${path} contains valid contest records`, async () => {
    const contests = await readJson(path);
    assert.ok(Array.isArray(contests));
    assert.ok(contests.length >= 10);

    const ids = new Set();
    for (const contest of contests) {
      for (const field of requiredStringFields) {
        assert.equal(typeof contest[field], 'string', `${contest.id || 'unknown'} missing ${field}`);
        assert.notEqual(contest[field].trim(), '', `${contest.id} has empty ${field}`);
      }

      assert.match(contest.id, /^[a-z0-9-]+$/);
      assert.equal(ids.has(contest.id), false, `duplicate id ${contest.id}`);
      ids.add(contest.id);

      assert.ok(['exact', 'month', 'season', 'unknown'].includes(contest.registrationConfidence));
      assert.ok(Array.isArray(contest.timeline), `${contest.id} timeline must be array`);
      assert.ok(contest.timeline.length > 0, `${contest.id} timeline must not be empty`);
      assert.ok(Number.isFinite(contest.prizeAmountKrw) || contest.prizeAmountKrw === null);
      assert.ok(Number.isFinite(contest.prizeRangeMinKrw) || contest.prizeRangeMinKrw === null);
      assert.ok(Number.isFinite(contest.prizeRangeMaxKrw) || contest.prizeRangeMaxKrw === null);
      assert.ok(Array.isArray(contest.prizeRangeItems), `${contest.id} prizeRangeItems must be array`);
      assert.ok(contest.prizeRangeItems.length > 0, `${contest.id} prizeRangeItems must not be empty`);
      assert.doesNotMatch(contest.prizeRangeDisplay, /\?/u, `${contest.id} prizeRangeDisplay has placeholder text`);
      assert.doesNotMatch(contest.prizeRangeBasis, /\?/u, `${contest.id} prizeRangeBasis has placeholder text`);

      for (const item of contest.prizeRangeItems) {
        assert.equal(typeof item.label, 'string', `${contest.id} prize range item missing label`);
        assert.equal(typeof item.display, 'string', `${contest.id} prize range item missing display`);
        assert.ok(Number.isFinite(item.minKrw) || item.minKrw === null, `${contest.id} prize range item minKrw invalid`);
        assert.ok(Number.isFinite(item.maxKrw) || item.maxKrw === null, `${contest.id} prize range item maxKrw invalid`);
      }

      for (const step of contest.timeline) {
        assert.equal(typeof step.label, 'string', `${contest.id} timeline step missing label`);
        assert.equal(typeof step.dateDisplay, 'string', `${contest.id} timeline step missing dateDisplay`);
      }
    }
  });
}

test('known tiered prize ranges are represented per receiving team', async () => {
  const contests = await readJson('data/contests.seed.json');
  const rookie = contests.find((contest) => contest.id === 'ai-rookie');
  const aquaculture = contests.find((contest) => contest.id === 'smart-aquaculture');

  assert.equal(rookie.prizeRangeDisplay, '500만~5,000만 원');
  assert.equal(rookie.prizeRangeMinKrw, 5000000);
  assert.equal(rookie.prizeRangeMaxKrw, 50000000);

  assert.equal(aquaculture.prizeRangeDisplay, '100만~5,000만 원');
  assert.equal(aquaculture.prizeRangeMinKrw, 1000000);
  assert.equal(aquaculture.prizeRangeMaxKrw, 50000000);

  assert.deepEqual(
    aquaculture.prizeRangeItems.map((item) => [item.label, item.display, item.minKrw, item.maxKrw]),
    [
      ['실증 부문', '1,000만~5,000만 원', 10000000, 50000000],
      ['아이디어 부문', '100만~500만 원', 1000000, 5000000],
    ],
  );
});
