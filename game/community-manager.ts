import type { GameState } from './types.ts';
import { communityProfile, ROOM_DAMAGE } from './community-data.ts';
import { canSpendNightTime, getWorkerStatus } from './night-work-manager.ts';
import { checkoutGuest } from './room-manager.ts';
import { recalculateRoomEffects } from './aura-effect-manager.ts';
import { pruneStaffAssignments } from './staff-operation-manager.ts';
import { updateVisitorFinalState } from './visitor-queue-manager.ts';

export function residentReplacementBlockReason(guest: GameState['guests'][number]): string | null {
  if (
    guest.storyLockedResident ||
    guest.residency === 'STORY_LOCKED' ||
    (guest.npcType === 'MAIN' && guest.eventChain.some((event) => !event.completed))
  )
    return '현재 진행 중인 사건과 관련된 주민입니다.';
  return null;
}

export function expelResident(state: GameState, id: string): GameState {
  const departing = state.guests.find(
    (g) => g.id === id && g.status === 'STAYING',
  );
  if (
    !departing ||
    residentReplacementBlockReason(departing) ||
    !['desk', 'night_management'].includes(state.phase)
  )
    return state;
  const guests = state.guests.map((g) =>
    g.id === id
      ? {
          ...g,
          residency: 'EXPELLED' as const,
          status: 'CHECKED_OUT' as const,
          currentRoomNumber: null,
          remainingNights: 0,
          revisitPolicy: 'NEVER' as const,
          storyFlags: {
            ...g.storyFlags,
            player_expelled: true,
            forced_leave: true,
            last_checked_out_day: state.day,
          },
        }
      : g.status === 'STAYING'
        ? { ...g, trust: Math.max(0, g.trust - 2) }
        : g,
  );
  return {
    ...state,
    guests,
    rooms: recalculateRoomEffects(checkoutGuest(state.rooms, id), guests),
    staffAssignments: pruneStaffAssignments(state.staffAssignments, guests),
    flags: {
      ...state.flags,
      ...(id === 'eleanor'
        ? { eleanor_checked_in: false, eleanor_room: 0 }
        : {}),
    },
    visitorHistory: updateVisitorFinalState(
      state.visitorHistory,
      id,
      'PLAYER_EXPELLED',
      `DAY ${state.day} · 퇴실 요청`,
    ),
    eventHistory: [
      ...state.eventHistory,
      {
        day: state.day,
        type: 'CHECK_OUT',
        message: `${departing.name} · “내 몫의 자리는 여기까지군요.” 열쇠를 돌려주었습니다.${Object.values(state.staffAssignments).includes(id)?' 담당 업무가 공석이 됐습니다.':''}${state.guests.some(g=>g.id!==id&&g.status==='STAYING'&&g.trust>0)?' 남은 주민들이 당신을 경계합니다. 신뢰 최대 -2.':' 복도는 조용해졌습니다.'}`,
      },
    ],
  };
}

export function recoveryQuote(
  state: GameState,
  roomNumber: number,
  workerId: string | null = null,
) {
  const room = state.rooms.find((r) => r.roomNumber === roomNumber),
    recovery = room?.recovery;
  const definition = ROOM_DAMAGE[recovery?.damage ?? 'DOOR'];
  const worker = state.guests.find((g) => g.id === workerId),
    profile = worker ? communityProfile(worker) : null;
  const specialist = !!profile && profile.job === definition.job;
  let parts: number = definition.parts,
    medicine: number = definition.medicine,
    minutes: number = definition.minutes;
  if (specialist) {
    parts = Math.max(1, Math.ceil(parts * 0.5));
    minutes = Math.ceil(minutes * 0.5);
  }
  if (profile?.traits.includes('CAREFUL')) {
    parts = Math.max(1, parts - 1);
    minutes += 15;
  }
  if (profile?.traits.includes('FAST_WASTEFUL')) {
    parts += 1;
    minutes = Math.max(30, minutes - 30);
  }
  const blocked =
    !room ||
    room.occupied ||
    !recovery ||
    recovery.restored ||
    !['LOCKED', 'DAMAGED'].includes(room.status)
      ? '복구 대상 객실이 아닙니다.'
      : state.day < recovery.availableDay
        ? `DAY ${recovery.availableDay}부터 이 구역을 복구할 수 있습니다.`
        : workerId &&
            (!worker || getWorkerStatus(state, worker) !== 'AVAILABLE')
          ? '이 주민은 지금 작업할 수 없습니다.'
          : state.nightShift?.location !== 'rooms' ||
              !canSpendNightTime(state, minutes)
            ? '야간 운영의 객실 구역에서 남은 시간을 확인하세요.'
            : state.resources.parts < parts ||
                state.resources.medicine < medicine
              ? '복구 자원이 부족합니다.'
              : null;
  return { definition, parts, medicine, minutes, specialist, blocked };
}
export function restoreRoom(
  state: GameState,
  roomNumber: number,
  workerId: string | null = null,
): GameState {
  const quote = recoveryQuote(state, roomNumber, workerId);
  if (quote.blocked) return state;
  const worker = state.guests.find((g) => g.id === workerId);
  const guests = state.guests.map((g) =>
    g.id === workerId
      ? {
          ...g,
          stress: Math.min(100, g.stress + 8),
          community: {
            ...communityProfile(g),
            repairsCompleted: communityProfile(g).repairsCompleted + 1,
          },
        }
      : g,
  );
  return {
    ...state,
    guests,
    resources: {
      ...state.resources,
      parts: state.resources.parts - quote.parts,
      medicine: state.resources.medicine - quote.medicine,
    },
    rooms: recalculateRoomEffects(
      state.rooms.map((r) =>
        r.roomNumber === roomNumber
          ? {
              ...r,
              status: 'EMPTY',
              roomCondition: 100,
              recovery: { ...r.recovery!, restored: true },
            }
          : r,
      ),
      guests,
    ),
    nightShift: {
      ...state.nightShift!,
      elapsedMinutes: (state.nightShift!.elapsedMinutes ?? 0) + quote.minutes,
      tasks: [
        ...state.nightShift!.tasks,
        { workerId, location: 'rooms', actionId: `restore_room_${roomNumber}` },
      ],
    },
    eventHistory: [
      ...state.eventHistory,
      {
        day: state.day,
        type: 'EVENT',
        message: `${worker?.name ?? '당신'}이 ${roomNumber}호의 ${quote.definition.label}을 복구했습니다. 이제 한 명을 더 받아들일 수 있습니다.`,
      },
    ],
  };
}
export function normalizeCommunity(state: GameState): GameState {
  return {
    ...state,
    guests: state.guests.map((g) => ({
      ...g,
      ...(g.npcType === 'NORMAL' ? { community: communityProfile(g) } : {}),
      residency: !g.alive
        ? 'DEAD'
        : g.storyFlags.player_expelled
          ? 'EXPELLED'
          : g.npcType === 'NORMAL' && g.residency === 'TEMPORARY'
            ? 'RESIDENT'
            : g.residency,
    })),
  };
}
