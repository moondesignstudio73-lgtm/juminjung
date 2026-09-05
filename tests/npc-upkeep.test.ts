import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialGameState, restoreGameState, serializeGameState } from '../game/save-manager.ts';
import { getNpcUpkeep, getWorkWaterSurcharge, RANK_UPKEEP_RANGES } from '../game/npc-upkeep.ts';
import { communityProfile } from '../game/community-data.ts';
import { createNormalVisitor } from '../game/normal-visitor-data.ts';
import type { Guest, NpcRank } from '../game/types.ts';

function rankedGuest(rank: NpcRank, id = `balance-${rank}`): Guest {
  const source = createInitialGameState().guests.find((guest) => guest.id === 'walter')!;
  return {
    ...source,
    id,
    npcType: 'NORMAL',
    generated: true,
    rank,
    role: '상담사',
    age: 40,
    baseTraits: [],
    hiddenTraits: [],
    discoveredTraits: [],
    community: undefined,
    skills: Object.fromEntries(
      Object.keys(source.skills).map((skill) => [skill, rank === 'SSS' ? 95 : rank === 'F' ? 30 : 60]),
    ) as Guest['skills'],
  };
}

void test('F~SSS 기본 유지비가 등급별 범위 안에서 단계적으로 증가한다', () => {
  const ranks: NpcRank[] = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
  const costs = ranks.map((rank) => {
    let guest = rankedGuest(rank);
    let suffix = 0;
    while (communityProfile(guest).traits[0] !== 'STEADY') {
      guest = { ...guest, id: `balance-${rank}-${suffix++}` };
    }
    return getNpcUpkeep(guest);
  });
  costs.forEach((cost, index) => {
    const range = RANK_UPKEEP_RANGES[ranks[index]];
    assert.ok(cost.food >= range.food[0] && cost.food <= range.food[1]);
    assert.ok(cost.water >= range.water[0] && cost.water <= range.water[1]);
    assert.equal(cost.food * 10, Math.round(cost.food * 10));
    assert.equal(cost.water * 10, Math.round(cost.water * 10));
  });
  for (let index = 1; index < costs.length; index += 1) {
    assert.ok(costs[index].food >= costs[index - 1].food);
    assert.ok(costs[index].water >= costs[index - 1].water);
  }
});

void test('같은 A등급도 소식가·대식가·갈증·절약 특성에 따라 유지비가 달라진다', () => {
  const base = rankedGuest('A', 'same-a-rank');
  const normal = getNpcUpkeep(base);
  const small = getNpcUpkeep({ ...base, baseTraits: ['SmallEater'] });
  const big = getNpcUpkeep({ ...base, baseTraits: ['BigEater'] });
  const thirsty = getNpcUpkeep({ ...base, baseTraits: ['Thirsty'] });
  const frugal = getNpcUpkeep({ ...base, baseTraits: ['Frugal'] });
  assert.ok(small.food < normal.food);
  assert.ok(big.food > normal.food);
  assert.ok(thirsty.water > normal.water);
  assert.ok(frugal.food < normal.food && frugal.water < normal.water);
});

void test('F 네 명과 SSS 한 명은 저비용·병렬 인력 대 고효율·고비용의 다른 선택을 만든다', () => {
  const fGuests = Array.from({ length: 4 }, (_, index) => rankedGuest('F', `f-worker-${index}`));
  const sss = rankedGuest('SSS', 'sss-specialist');
  const fFood = fGuests.reduce((sum, guest) => sum + getNpcUpkeep(guest).food, 0);
  const fWater = fGuests.reduce((sum, guest) => sum + getNpcUpkeep(guest).water, 0);
  const sssCost = getNpcUpkeep(sss);
  assert.ok(fFood < sssCost.food);
  assert.ok(fWater < sssCost.water);
  assert.equal(fGuests.length, 4);
  assert.ok(sss.skills.work > Math.max(...fGuests.map((guest) => guest.skills.work)));
});

void test('상위 등급 체크인은 같은 비축량에서 식량·물 유지 가능 일수를 더 크게 줄인다', () => {
  const resources = { food: 24, water: 18 };
  const low = getNpcUpkeep(rankedGuest('F', 'days-low'));
  const high = getNpcUpkeep(rankedGuest('SSS', 'days-high'));
  assert.ok(resources.food / high.food < resources.food / low.food);
  assert.ok(resources.water / high.water < resources.water / low.water);
});

void test('경비·정비 같은 고강도 업무는 실제 물 유지비를 추가한다', () => {
  const guest = rankedGuest('A', 'hard-work-water');
  assert.ok(getWorkWaterSurcharge(guest, 'MAINTENANCE') >= .1);
  assert.ok(getWorkWaterSurcharge(guest, 'SECURITY') >= .1);
  assert.equal(getWorkWaterSurcharge(guest, 'MEDICAL'), 0);
});

void test('소수점 유지비는 저장 후에도 보존되고 구버전 주민은 새 규칙으로 마이그레이션된다', () => {
  const state = createInitialGameState();
  const ranked = createNormalVisitor(84321, 20, 4);
  state.guests.push(ranked);
  const restored = restoreGameState(serializeGameState(state));
  const saved = restored.guests.find((guest) => guest.id === ranked.id)!;
  assert.deepEqual(getNpcUpkeep(saved), getNpcUpkeep(ranked));
  assert.equal(saved.community?.upkeepVersion, 2);

  const legacy = JSON.parse(serializeGameState(state));
  const legacyGuest = legacy.guests.find((guest: { id: string }) => guest.id === ranked.id);
  legacyGuest.community = { ...legacyGuest.community, upkeepVersion: undefined, consumption: { food: 1, water: 1 } };
  const migrated = restoreGameState(JSON.stringify(legacy)).guests.find((guest) => guest.id === ranked.id)!;
  assert.equal(migrated.community?.upkeepVersion, 2);
  assert.notDeepEqual(getNpcUpkeep(migrated), { food: 1, water: 1 });
});
