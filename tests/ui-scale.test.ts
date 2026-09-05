import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../app/ui-scale.css', import.meta.url), 'utf8');
const systemMenu = readFileSync(
  new URL('../app/system-menu.tsx', import.meta.url),
  'utf8',
);

test('기본 UI 스케일은 zoom 없이 읽기·조작 토큰으로 구성된다', () => {
  assert.match(css, /--font-xs:\s*0\.75rem/);
  assert.match(css, /--font-md:\s*0\.9375rem/);
  assert.match(css, /--control-sm:\s*2\.5rem/);
  assert.match(css, /--control-lg:\s*3rem/);
  assert.doesNotMatch(css, /\bzoom\s*:/);
  assert.doesNotMatch(css, /transform:\s*scale\s*\(/);
});

test('UI 크기는 작게·보통·크게 세 단계이며 보통이 기본값이다', () => {
  assert.match(systemMenu, /useState<'compact' \| 'normal' \| 'large'>\('normal'\)/);
  assert.match(systemMenu, /\['compact', '작게'\]/);
  assert.match(systemMenu, /\['normal', '보통'\]/);
  assert.match(systemMenu, /\['large', '크게'\]/);
  assert.match(systemMenu, /localStorage\.setItem\('juju-ui-scale', uiScale\)/);
  assert.match(systemMenu, /if \(!preferencesReady\) return/);
});

test('지원 해상도용 밀도 보정과 넓은 게임 프레임을 유지한다', () => {
  assert.match(css, /max-width:\s*min\(2304px, 92vw\)/);
  assert.match(css, /@media \(min-width: 801px\) and \(max-height: 850px\)/);
  assert.match(css, /@media \(min-width: 2400px\) and \(min-height: 1250px\)/);
  assert.match(css, /overflow:\s*hidden/);
});
