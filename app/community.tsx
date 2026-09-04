'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { GameState, Guest } from '@/game/types';
import {
  communityProfile,
  JOB_NAMES,
  residenceLabel,
} from '@/game/community-data';
import {
  recoveryQuote,
  residentReplacementBlockReason,
} from '@/game/community-manager';

export function ResidentDetails({
  state,
  guest,
  onExpel,
}: {
  state: GameState;
  guest: Guest;
  onExpel?: (id: string) => void;
}) {
  const [confirm, setConfirm] = useState(false),
    profile = communityProfile(guest);
  const expelBlockReason = residentReplacementBlockReason(guest);
  const duties = Object.entries(state.staffAssignments)
    .filter(([, id]) => id === guest.id)
    .map(([duty]) =>
      duty === 'MAINTENANCE'
        ? '발전기·시설 담당'
        : duty === 'MEDICAL'
          ? '의료 담당'
          : duty === 'SECURITY'
            ? '경계 담당'
            : duty === 'KITCHEN'
              ? '배식 담당'
              : '외부 업무',
    );
  return (
    <section className="guest-inline-note community-detail">
      <p>
        {residenceLabel(guest)} · 거주{' '}
        {guest.checkedInDay === null ? 0 : state.day - guest.checkedInDay + 1}일
        · 객실 복구 {profile.repairsCompleted}회
      </p>
      <p>
        기본 일일 유지비: 식량 {profile.consumption.food} · 물{' '}
        {profile.consumption.water} · 객실 1개
      </p>
      <small>배급과 주변 능력에 따라 실제 소비는 달라집니다.</small>
      <p>
        {JOB_NAMES[profile.job] ?? guest.role} ·{' '}
        {profile.traits.includes('CAREFUL')
          ? '꼼꼼함: 객실 복구 부품 -1, 시간 +15분'
          : profile.traits.includes('FAST_WASTEFUL')
            ? '서두르는 손길: 객실 복구 시간 -30분, 부품 +1'
            : '차분함: 표준 복구 시간과 비용'}
      </p>
      {onExpel && expelBlockReason && (
        <p className="resident-expel-blocked">
          퇴실 불가 · {expelBlockReason}
        </p>
      )}
      {onExpel && !expelBlockReason &&
        (!confirm ? (
          <Button
            variant="outline"
            className="danger-action"
            onClick={() => setConfirm(true)}
          >
            퇴실 요청
          </Button>
        ) : (
          <div
            className="resident-expel-confirm"
            role="group"
            aria-label="퇴실 확인"
          >
            <p>{guest.name}을 호텔에서 내보내시겠습니까?</p>
            <p>
              {duties.length ? `${duties.join(', ')} 해제. ` : ''}이 주민의 자원
              소비가 중단되고 객실이 비워집니다. 다른 주민이 있다면 신뢰가 최대
              2 낮아집니다.
            </p>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              취소
            </Button>{' '}
            <Button
              variant="destructive"
              onClick={() => {
                onExpel(guest.id);
                setConfirm(false);
              }}
            >
              호텔에서 내보내기
            </Button>
          </div>
        ))}
    </section>
  );
}
export function RoomRecovery({
  state,
  roomNumber,
  onRestore,
  compact = false,
}: {
  state: GameState;
  roomNumber: number;
  onRestore?: (room: number, worker: string | null) => void;
  compact?: boolean;
}) {
  const [worker, setWorker] = useState<string | null>(null);
  const room = state.rooms.find((r) => r.roomNumber === roomNumber);
  if (!room?.recovery || room.occupied) return null;
  if (room.recovery.restored)
    return (
      <p role="status">
        {roomNumber}호 복구 완료. 불을 켜고 새 주민을 맞을 수 있습니다. 개방
        객실{' '}
        {
          state.rooms.filter(
            (r) => r.status === 'EMPTY' || r.status === 'OCCUPIED',
          ).length
        }{' '}
        / 30.
      </p>
    );
  const quote = recoveryQuote(state, roomNumber, worker),
    direct = recoveryQuote(state, roomNumber);
  if (compact)
    return (
      <section
        className="guest-inline-note community-detail room-recovery-compact"
        aria-label={`${roomNumber}호 복구 요약`}
      >
        <strong>
          {roomNumber}호 · {quote.definition.label}
        </strong>
        <p>
          필요: 부품 {direct.parts}
          {direct.medicine ? ` · 약품 ${direct.medicine}` : ''} ·{' '}
          {direct.minutes}분
        </p>
        <small>
          추천: {JOB_NAMES[quote.definition.job]} · 복구 작업은 야간 객실
          관리에서 진행합니다.
        </small>
      </section>
    );
  return (
    <section
      className="guest-inline-note community-detail"
      aria-label={`${roomNumber}호 복구`}
    >
      <strong>
        {roomNumber}호 · {quote.definition.label}
      </strong>
      <p>
        직접 복구: 부품 {direct.parts}
        {direct.medicine ? ` · 약품 ${direct.medicine}` : ''} · {direct.minutes}
        분
      </p>
      <p>
        추천 도움: {JOB_NAMES[quote.definition.job]} · 전문가는 기본 부품·시간
        절반. 개인 작업 특성도 적용됩니다.
      </p>
      {onRestore && (
        <label>
          도움 요청{' '}
          <select
            value={worker ?? ''}
            onChange={(e) => setWorker(e.target.value || null)}
          >
            <option value="">직접 복구</option>
            {state.guests
              .filter((g) => g.status === 'STAYING' && g.alive)
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} · {g.role}
                </option>
              ))}
          </select>
        </label>
      )}
      {worker && (
        <p>
          선택한 작업: 부품 {quote.parts} · 약품 {quote.medicine} ·{' '}
          {quote.minutes}분 · 주민 스트레스 +8
        </p>
      )}
      <p>{quote.blocked ?? '복구하면 한 명을 더 받아들일 수 있습니다.'}</p>
      {onRestore && (
        <Button
          disabled={!!quote.blocked}
          onClick={() => onRestore(roomNumber, worker)}
        >
          복구 시작
        </Button>
      )}
    </section>
  );
}
