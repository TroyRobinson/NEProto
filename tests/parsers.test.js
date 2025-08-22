const test = require('node:test');
const assert = require('node:assert/strict');
const { parseMetricIds, parseActionQuery, parseZipCodes } = require('../app/api/chat/route');

test('parseMetricIds handles comma list', () => {
  const ids = parseMetricIds('B01003_001E, B03001_009E');
  assert.deepEqual(ids, ['B01003_001E', 'B03001_009E']);
});

test('parseMetricIds rejects invalid input', () => {
  assert.deepEqual(parseMetricIds('abc'), []);
});

test('parseActionQuery extracts phrase', () => {
  assert.equal(parseActionQuery('add median age'), 'median age');
});

test('parseActionQuery rejects long phrase', () => {
  assert.equal(parseActionQuery('add this is a very long phrase exceeding limit of words here'), null);
});

test('parseZipCodes finds zips', () => {
  assert.deepEqual(parseZipCodes('compare 73013 and 73102'), ['73013', '73102']);
});
