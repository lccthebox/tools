import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');

assert.match(
  source,
  /topic\.quality=\{status:"approved",score:100,issues:\[\]\};topic\.operatorStatus=\{\.\.\.topic\.operatorStatus,reviewStatus:"approved"\};saveTopics\("토픽을 이 컴퓨터에 승인 저장했습니다\. Gist는 변경하지 않았습니다\."\);await publishTopic\(topic\.date\);return;/,
  '승인한 v4.3 캘린더 토픽은 인쇄·멤버 화면이 읽는 공유 저장소로 바로 동기화되어야 합니다.'
);

assert.match(source, /async function publishTopic\(date,\{announce=true\}=\{\}\)/, '공유 토픽 동기화 함수가 있어야 합니다.');
assert.match(source, /\/api\/talkflow\/published-topics/, '공유 저장소는 Talkflow 공개 토픽 API여야 합니다.');
assert.match(source, /async function syncApprovedTopicsForCurrentMonth\(\)/, '기존에 캘린더에서 승인한 토픽도 자동 동기화되어야 합니다.');
assert.match(source, /topic\?\.topicVersion==="topic-v4\.3"&&topic\.quality\?\.status==="approved"&&topic\.date\?\.startsWith\(monthPrefix\(\)\)/, '현재 캘린더 월의 승인된 v4.3 토픽만 인쇄 데이터로 동기화해야 합니다.');
assert.match(source, /await resetPublishedTopicsOnce\(\);await syncApprovedTopicsForCurrentMonth\(\);(?:await loadManagerTopicViews\(\);)?renderServerControls\(\);render\(\)/, '관리자 로그인 뒤에는 캘린더 승인본을 먼저 공용 인쇄 데이터와 맞춰야 합니다.');
assert.match(source, /params\.get\("published"\)===\"1\"/, '관리자 반편성에서 여는 인쇄 링크는 발행된 토픽 원본을 명시해야 합니다.');
assert.match(source, /async function loadPublishedPrintTopic\(date\)/, '발행된 토픽을 Topic 화면에서 직접 불러오는 인쇄 로더가 있어야 합니다.');
assert.match(source, /\/api\/talkflow\/board-topic\?date=/, '원본 Topic 화면은 날짜별 발행 토픽 API를 사용해야 합니다.');
assert.match(source, /Array\.from\(\{length:copies\}/, '참여 인원 수만큼 같은 토픽을 반복 출력할 수 있어야 합니다.');
assert.match(source, /published\?"승인된 원본 토픽"/, '원격 인쇄 화면은 기존 관리자 재조립물이 아니라 승인된 원본임을 표시해야 합니다.');

console.log('topic print source synchronization regression: ok');
