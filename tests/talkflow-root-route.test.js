const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const configPath = path.join(__dirname, '..', 'vercel.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

test('the deployment root redirects to the TalkFlow app', () => {
  assert.ok(Array.isArray(config.redirects), 'vercel redirects must be configured');
  assert.deepEqual(
    config.redirects.find(route => route.source === '/'),
    { source: '/', destination: '/talkflow/', permanent: false },
  );
});
