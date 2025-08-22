const test = require('node:test');
const assert = require('node:assert/strict');
const { searchCensus } = require('../lib/censusTools');

const YEAR = '2023';
const DATASET = 'acs/acs5';

test('search median age returns expected variable', async () => {
  const results = await searchCensus('median age', YEAR, DATASET);
  assert.ok(results.find(r => r.id === 'B01002_001E'));
});

test('search guamanian population finds a variable', async () => {
  const results = await searchCensus('Guamanian population', YEAR, DATASET);
  assert.ok(results.length > 0);
});
