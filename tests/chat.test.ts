const test = require('node:test');
const assert = require('node:assert');
const { runModel } = require('../app/api/chat/route');

const year = '2023';
const dataset = 'acs/acs5';

function createMock(responses) {
  let i = 0;
  return async () => responses[i++];
}

test('existing stat answer', async () => {
  const stats = [{ code: 'B01003_001E', description: 'Total Population', data: { '73135': 500 } }];
  const messages = [
    { role: 'system', content: 'system' },
    { role: 'user', content: 'What is the total population in 73135?' }
  ];
  const mock = createMock([
    { choices: [{ message: { role: 'assistant', content: '', tool_calls: [{ id: '1', function: { name: 'load_stat', arguments: JSON.stringify({ code: 'B01003_001E' }) } }] } }] },
    { choices: [{ message: { role: 'assistant', content: 'Population in 73135 is 500' } }] }
  ]);
  const result = await runModel('model', messages, stats, year, dataset, mock);
  assert.strictEqual(result.message.content, 'Population in 73135 is 500');
});

test('adds new stat when missing', async () => {
  const stats = [];
  const messages = [
    { role: 'system', content: 'system' },
    { role: 'user', content: 'Hispanic population' }
  ];
  const mock = createMock([
    { choices: [{ message: { role: 'assistant', content: '', tool_calls: [{ id: '1', function: { name: 'search_census', arguments: JSON.stringify({ query: 'Hispanic population' }) } }] } }] },
    { choices: [{ message: { role: 'assistant', content: '', tool_calls: [{ id: '2', function: { name: 'add_metric', arguments: JSON.stringify({ id: 'B03003_003E', label: 'Hispanic or Latino population' }) } }] } }] },
    { choices: [{ message: { role: 'assistant', content: '' } }] }
  ]);
  const result = await runModel('model', messages, stats, year, dataset, mock);
  const added = result.toolInvocations.find((t) => t.name === 'add_metric');
  assert.ok(added && added.args.id === 'B03003_003E');
});

test('simple comparison question', async () => {
  const stats = [
    { code: 'B03001_004E', description: 'Mexican', data: { '73135': 100 } },
    { code: 'B02015_004E', description: 'Japanese', data: { '73135': 5 } }
  ];
  const messages = [
    { role: 'system', content: 'system' },
    { role: 'user', content: 'Which ethnicity has the greatest value in 73135?' }
  ];
  const mock = createMock([
    { choices: [{ message: { role: 'assistant', content: '', tool_calls: [{ id: '1', function: { name: 'load_stat', arguments: JSON.stringify({ code: 'B03001_004E' }) } }] } }] },
    { choices: [{ message: { role: 'assistant', content: '', tool_calls: [{ id: '2', function: { name: 'load_stat', arguments: JSON.stringify({ code: 'B02015_004E' }) } }] } }] },
    { choices: [{ message: { role: 'assistant', content: 'Mexican' } }] }
  ]);
  const result = await runModel('model', messages, stats, year, dataset, mock);
  assert.strictEqual(result.message.content, 'Mexican');
});

test('missing data triggers deeper search', async () => {
  const stats = [];
  const messages = [
    { role: 'system', content: 'system' },
    { role: 'user', content: 'Atlantis population' }
  ];
  const mock = createMock([
    { choices: [{ message: { role: 'assistant', content: '', tool_calls: [{ id: '1', function: { name: 'search_census', arguments: JSON.stringify({ query: 'Atlantis population' }) } }] } }] },
    { choices: [{ message: { role: 'assistant', content: '' } }] }
  ]);
  const result = await runModel('model', messages, stats, year, dataset, mock);
  assert.ok(result.lastSearchEmpty);
});
