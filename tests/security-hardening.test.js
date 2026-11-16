const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const security = require('../server/talkflow/security');
const status = require('../api/talkflow/status');

test('malformed session cookies return an unauthenticated status and protected 401', () => {
  const previous = process.env.TALKFLOW_SESSION_SECRET;
  process.env.TALKFLOW_SESSION_SECRET = 'local-security-regression-secret';
  try {
    for (const value of ['%ZZ', '%', '%E0%A4%A']) {
      const request = { method: 'GET', headers: { cookie: `__Host-talkflow_session=${value}` } };
      const response = { setHeader() {}, end(body) { this.body = JSON.parse(body); } };
      status(request, response);
      assert.equal(response.statusCode, 200);
      assert.equal(response.body.authenticated, false);
      assert.equal(security.requireSession(request, response), false);
      assert.equal(response.statusCode, 401);
    }
    const token = security.createSession();
    assert.equal(security.verifySession({ headers: { cookie: `other=%ZZ; ${security.sessionCookie(token).split(';')[0]}` } }), true);
    assert.equal(security.verifySession({ headers: { cookie: `__Host-talkflow_session=${token}tampered` } }), false);
  } finally {
    if (previous === undefined) delete process.env.TALKFLOW_SESSION_SECRET;
    else process.env.TALKFLOW_SESSION_SECRET = previous;
  }
});

test('TalkFlow HTML routes send enforced embedding protection and report-only resource policy', () => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../vercel.json'), 'utf8'));
  const rule = config.headers.find(entry => entry.source === '/talkflow/(.*)');
  const headers = Object.fromEntries(rule.headers.map(({ key, value }) => [key, value]));
  assert.equal(headers['Content-Security-Policy'], "object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  assert.match(headers['Content-Security-Policy-Report-Only'] || '', /default-src 'self'/);
  assert.match(headers['Content-Security-Policy-Report-Only'], /connect-src 'self' https: wss:/);
  assert.equal(headers['Content-Security-Policy-Report-Only'], "default-src 'self'; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' https: data: blob:; font-src 'self' https: data:; connect-src 'self' https: wss:; frame-src https:; media-src 'self' https: blob:; worker-src 'self' blob:");
  assert.equal(headers['X-Frame-Options'], 'DENY');
});
