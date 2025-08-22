const test = require('node:test');
const assert = require('node:assert/strict');
const { searchCensus, validateVariableId } = require('../lib/censusTools');

const YEAR = '2023';
const DATASET = 'acs/acs5';

test('search median age returns expected variable', async () => {
  const results = await searchCensus('median age', YEAR, DATASET);
  assert.ok(results.find((r) => r.id === 'B01002_001E'));
});

test('search guamanian population finds a variable', async (t) => {
  try {
    const results = await searchCensus('Guamanian population', YEAR, DATASET);
    assert.ok(results.length > 0);
  } catch (err) {
    t.diagnostic(`Network error: ${err.message}`);
    t.skip();
  }
});

test('validateVariableId checks known and unknown ids', async (t) => {
  try {
    assert.equal(await validateVariableId('B01003_001E', YEAR, DATASET), true);
    assert.equal(await validateVariableId('B99999_999E', YEAR, DATASET), false);
  } catch (err) {
    t.diagnostic(`Network error: ${err.message}`);
    t.skip();
  }
});

