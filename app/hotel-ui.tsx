'use client';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  BedDouble,
  DoorOpen,
  HeartPulse,
  Package,
  Utensils,
  Wrench,
  Zap,
  LockKeyhole,
  TriangleAlert,
  Droplets,
  Check,
} from 'lucide-react';
import type { GameState, Guest, Room } from '@/game/types';
import { hotelCapacity, roomCaption } from '@/game/ui-guidance';
import { getOperationTasks, getLivingForecast } from '@/game/day-flow-manager';
import {
  NIGHT_LOCATIONS,
  canSpendNightTime,
  getGeneratorFacilityView,
  movementMinutes,
  type NightLocation,
} from '@/game/night-work-manager';
const icons = {
  rooms: BedDouble,
  front: DoorOpen,
  kitchen: Utensils,
  storage: Package,
  generator: Zap,
  clinic: HeartPulse,
  entrance: DoorOpen,
};
export function Hint({ label, text }: { label: string; text: string }) {
  return (
    <TooltipProvider delay={250}>
      <Tooltip>
        <TooltipTrigger className="game-hint" aria-label={text}>
          {label}
        </TooltipTrigger>
        <TooltipContent>{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
export function RoomContents({
  room,
  guests = [],
}: {
  room: Room;
  guests?: Guest[];
}) {
  const guest = guests.find((g) => g.id === room.guestId);
  return (
    <>
      <b>{room.roomNumber}</b>
      {guest?.portrait && (
        <img
          className="room-resident-face"
          src={guest.portrait}
          alt=""
          loading="lazy"
        />
      )}
      <span>{roomCaption(room, guests)}</span>
      {!room.occupied && room.status !== 'EMPTY' && (
        <LockKeyhole className="room-state-icon" aria-hidden />
      )}
      {room.recovery?.restored && !room.occupied && (
        <Check className="room-state-icon" aria-hidden />
      )}
    </>
  );
}
export function HotelStatus({ state }: { state: GameState }) {
  const capacity = hotelCapacity(state.rooms),
    forecast = getLivingForecast(state);
  return (
    <div className="hotel-status-strip" aria-label="호텔 핵심 상태">
      <span>
        <BedDouble />
        주민{' '}
        <b>
          {capacity.occupied} / {capacity.open}
        </b>
        <small>개방 객실</small>
      </span>
      {state.day >= 2 && (
        <>
          <span>
            <Utensils />
            식량 <b>{state.resources.food}</b>
            <small>
              {forecast.foodDays === null
                ? '소비 없음'
                : `${forecast.foodDays.toFixed(1)}일분`}
            </small>
          </span>
          <span>
            <Droplets />물 <b>{state.resources.water}</b>
            <small>
              {forecast.waterDays === null
                ? '소비 없음'
                : `${forecast.waterDays.toFixed(1)}일분`}
            </small>
          </span>
        </>
      )}
      {state.day >= 4 && (
        <Hint
          label={`발전기 ${Math.round(getGeneratorFacilityView(state).condition)}%`}
          text="발전기 내구도입니다. 전력 공급량이나 남은 연료 비율이 아닙니다."
        />
      )}
    </div>
  );
}
export function HotelMap({
  state,
  onOpen,
  readOnly = false,
}: {
  state: GameState;
  onOpen: (location: NightLocation | 'staff') => void;
  readOnly?: boolean;
}) {
  const tasks = getOperationTasks(state),
    gen = getGeneratorFacilityView(state);
  const roomsBlocked = !canSpendNightTime(
    state,
    movementMinutes(state, 'rooms'),
  );
  return (
    <section className="hotel-map" aria-label="호텔 내부 지도">
      <header>
        <h2>오늘 밤의 호텔</h2>
        <span>방과 시설을 선택해 살펴보세요.</span>
      </header>
      <div className="hotel-map-floors">
        {[3, 2, 1].map((floor) => (
          <Button
            key={floor}
            variant="outline"
            className="map-floor"
            disabled={readOnly || roomsBlocked}
            title={
              roomsBlocked
                ? '이동할 야간 시간이 부족합니다'
                : '객실 구역으로 이동'
            }
            onClick={() => onOpen('rooms')}
          >
            <strong>{floor}층 객실</strong>
            <span className="map-room-lights">
              {state.rooms
                .filter((r) => r.floor === floor)
                .map((r) => (
                  <span
                    key={r.roomNumber}
                    className={`map-room ${r.status.toLowerCase()}`}
                    title={`${r.roomNumber}호 · ${roomCaption(r, state.guests)}`}
                  >
                    {r.roomNumber}
                    {r.occupied ? (
                      <BedDouble />
                    ) : r.status === 'EMPTY' ? (
                      <Check />
                    ) : (
                      <LockKeyhole />
                    )}
                  </span>
                ))}
            </span>
          </Button>
        ))}
      </div>
      <div className="map-service-floor">
        {NIGHT_LOCATIONS.filter((l) => !['rooms', 'front'].includes(l.id)).map(
          (l) => {
            const Icon = icons[l.id],
              locked = state.day < l.day,
              issue = tasks.find((t) => t.location === l.id),
              timeBlocked = !canSpendNightTime(
                state,
                movementMinutes(state, l.id),
              );
            return (
              <Button
                key={l.id}
                variant="outline"
                className={`map-place ${issue ? 'has-issue' : ''}`}
                disabled={readOnly || locked || timeBlocked}
                onClick={() => onOpen(l.id)}
                aria-label={`${l.name}${locked ? ` DAY ${l.day} 해금` : ''}`}
              >
                <Icon />
                <strong>{l.name}</strong>
                <span>
                  {locked ? (
                    `DAY ${l.day} 해금`
                  ) : issue ? (
                    <>
                      <TriangleAlert />
                      {issue.title}
                    </>
                  ) : l.id === 'generator' ? (
                    `${gen.mode} · ${gen.workerName}`
                  ) : l.id === 'kitchen' ? (
                    '배급 확인'
                  ) : l.id === 'storage' ? (
                    '보관 물자 확인'
                  ) : (
                    '현재 긴급 요청 없음'
                  )}
                </span>
                <small>
                  {locked
                    ? '날짜가 지나면 열립니다'
                    : timeBlocked
                      ? '이동할 야간 시간 부족'
                      : `이동 ${movementMinutes(state, l.id)}분`}
                </small>
              </Button>
            );
          },
        )}
      </div>
      <footer>
        <span>불이 켜진 방은 머물 수 있는 공간입니다.</span>
        <Button
          variant="outline"
          disabled={readOnly || state.day < 5}
          onClick={() => onOpen('staff')}
        >
          <Wrench />
          주민 업무 {state.day < 5 ? '· DAY 5' : ''}
        </Button>
      </footer>
    </section>
  );
}
