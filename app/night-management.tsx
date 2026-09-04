'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RoomContents } from './hotel-ui';
import {
  BedDouble,
  DoorOpen,
  HeartPulse,
  Package,
  Soup,
  Wrench,
  Bell,
} from 'lucide-react';
import type { GameState, HotelActionId } from '@/game/types';
import {
  NIGHT_LOCATIONS,
  generatorState,
  getGeneratorFacilityView,
  generatorAtRisk,
  getWorkerStatus,
  isGeneratorSpecialist,
  repairBlockReason,
  NIGHT_MINUTES,
  NIGHT_JOB_MINUTES,
  GENERATOR_UPGRADES,
  nightClock,
  canSpendNightTime,
  movementMinutes,
  type NightLocation,
} from '@/game/night-work-manager';
import { RATION_POLICIES, getRationPlan } from '@/game/daily-survival-manager';
import { getNightFoodDemand } from '@/game/aura-night-manager';
import { getHotelActionDefinition } from '@/game/hotel-action-manager';
import './night-management.css';
import { RoomRecovery } from './community';

const icons = {
  front: Bell,
  rooms: BedDouble,
  kitchen: Soup,
  storage: Package,
  generator: Wrench,
  clinic: HeartPulse,
  entrance: DoorOpen,
};
const statusLabels = {
  AVAILABLE: '작업 가능',
  WORKING: '오늘 점검 완료 · 담당 유지',
  INJURED: '부상 · 휴식 필요',
  RESTING: '탈진 · 휴식 필요',
  SICK: '질병 · 작업 불가',
  MISSING: '투숙 중 아님',
};
export function NightManagement({
  embedded = false,
  state,
  onRepair,
  onAction,
  onRation,
  onFinish,
  onMove,
  onInspect,
  onAssign,
  onUpgrade,
  onRestoreRoom,
}: {
  embedded?: boolean;
  state: GameState;
  onRepair: (workerId: string | null) => void;
  onAction: (action: HotelActionId) => void;
  onRation: (policy: GameState['foodRationPolicy']) => void;
  onFinish: () => void;
  onMove: (location: NightLocation) => void;
  onInspect: () => void;
  onAssign: (id: string | null) => void;
  onUpgrade: () => void;
  onRestoreRoom: (room: number, worker: string | null) => void;
}) {
  const Container = embedded ? 'section' : 'main';
  const location = state.nightShift?.location ?? 'front';
  const setLocation = onMove;
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const staying = state.guests.filter((g) => g.status === 'STAYING' && g.alive);
  const workers = [...staying].sort(
    (a, b) =>
      Number(isGeneratorSpecialist(b)) - Number(isGeneratorSpecialist(a)),
  );
  const generator = generatorState(state);
  const facility = getGeneratorFacilityView(state);
  const risk = generatorAtRisk(state);
  const remaining = NIGHT_MINUTES - (state.nightShift?.elapsedMinutes ?? 0);
  const upgrade = GENERATOR_UPGRADES.find(
    (u) => u.level === generator.automationLevel + 1,
  );
  const work = state.nightShift?.lastWork;
  const available = NIGHT_LOCATIONS.filter((l) => state.day >= l.day);
  const name = NIGHT_LOCATIONS.find((l) => l.id === location)!.name;
  const occupant = staying.find((g) => g.currentRoomNumber === selectedRoom);
  const foodDemand = getRationPlan(
    getNightFoodDemand(state.rooms, state.guests, state.flags).demand,
    state.foodRationPolicy,
  ).foodDemand;
  const actionButton = (id: HotelActionId, label: string) => {
    const definition = getHotelActionDefinition(state, id);
    const enough = Object.entries(definition.cost).every(
      ([key, cost]) =>
        state.resources[key as keyof GameState['resources']] >= Number(cost),
    );
    return (
      <Button
        variant="outline"
        disabled={
          !canSpendNightTime(state, NIGHT_JOB_MINUTES[id] ?? Infinity) ||
          !enough
        }
        onClick={() => onAction(id)}
      >
        {label} · {NIGHT_JOB_MINUTES[id]}분
        {Object.entries(definition.cost).map(
          ([key, cost]) => ` / ${key === 'parts' ? '부품' : '연료'} ${cost}`,
        )}
      </Button>
    );
  };
  return (
    <Container className="night-hotel" data-game-phase="night_management">
      <header className="night-heading">
        <div>
          <p>JUJU HOTEL · DAY {state.day} 밤</p>
          <h1>마지막 불빛을 지키는 시간</h1>
        </div>
        <div className="night-budget">
          <span>호텔 시각 · 새벽 03:00까지</span>
          <strong>
            {nightClock(state)} <small>남은 {remaining}분</small>
          </strong>
        </div>
      </header>
      <p className="night-objective">
        {state.day < 4
          ? '호텔 지도를 눌러 투숙객과 공간을 확인하세요. 이동과 작업할 때만 시간이 흐릅니다.'
          : risk
            ? '발전기가 곧 멎습니다. 수리하거나, 정전을 감수하고 밤을 넘기세요.'
            : state.day === 4
              ? '발전기 상태를 확인하세요. 오늘은 직접 공구를 들고 수리할 수 있습니다.'
              : (facility.alert ??
                (facility.remote
                  ? '발전기는 원격 관리 중입니다. 필요한 공간만 돌아본 뒤 쉬어도 됩니다.'
                  : '반복되는 발전기 점검은 엔지니어에게 계속 맡길 수 있습니다.'))}
      </p>
      <div className="night-layout">
        <nav className="night-hotel-map" aria-label="야간 호텔 지도">
          {available.map((l) => {
            const Icon = icons[l.id];
            return (
              <Button
                key={l.id}
                variant="ghost"
                className={`hotel-location location-${l.id}`}
                aria-pressed={location === l.id}
                disabled={
                  !canSpendNightTime(state, movementMinutes(state, l.id))
                }
                onClick={() => {
                  setLocation(l.id);
                  setConfirmFinish(false);
                }}
              >
                <Icon />
                <strong>{l.name}</strong>
                <span>
                  {l.id === 'generator'
                    ? facility.remote || risk
                      ? `${facility.alert ? '⚠ ' : '✓ '}${facility.alert ?? `${facility.workerName} · ${facility.mode}`}`
                      : '직접 관리 · 방문 점검'
                    : l.id === 'rooms'
                      ? `${staying.length}명 투숙 중`
                      : l.id === 'kitchen'
                        ? `식량 ${state.resources.food}`
                        : l.id === 'storage'
                          ? `부품 ${state.resources.parts}`
                          : l.id === 'clinic'
                            ? `치료가 필요한 사람 ${staying.filter((g) => g.health < 80 || g.infectionState !== 'HEALTHY').length}명`
                            : l.id === 'entrance'
                              ? `안전도 ${state.hotelStats.security}`
                              : '오늘의 근무 마감'}
                </span>
                <small>
                  {location === l.id
                    ? '현재 위치'
                    : `이동 ${movementMinutes(state, l.id)}분`}
                </small>
              </Button>
            );
          })}
          <p className="night-map-note">
            복도를 따라 공간을 선택하세요.
            <br />
            공간은 날짜에 따라 하나씩 열립니다.
          </p>
        </nav>
        <section className="night-location-detail" aria-label={`${name} 상태`}>
          <h2>{name}</h2>
          {location === 'front' && (
            <>
              <p>
                낮에 열어 준 문 뒤에는 이제 당신을 믿고 잠든 사람들이 있습니다.
              </p>
              <p>
                {staying.length
                  ? `${staying
                      .map((g) => g.name)
                      .slice(0, 2)
                      .join(
                        ', ',
                      )}${staying.length > 2 ? ' 외 투숙객들' : ''}의 기척이 복도에 남아 있습니다.`
                  : '아직 묵고 있는 사람은 없습니다. 조용히 호텔을 둘러보세요.'}
              </p>
              <p>
                이동과 작업마다 시간이 흐릅니다. 화면을 읽는 동안에는 시간이
                멈춥니다. 모든 일을 끝낼 필요는 없습니다. 방치한 발전기 문제는
                다음 밤에도 남습니다.
              </p>
              {state.day >= 4 && (
                <p>
                  {facility.mode} ·{' '}
                  {facility.alert ??
                    (facility.remote
                      ? `${facility.workerName} 관리 중. 오늘 발전기실 방문은 필요하지 않습니다.`
                      : '발전기실에서 점검하거나 엔지니어에게 맡기세요.')}
                </p>
              )}
              <Button variant="outline" onClick={() => setLocation('rooms')}>
                객실 살펴보기
              </Button>
            </>
          )}
          {location === 'generator' && (
            <>
              <div className={`generator-gauge ${risk ? 'is-critical' : ''}`}>
                <label htmlFor="generator-condition">
                  {risk ? '출력 불안정 · 수리 필요' : '발전기 내구도'}
                </label>
                <strong>
                  {generator.condition}
                  <small> / 100</small>
                </strong>
                <meter
                  id="generator-condition"
                  aria-label="발전기 내구도"
                  min="0"
                  max="100"
                  low={36}
                  high={65}
                  optimum={100}
                  value={generator.condition}
                />
              </div>
              <small>
                현재 가동 예약: {facility.production.circuits}개 회로 · 기본
                연료 {facility.consumption.fuel}. 정전 시 전체 회로가 멈춥니다.
              </small>
              <p>
                {state.flags.generator_network_stable === true
                  ? '독립 마이크로그리드가 발전기 고장에 대비합니다.'
                  : '내구도 70 이하: 경미 이상 / 35 이하: 정전 위험 / 20 이하: 대형 파손. 투숙객·시설·폭풍·누적 마모에 따라 노후화됩니다.'}
              </p>
              {state.day >= 5 ? (
                <Button
                  variant="outline"
                  disabled={!!repairBlockReason(state, null)}
                  onClick={() => onRepair(null)}
                >
                  직접{' '}
                  {generator.activeProblem === 'major'
                    ? '대형 파손 복구 · 부품 5 / 90분 / 내구도 +45'
                    : '수리 · 부품 3 / 45분 / 내구도 +30'}
                </Button>
              ) : (
                <p className="night-help day-four-facility-note">
                  첫 점검에서는 상태만 확인합니다. 경미한 이상은 다음 운영일에
                  수리할 수 있습니다.
                </p>
              )}
              <Button
                variant="outline"
                onClick={onInspect}
                disabled={
                  generator.lastInspectedDay === state.day ||
                  !canSpendNightTime(state, 15)
                }
              >
                {generator.lastInspectedDay === state.day
                  ? '오늘 점검 완료'
                  : '발전기 점검 · 15분 / 마모 -3'}
              </Button>
              <p>
                {
                  {
                    NORMAL: '정상',
                    WARNING: '주의',
                    URGENT: '위험',
                    CRITICAL: '긴급',
                  }[facility.severity]
                }{' '}
                · {facility.mode} · LV.
                {generator.automationLevel} · 마모 {generator.wear}
              </p>
              {facility.alert && <p role="status">⚠ {facility.alert}</p>}
              {upgrade && (
                <>
                  <p>다음 단계: {upgrade.description}</p>
                  <Button
                    variant="outline"
                    onClick={onUpgrade}
                    disabled={
                      state.day < upgrade.day ||
                      state.resources.parts < upgrade.parts ||
                      !canSpendNightTime(state, upgrade.minutes) ||
                      generator.activeProblem === 'major'
                    }
                  >
                    LV.{upgrade.level} 설치 · DAY {upgrade.day}부터 / 부품{' '}
                    {upgrade.parts} / {upgrade.minutes}분
                  </Button>
                </>
              )}
              {repairBlockReason(state, null) && (
                <small className="night-help">
                  {repairBlockReason(state, null)}
                </small>
              )}
              {state.day >= 5 && (
                <>
                  <h3>
                    발전기 담당 ·{' '}
                    {facility.assignedWorker ? facility.workerName : '없음'}
                  </h3>
                  <p className="night-help">
                    한 번 배정하면 매일 점검합니다. 경미한 수리는 부품 1로
                    내구도 +25. 부상·질병·탈진·퇴실 시 중단됩니다. 대형 파손은
                    직접 복구해야 합니다.
                  </p>
                  {facility.assignedWorker && (
                    <Button
                      variant="outline"
                      disabled={!canSpendNightTime(state, 10)}
                      onClick={() => onAssign(null)}
                    >
                      담당 해제 · 10분
                    </Button>
                  )}
                  {workers.some(isGeneratorSpecialist) ? (
                    <label className="night-worker-select">
                      담당자 선택
                      <select
                        value={facility.assignedWorker ?? ''}
                        onChange={(event) =>
                          onAssign(event.target.value || null)
                        }
                        disabled={!canSpendNightTime(state, 10)}
                      >
                        <option value="">담당 없음</option>
                        {workers.filter(isGeneratorSpecialist).map((g) => (
                          <option
                            key={g.id}
                            value={g.id}
                            disabled={getWorkerStatus(state, g) !== 'AVAILABLE'}
                          >
                            {g.name} · {g.role} ·{' '}
                            {statusLabels[getWorkerStatus(state, g)]}
                          </option>
                        ))}
                      </select>
                      <small>담당 변경 · 10분</small>
                    </label>
                  ) : (
                    <p>
                      정비공·전기기사·엔지니어가 입실하면 반복 점검을 맡길 수
                      있습니다.
                    </p>
                  )}
                </>
              )}
              {work && (
                <section
                  className="night-work-result"
                  aria-label="최근 수리 결과"
                >
                  <h3>{work.title}</h3>
                  <p>{work.message}</p>
                  <p>
                    부품 {work.partsBefore} → {work.partsAfter} <br />
                    내구도 {work.conditionBefore} → {work.conditionAfter}
                  </p>
                  <strong>
                    {risk
                      ? '아직 정전 위험이 남았습니다.'
                      : '내구도 부족으로 인한 정전 위험 해소'}
                  </strong>
                </section>
              )}
            </>
          )}
          {location === 'rooms' && (
            <>
              <p>방을 선택해 누가 잠들어 있는지 확인하세요.</p>
              <div className="night-rooms" aria-label="30개 객실">
                {[...state.rooms]
                  .sort(
                    (a, b) => b.floor - a.floor || a.roomNumber - b.roomNumber,
                  )
                  .map((r) => (
                    <Button
                      variant="outline"
                      key={r.roomNumber}
                      aria-pressed={selectedRoom === r.roomNumber}
                      onClick={() => setSelectedRoom(r.roomNumber)}
                    >
                      <RoomContents room={r} guests={state.guests} />
                    </Button>
                  ))}
              </div>
              {selectedRoom !== null && (
                <p>
                  {selectedRoom}호 ·{' '}
                  {occupant
                    ? `${occupant.name} / ${occupant.role} / ${occupant.conditionLabel}`
                    : '투숙객 없음'}
                </p>
              )}
              <div className="night-actions">
                {actionButton('community_outreach', '투숙객과 이야기하기')}
                {actionButton('repair_hotel', '객실과 호텔 보수')}
              </div>
              {selectedRoom !== null && (
                <RoomRecovery
                  key={selectedRoom}
                  state={state}
                  roomNumber={selectedRoom}
                  onRestore={onRestoreRoom}
                />
              )}
              <small>
                대화: 투숙객 신뢰 +5 · 보수: 호텔 상태 +8. 잠긴 객실은 선택 후
                별도로 복구합니다. 기존 호텔 운영 효과를 사용합니다.
              </small>
            </>
          )}
          {location === 'kitchen' && (
            <>
              <p>
                남은 식량 <strong>{state.resources.food}</strong> · 현재 배급
                기준 예상 식량 수요 {foodDemand} (전력과 직원 근무에 따라 정산
                시 달라집니다.)
              </p>
              <meter
                aria-label="식량 재고"
                min="0"
                max="100"
                value={state.resources.food}
              />
              <h3>오늘 밤의 배급</h3>
              {RATION_POLICIES.map((policy) => (
                <Button
                  key={policy.id}
                  variant="outline"
                  aria-pressed={state.foodRationPolicy === policy.id}
                  onClick={() => onRation(policy.id)}
                >
                  {policy.name}
                </Button>
              ))}
              <p>
                {
                  RATION_POLICIES.find((p) => p.id === state.foodRationPolicy)
                    ?.description
                }
              </p>
              <small>
                배급 정책은 다음 날에도 유지됩니다. 실제 소비와 건강 변화는 야간
                정산에 한 번만 적용됩니다.
              </small>
            </>
          )}
          {location === 'storage' && (
            <>
              <p>선반에 남은 물자입니다. 새로 생기는 물자는 없습니다.</p>
              <dl className="night-stock">
                {(['water', 'parts', 'fuel', 'medicine'] as const).map(
                  (key, i) => (
                    <div key={key}>
                      <dt>{['물', '부품', '연료', '약품'][i]}</dt>
                      <dd>
                        {state.resources[key]}
                        <meter
                          min="0"
                          max="100"
                          value={state.resources[key]}
                          aria-label={['물', '부품', '연료', '약품'][i]}
                        />
                      </dd>
                    </div>
                  ),
                )}
              </dl>
              <small>
                수리 부품이 모자라면 다음 날 방문객의 물자나 기존 교역을
                이용하세요.
              </small>
            </>
          )}
          {location === 'clinic' && (
            <>
              <p>
                의약품 {state.resources.medicine} · 진료 회로{' '}
                {state.powerAllocation.includes('CLINIC')
                  ? '가동 예약'
                  : '꺼짐'}
              </p>
              {staying
                .filter((g) => g.health < 80 || g.infectionState !== 'HEALTHY')
                .slice(0, 4)
                .map((g) => (
                  <p key={g.id}>
                    {g.currentRoomNumber}호 {g.name} · {g.conditionLabel} · 체력{' '}
                    {g.health}
                  </p>
                ))}
              {staying.filter(
                (g) => g.health < 80 || g.infectionState !== 'HEALTHY',
              ).length > 4 && (
                <small>
                  그 외 치료 필요 주민{' '}
                  {staying.filter(
                    (g) => g.health < 80 || g.infectionState !== 'HEALTHY',
                  ).length - 4}
                  명 · 주민 관리에서 확인
                </small>
              )}
              <p>
                기존 돌봄 능력과 의무실 담당자의 처치는 밤이 지난 뒤 적용됩니다.
                정전 시 진료 회로가 정지합니다.
              </p>
            </>
          )}
          {location === 'entrance' && (
            <>
              <p>
                정문 안전도 {state.hotelStats.security} · 바깥 위협{' '}
                {Number(state.flags.monster_threat ?? 0)}
              </p>
              {actionButton('security_patrol', '정문 경계 순찰')}
              <p>
                연료 1로 보안 물자 +5, 호텔 안전도 +5. 방호 회로가 꺼지면 밤에
                안전도가 떨어집니다.
              </p>
            </>
          )}
        </section>
      </div>
      <footer className="night-finish">
        {confirmFinish ? (
          <div role="group" aria-label="정전 위험 확인">
            <p>
              발전기 내구도 {generator.condition}. 수리하지 않으면 오늘 밤
              전력이 끊깁니다.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmFinish(false);
                setLocation('generator');
              }}
            >
              발전기 다시 살펴보기
            </Button>
            <Button onClick={onFinish}>정전을 감수하고 밤을 넘기기</Button>
          </div>
        ) : (
          <>
            <small>
              {remaining
                ? `${remaining}분 남음 · 필요한 일만 마친 뒤 쉴 수 있습니다.`
                : '새벽 03:00입니다. 남은 문제는 다음 밤에도 이어집니다.'}
            </small>
            <Button
              className="night-main-cta"
              onClick={() => (risk ? setConfirmFinish(true) : onFinish())}
            >
              순회를 마치고 밤을 넘기기
            </Button>
          </>
        )}
      </footer>
    </Container>
  );
}
