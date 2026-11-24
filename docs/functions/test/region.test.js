const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const { FUNCTIONS_REGION } = require('../lib/config');
test('region frontend == backend, không hardcode ở nơi khác', () => {
  const fe = fs.readFileSync(path.join(__dirname, '../../src/config/functionsConfig.js'), 'utf8').match(/FUNCTIONS_REGION = '([^']+)'/)[1];
  assert.strictEqual(fe, FUNCTIONS_REGION);
  for (const f of ['../../src/components/ResearchDashboard.jsx', '../../src/lib/serverApi.js', '../index.js']) {
    const s = fs.readFileSync(path.join(__dirname, f), 'utf8');
    assert.ok(!/['"](us-central1|asia-southeast1)['"]/.test(s), f + ' còn hardcode region');
  }
});
