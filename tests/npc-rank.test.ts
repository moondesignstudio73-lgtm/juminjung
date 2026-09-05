import test from 'node:test';
import assert from 'node:assert/strict';
import { createNormalVisitor } from '../game/normal-visitor-data.ts';
import {
  getNpcRank,
  getProfessionalStats,
  isNpcRank,
  NPC_RANKS,
  rollNpcRank,
} from '../game/npc-rank.ts';
import {
  createInitialGameState,
  restoreGameState,
  serializeGameState,
} from '../game/save-manager.ts';

test('F~SSS 문자 등급이 유효한 분포로 생성된다', () => {
  const counts = new Map(NPC_RANKS.map((rank) => [rank, 0]));
  for (let index = 0; index < 20000; index += 1) {
    const rank = rollNpcRank((index + 0.5) / 20000, 30);
    counts.set(rank, counts.get(rank)! + 1);
  }
  assert.ok(NPC_RANKS.every((rank) => counts.get(rank)! > 0));
  assert.ok(counts.get('SSS')! / 20000 <= 0.005);
});

test('초반에는 상위 등급을 억제하지만 낮은 등급은 후반에도 남는다', () => {
  const early = Array.from({ length: 2000 }, (_, index) =>
    rollNpcRank((index + 0.5) / 2000, 3),
  );
  const late = Array.from({ length: 2000 }, (_, index) =>
    rollNpcRank((index + 0.5) / 2000, 30),
  );
  assert.equal(early.includes('SS'), false);
  assert.equal(early.includes('SSS'), false);
  assert.ok(late.includes('F') && late.includes('C') && late.includes('SSS'));
});

test('동일 직업 일반 방문자도 등급과 전문 능력이 다르게 생성된다', () => {
  const visitors = Array.from({ length: 500 }, (_, slot) =>
    createNormalVisitor(91822, 20, slot),
  );
  const pair = visitors.flatMap((guest, index) =>
    visitors.slice(index + 1).map((other) => [guest, other] as const),
  ).find(([a, b]) => a.role === b.role && a.rank !== b.rank);
  assert.ok(pair);
  assert.notDeepEqual(pair![0].skills, pair![1].skills);
});

test('S 이상은 전문 특성이 가능하고 SSS도 모든 개인 수치가 100은 아니다', () => {
  const visitors = Array.from({ length: 4000 }, (_, slot) =>
    createNormalVisitor(71231, 30, slot),
  );
  const elite = visitors.find((guest) => ['S', 'SS', 'SSS'].includes(guest.rank!));
  const sss = visitors.find((guest) => guest.rank === 'SSS');
  assert.ok(elite?.professionalTraits?.length);
  assert.ok(sss);
  assert.ok(Object.values(sss!.skills).some((value) => value < 80));
  assert.ok(sss!.community!.consumption.food >= 2);
});

test('F등급도 실제 능력과 낮은 유지비라는 활용 가치를 가진다', () => {
  const visitor = Array.from({ length: 1000 }, (_, slot) =>
    createNormalVisitor(3321, 12, slot),
  ).find((guest) => guest.rank === 'F');
  assert.ok(visitor);
  assert.ok(getProfessionalStats(visitor!).every((stat) => stat.value.length > 0));
  assert.ok(visitor!.community!.consumption.food >= .3);
  assert.ok(visitor!.community!.consumption.food <= .6);
});

test('등급은 저장되며 기존 무등급 저장은 스킬에서 결정적으로 마이그레이션된다', () => {
  const state = createInitialGameState();
  const visitor = createNormalVisitor(4421, 12, 3);
  state.guests.push(visitor);
  const restored = restoreGameState(serializeGameState(state));
  assert.equal(restored.guests.find((guest) => guest.id === visitor.id)?.rank, visitor.rank);

  const legacy = JSON.parse(serializeGameState(state));
  delete legacy.guests.find((guest: { id: string }) => guest.id === visitor.id).rank;
  const migrated = restoreGameState(JSON.stringify(legacy));
  const rank = migrated.guests.find((guest) => guest.id === visitor.id)?.rank;
  assert.ok(isNpcRank(rank));
  assert.equal(rank, getNpcRank(visitor));
});
