const test = require('node:test');
const assert = require('node:assert/strict');
const { parseMetricIds, parseActionQuery } = require('../lib/chatUtils');

test('parseMetricIds extracts ids', () => {
  const ids = parseMetricIds('B01003_001E, B19301_001E');
  assert.deepEqual(ids, ['B01003_001E', 'B19301_001E']);
});

test('parseMetricIds rejects invalid', () => {
  const ids = parseMetricIds('median age');
  assert.deepEqual(ids, []);
});

test('parseActionQuery trims command', () => {
  assert.equal(parseActionQuery('add median age'), 'median age');
});

test('parseActionQuery rejects long queries', () => {
  assert.equal(parseActionQuery('add this is a very long query with many words indeed'), null);
});
