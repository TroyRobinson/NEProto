const test = require('node:test');
const assert = require('node:assert/strict');
const { isConceptualQuestion } = require('../app/api/chat/route.ts');

test('detects conceptual questions', () => {
  assert.ok(isConceptualQuestion('Why is this so?'));
  assert.ok(isConceptualQuestion('Compare A and B'));
  assert.ok(!isConceptualQuestion('add population'));
});
