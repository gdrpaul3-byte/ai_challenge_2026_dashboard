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

      if (contest.participation) {
        assert.equal(contest.participation.status, 'submitted', `${contest.id} participation status invalid`);
        assert.equal(typeof contest.participation.label, 'string', `${contest.id} participation label missing`);
        assert.ok(Array.isArray(contest.participation.members), `${contest.id} participation members must be array`);
        assert.ok(contest.participation.members.length > 0, `${contest.id} participation members must not be empty`);
        assert.equal(typeof contest.participation.videoUrl, 'string', `${contest.id} participation videoUrl missing`);
        assert.match(contest.participation.videoUrl, /^https:\/\/youtu\.be\//, `${contest.id} participation videoUrl must be a YouTube short link`);

        if (contest.participation.teamName) {
          assert.equal(typeof contest.participation.teamName, 'string', `${contest.id} participation teamName invalid`);
        }
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

test('submitted contests keep team, member, and video metadata', async () => {
  const contests = await readJson('data/contests.seed.json');
  const rookie = contests.find((contest) => contest.id === 'ai-rookie');
  const seocho = contests.find((contest) => contest.id === 'seocho-ai-design');

  assert.ok(seocho, 'seocho-ai-design contest should be present');
  assert.equal(seocho.participation.teamName, 'HSMU_Makers');
  assert.deepEqual(seocho.participation.members, ['김선휘', '신정안', '문서정']);
  assert.equal(seocho.participation.videoUrl, 'https://youtu.be/vKHGrVniwRo?si=GSaHumDoIibG-arx');

  assert.equal(rookie.participation.status, 'submitted');
  assert.equal(rookie.participation.teamName, 'HSMU_Makers');
  assert.deepEqual(rookie.participation.members, ['신정안', '강민수', '안명진', '이지환', '김규민', '김의준']);
  assert.equal(rookie.participation.videoUrl, 'https://youtu.be/stAhFcbGUu8?si=9oBpAZi37QmRSmdz');
});
