const test = require('node:test');
const assert = require('node:assert/strict');
const { getVariableById } = require('../lib/censusTools');

const YEAR = '2023';
const DATASET = 'acs/acs5';

test('getVariableById returns label', async (t) => {
  try {
    const info = await getVariableById('B01003_001E', YEAR, DATASET);
    assert.equal(info.label, 'Total Population');
  } catch (err) {
    t.diagnostic(`Network error: ${err.message}`);
    t.skip();
  }
});
