const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sourcePath = path.join(__dirname, '..', 'manage', 'index.html');
const source = fs.readFileSync(sourcePath, 'utf8');

function functionBody(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `missing function ${name}`);
  const tail = source.slice(start + 10);
  const nextMatch = tail.match(/\n(?:async )?function /);
  const next = nextMatch ? start + 10 + nextMatch.index : -1;
  return source.slice(start, next === -1 ? source.length : next);
}

test('study mutations persist the study collection', () => {
  for (const name of [
    'delStudyMember',
    'delStudyWaiting',
    'delStudyReturn',
    'delStudyIndiv',
    'delStudyPayRecord',
    'delStudyLeader',
    'delStudyStaff',
    'delStudyHold',
  ]) {
    const body = functionBody(name);
    assert.match(body, /save\('study'\)/, `${name} must save the study collection`);
    assert.doesNotMatch(body, /save\('students'\)/, `${name} must not save only students`);
  }
});

test('study payment changes from global search persist study', () => {
  const body = functionBody('updPaySearch');
  assert.match(body, /save\(isStudy\s*\?\s*'study'\s*:\s*'students'\)/);
});

test('local snapshots have concrete storage and creation functions', () => {
  assert.match(source, /const SNAP_KEY\s*=\s*['"][^'"]+['"]/);
  assert.match(source, /const SNAP_MAX\s*=\s*\d+/);
  assert.match(source, /function takeSnapshot\(/);
  assert.match(functionBody('save'), /scheduleSnapshot\(/);
});

test('high-risk persisted content is escaped before HTML rendering', () => {
  assert.match(source, /function escapeHTML\(/);
  assert.match(source, /function safeExternalUrl\(/);

  const board = functionBody('renderBoard');
  assert.match(board, /escapeHTML\(p\.title/);
  assert.match(board, /escapeHTML\(p\.content/);
  assert.match(board, /safeExternalUrl\(p\.link/);

  const searchRow = functionBody('searchRowHTML');
  assert.match(searchRow, /escapeHTML\(s\.name/);
  assert.match(searchRow, /escapeHTML\(s\.phone/);

  const calendar = functionBody('evHtml');
  assert.match(calendar, /escapeHTML\(ev\.summary/);
  assert.match(calendar, /escapeHTML\(ev\.location/);
});

test('Firebase Auth email login is wired to an approved manager mapping', () => {
  assert.match(source, /firebase-auth-compat\.js/);
  assert.match(source, /signInWithEmailAndPassword\(userid, pw\)/);
  assert.match(functionBody('doLogin'), /m\.authUid===authUser\.uid/);
  assert.match(functionBody('doLogin'), /m\.email/);
  assert.match(functionBody('doLogin'), /await fbAuth\.signOut\(\)/);
});

test('public signup can no longer persist plaintext passwords', () => {
  const signup = functionBody('doSignup');
  assert.doesNotMatch(signup, /fbDb\.ref/);
  assert.doesNotMatch(signup, /pw\s*:/);
  assert.doesNotMatch(source, /id="su-pw"/);
});

test('Firebase sessions are validated before restoration', () => {
  const restore = functionBody('tryRestoreSession');
  assert.match(restore, /authMode==='firebase'/);
  assert.match(restore, /authUser\.uid!==authUid/);
  assert.match(restore, /Firebase user has no manager mapping/);
});
