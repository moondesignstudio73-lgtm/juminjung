import type { GameState } from './types.ts';
import { resourceChanges } from './action-feedback.ts';
import { getAffectedRoomNumbers } from './aura-effect-manager.ts';

export function createNightPresentation(
  before: GameState,
  eventAfter: GameState,
  after: GameState,
  title: string,
  choice: string,
) {
  const moments: string[] = [];
  const living = before.guests.filter((g) => g.status === 'STAYING' && g.alive);
  for (const helper of living.filter(
    (g) => g.aura?.metric === 'injuryRecovery',
  )) {
    const area = getAffectedRoomNumbers(before.rooms, helper);
    const target = living.find(
      (g) =>
        g.id !== helper.id &&
        g.currentRoomNumber !== null &&
        area.includes(g.currentRoomNumber) &&
        g.health < 100 &&
        Number(after.guests.find((a) => a.id === g.id)?.health) > g.health,
    );
    if (target) {
      moments.push(
        `${helper.name}의 돌봄이 ${target.currentRoomNumber}호까지 닿았습니다. 밤을 지나며 ${target.name}의 몸 상태가 나아졌습니다.`,
      );
      break;
    }
  }
  const injured = living.find(
    (g) => Number(after.guests.find((a) => a.id === g.id)?.health) < g.health,
  );
  const trustChanged = living.find(
    (g) => after.guests.find((next) => next.id === g.id)?.trust !== g.trust,
  );
  if (trustChanged) {
    const increased =
      Number(after.guests.find((next) => next.id === trustChanged.id)?.trust) >
      trustChanged.trust;
    moments.push(
      `${trustChanged.name}${increased ? '의 경계가 조금 누그러졌습니다.' : '이(가) 당신의 결정을 쉽게 받아들이지 못합니다.'}`,
    );
  }
  if (after.fatherStoryProgress > before.fatherStoryProgress)
    moments.push(
      '오늘의 선택으로 아버지의 행방을 좇을 단서가 조금 더 이어졌습니다.',
    );
  if (injured)
    moments.unshift(
      `${injured.currentRoomNumber}호 ${injured.name}의 상태가 밤사이 나빠졌습니다. 아침에 살펴봐야 합니다.`,
    );
  if (
    after.flags.generator_blackout === true &&
    before.flags.generator_blackout !== true
  )
    moments.unshift(
      '출력을 줄인 복도가 어둠에 잠겼습니다. 남은 조명 아래에서 아침을 기다립니다.',
    );
  if (after.lastDaySummary?.inactiveFacilities?.length)
    moments.push(
      '유지 물자가 닿지 않은 시설이 멈췄습니다. 프론트 장부에 점검할 곳을 남겼습니다.',
    );
  const departed =
    after.lastDaySummary?.checkedOutGuestIds
      .map((id) => after.guests.find((g) => g.id === id)?.name)
      .filter(Boolean) ?? [];
  if (departed.length)
    moments.push(
      `${departed.slice(0, 2).join(', ')}의 체류가 끝났습니다. 아침 프론트에 객실 열쇠가 돌아왔습니다.`,
    );
  if (!moments.length)
    moments.push(
      '복도에는 다시 빗소리만 남았습니다. 오늘의 선택을 안고 호텔은 아침을 맞습니다.',
    );
  return {
    day: before.day,
    title,
    choice,
    moments: moments.slice(0, 3),
    changes: resourceChanges(before, eventAfter),
  };
}
