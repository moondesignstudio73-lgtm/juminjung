'use client';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, HeartPulse, Utensils, Droplets, Wrench } from 'lucide-react';
import type { GameState } from '@/game/types';
import {
  DAY_STAGES,
  currentDayStage,
  getMorningBrief,
  getLivingForecast,
  getOperationTasks,
  residentStatus,
  type DayStage,
} from '@/game/day-flow-manager';
import {
  getGeneratorFacilityView,
  nightClock,
} from '@/game/night-work-manager';
import { RATION_POLICIES } from '@/game/daily-survival-manager';
import { STAFF_DUTIES } from '@/game/staff-operation-manager';
import './day-flow.css';
import { ResidentDetails } from './community';
import { HotelMap } from './hotel-ui';

export function DayFlowNav({
  state,
  review,
  onReview,
  onArchive,
}: {
  state: GameState;
  review: DayStage | null;
  onReview: (stage: DayStage | null) => void;
  onArchive: () => void;
}) {
  const current = currentDayStage(state);
  const order = DAY_STAGES.map((s) => s.id);
  return (
    <nav className="day-flow-nav" aria-label="하루 진행">
      <span>DAY {state.day}</span>
      {DAY_STAGES.filter((s) => state.day >= s.day).map((s) => (
        <Button
          key={s.id}
          variant="ghost"
          aria-current={(review ?? current) === s.id ? 'step' : undefined}
          disabled={order.indexOf(s.id) > order.indexOf(current)}
          onClick={() => onReview(s.id === current ? null : s.id)}
        >
          {s.label}
        </Button>
      ))}
      <Button variant="ghost" onClick={onArchive} aria-label="기록 보관소">
        <BookOpen />
      </Button>
    </nav>
  );
}
const labels = {
  report: '아침 보고',
  visitors: '프론트 기록',
  residents: '주민과 배급',
  operations: '오늘의 운영',
  events: '밤의 사건',
};
export function DayFlowPage({
  state,
  stage,
  onContinue,
  onRation,
  onOperation,
  onExpel,
  readOnly = false,
  children,
}: {
  state: GameState;
  stage: DayStage;
  onExpel?: (id: string) => void;
  onContinue: () => void;
  onRation: (policy: GameState['foodRationPolicy']) => void;
  onOperation: (
    location: ReturnType<typeof getOperationTasks>[number]['location'],
  ) => void;
  readOnly?: boolean;
  children?: ReactNode;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [residentPage, setResidentPage] = useState(0);
  const forecast = getLivingForecast(state),
    residents = [...forecast.residents].sort(
      (a, b) => residentStatus(b).rank - residentStatus(a).rank,
    );
  const troubled = residents.filter((g) => residentStatus(g).rank > 0);
  const residentPageSize = 4;
  const residentPageCount = Math.max(
    1,
    Math.ceil(residents.length / residentPageSize),
  );
  const safeResidentPage = Math.min(residentPage, residentPageCount - 1);
  const visible = residents.slice(
    safeResidentPage * residentPageSize,
    (safeResidentPage + 1) * residentPageSize,
  );
  const guest = residents.find((g) => g.id === selected);
  const duty = (id: string) =>
    STAFF_DUTIES.find((d) => state.staffAssignments[d.id] === id)?.name ??
    '담당 없음';
  const tasks = getOperationTasks(state);
  const generator = getGeneratorFacilityView(state);
  return (
    <main className="day-flow-page" data-day-stage={stage}>
      <header>
        <p>아버지가 남긴 호텔 운영일지 · DAY {state.day}</p>
        <h1>{labels[stage]}</h1>
        <span>
          {readOnly
            ? '기록 열람 · 이미 확정한 선택은 바뀌지 않습니다.'
            : stage === 'report'
              ? '어젯밤 무슨 일이 있었나?'
              : stage === 'residents'
                ? '사람들은 괜찮은가?'
                : stage === 'operations'
                  ? `오늘 무엇을 해야 하나? · ${nightClock(state)}`
                  : '오늘 프론트에 남은 기록'}
        </span>
      </header>
      <section className="day-flow-content" key={`${state.day}-${stage}`}>
        {stage === 'report' && (
          <ol className="morning-lines">
            {getMorningBrief(state)
              .slice(0, 5)
              .map((line, i) => (
                <li key={i}>{line}</li>
              ))}
          </ol>
        )}
        {stage === 'visitors' && (
          <>
            <p>
              오늘 방문객 응대가 끝났습니다. 문을 열어 준 사람들의 생활이 이제
              시작됩니다.
            </p>
            <p>
              입실{' '}
              {
                state.eventHistory.filter(
                  (e) => e.day === state.day && e.type === 'CHECK_IN',
                ).length
              }
              명 · 현재 투숙 {residents.length}명
            </p>
          </>
        )}
        {stage === 'residents' && (
          <div className="living-layout">
            <section>
              <h2>
                <HeartPulse /> 주민 {residents.length}명
              </h2>
              <p>
                안정 {residents.length - troubled.length}명 · 확인 필요{' '}
                {troubled.length}명
              </p>
              {state.day === 2 && !readOnly && (
                <p className="flow-note">
                  처음 보는 생활 관리 · 주민은 매일 식량과 물을 필요로 합니다.
                </p>
              )}
              {!troubled.length && (
                <p className="quiet-status">✓ 지금은 위급한 주민이 없습니다.</p>
              )}
              {guest ? (
                <article className="resident-detail">
                  <h3>
                    {guest.name} · {guest.currentRoomNumber}호
                  </h3>
                  <p>
                    {guest.role} · {residentStatus(guest).label} ·{' '}
                    {duty(guest.id)}
                  </p>
                  <p>
                    체력 {guest.health} · 스트레스 {guest.stress} · 신뢰{' '}
                    {guest.trust}
                  </p>
                  <p>{guest.conditionLabel}</p>
                  <ResidentDetails
                    key={guest.id}
                    state={state}
                    guest={guest}
                    onExpel={readOnly ? undefined : onExpel}
                  />
                  <Button variant="outline" onClick={() => setSelected(null)}>
                    주민 목록으로
                  </Button>
                </article>
              ) : (
                <>
                  <div className="resident-short-list">
                    {visible.map((g) => (
                      <Button
                        variant="ghost"
                        key={g.id}
                        onClick={() => setSelected(g.id)}
                      >
                        <img src={g.portrait} alt="" />
                        <span>
                          <strong>{g.name}</strong>
                          <small>
                            {g.role} · {duty(g.id)}
                          </small>
                          <em>{residentStatus(g).label}</em>
                        </span>
                      </Button>
                    ))}
                  </div>
                  {residentPageCount > 1 && (
                    <nav
                      className="game-pagination"
                      aria-label="주민 목록 페이지"
                    >
                      <Button
                        variant="outline"
                        disabled={safeResidentPage === 0}
                        onClick={() => setResidentPage(safeResidentPage - 1)}
                      >
                        ‹ 이전
                      </Button>
                      <span>
                        {safeResidentPage + 1} / {residentPageCount}
                      </span>
                      <Button
                        variant="outline"
                        disabled={safeResidentPage === residentPageCount - 1}
                        onClick={() => setResidentPage(safeResidentPage + 1)}
                      >
                        다음 ›
                      </Button>
                    </nav>
                  )}
                </>
              )}
            </section>
            <section>
              <h2>
                <Utensils /> 오늘의 배급
              </h2>
              <div className="supply-days">
                {[
                  {
                    label: '식량',
                    icon: <Utensils />,
                    days: forecast.foodDays,
                    stock: state.resources.food,
                    demand: forecast.food,
                  },
                  {
                    label: '물',
                    icon: <Droplets />,
                    days: forecast.waterDays,
                    stock: state.resources.water,
                    demand: forecast.water,
                  },
                ].map((r) => (
                  <div key={r.label}>
                    {r.icon}
                    <span>{r.label}</span>
                    <strong>
                      {r.days === null
                        ? '소비 없음'
                        : `${r.days.toFixed(1)}일분`}
                    </strong>
                    <Progress
                      value={
                        r.days === null
                          ? 100
                          : Math.min(100, (r.days / 5) * 100)
                      }
                      aria-label={`${r.label} 비축 수준`}
                    />
                    <small>
                      재고 {r.stock} · 오늘 예상 {r.demand}
                    </small>
                  </div>
                ))}
              </div>
              <div className="flow-rations">
                {RATION_POLICIES.map((p) => (
                  <Button
                    key={p.id}
                    variant="outline"
                    aria-pressed={p.id === state.foodRationPolicy}
                    disabled={readOnly}
                    onClick={() => onRation(p.id)}
                  >
                    {p.name}
                  </Button>
                ))}
              </div>
              <p>
                {
                  RATION_POLICIES.find((p) => p.id === state.foodRationPolicy)
                    ?.description
                }
              </p>
              <small>
                물은 기존 일일 수요대로 지급됩니다. 배급 정책은 유지되며,
                사건·인력·전력 변화에 따라 실제 소비는 달라질 수 있습니다.
              </small>
            </section>
          </div>
        )}
        {stage === 'operations' && (
          <>
            <HotelMap state={state} onOpen={onOperation} readOnly={readOnly} />
            {children}
          </>
        )}
      </section>
      <footer>
        {stage === 'residents' && state.day >= 3 && !readOnly && (
          <Button variant="outline" onClick={() => onOperation('front')}>
            운영 직접 살펴보기
          </Button>
        )}
        <small>
          {readOnly
            ? '열람은 비용이나 정산을 다시 발생시키지 않습니다.'
            : '주요 선택과 단계 이동은 자동 저장됩니다.'}
        </small>
        <Button className="flow-primary" onClick={onContinue}>
          {readOnly
            ? '현재 진행으로 돌아가기'
            : stage === 'report'
              ? state.day === 1
                ? '첫 손님 맞이하기'
                : '프론트로'
              : stage === 'visitors'
                ? state.day === 1
                  ? '첫날 밤으로'
                  : '주민 상태 살펴보기'
                : stage === 'residents'
                  ? state.day < 3
                    ? '밤을 맞이한다'
                    : '호텔 지도로'
                  : '밤을 맞이한다'}
        </Button>
      </footer>
    </main>
  );
}
export function FlowArchive({
  state,
  onClose,
}: {
  state: GameState;
  onClose: () => void;
}) {
  const [page, setPage] = useState(0);
  const pageSize = 6;
  const entries = [...state.eventHistory].reverse();
  const pageCount = Math.max(1, Math.ceil(entries.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visibleEntries = entries.slice(
    safePage * pageSize,
    (safePage + 1) * pageSize,
  );
  return (
    <main className="day-flow-page">
      <header>
        <p>JUJU HOTEL</p>
        <h1>호텔 장부</h1>
        <span>DAY {state.day} · 호텔 현황과 선택의 기록</span>
      </header>
      <section className="day-flow-content">
        <div className="archive-summary" aria-label="장부 현재 상태">
          <span>
            주민{' '}
            <b>
              {
                state.guests.filter((g) => g.alive && g.status === 'STAYING')
                  .length
              }
              명
            </b>
          </span>
          <span>
            개방 객실{' '}
            <b>
              {
                state.rooms.filter(
                  (r) => r.status === 'EMPTY' || r.status === 'OCCUPIED',
                ).length
              }
              개
            </b>
          </span>
          {(['food', 'water', 'fuel', 'medicine', 'parts'] as const).map(
            (key, i) => (
              <span key={key}>
                {['식량', '물', '연료', '약품', '부품'][i]}{' '}
                <b>{state.resources[key]}</b>
              </span>
            ),
          )}
        </div>
        <p>아버지의 흔적 · 진행 기록 {state.fatherStoryProgress}</p>
        <ol className="archive-lines">
          {visibleEntries.map((e, i) => (
            <li key={i}>
              DAY {e.day} · {e.message}
            </li>
          ))}
        </ol>
        {pageCount > 1 && (
          <nav className="game-pagination" aria-label="장부 기록 페이지">
            <Button
              variant="outline"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              최근 기록
            </Button>
            <span>
              {safePage + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              disabled={safePage === pageCount - 1}
              onClick={() => setPage(safePage + 1)}
            >
              이전 기록
            </Button>
          </nav>
        )}
      </section>
      <footer>
        <Button className="flow-primary" onClick={onClose}>
          진행으로 돌아가기
        </Button>
      </footer>
    </main>
  );
}
