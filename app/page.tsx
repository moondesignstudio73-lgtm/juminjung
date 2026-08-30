'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  BedDouble, ChevronRight, CircleHelp, Droplets, Fuel, HeartPulse,
  Inspect, PackageSearch, Radio, RotateCcw, Shield, Soup, Volume2, VolumeX,
} from 'lucide-react';
import { getAffectedRoomNumbers, recalculateRoomEffects } from '@/game/aura-effect-manager';
import { resolveDay } from '@/game/day-manager';
import { setGuestRoomFlags } from '@/game/event-manager';
import { ELEANOR_ID } from '@/game/guest-data';
import { clearBrowserGame, createInitialGameState, loadBrowserGame, saveBrowserGame } from '@/game/save-manager';
import { assignGuest, checkoutGuest, isRoomSelectable, moveGuest } from '@/game/room-manager';
import type { GameState, Guest, Room } from '@/game/types';

type Decision = GameState['decision'];
type UiSave = GameState & { prologue: number };
const makeInitial = (): UiSave => ({ ...createInitialGameState(), prologue: 0 });

const prologue = [
  { tag: 'DAY 0 · 오후 5:16', speaker: '아버지', line: '“30일이면 돌아온다. 발전기 연료는 매일 확인하고, 해가 지면 문을 열어두지 마.”' },
  { tag: 'DAY 0 · 오후 5:19', speaker: '나', line: '“대체 어디 가는 건데?”' },
  { tag: 'DAY 0 · 오후 5:20', speaker: '아버지', line: '“하나만 기억해. 사람처럼 보인다고 해서 전부 들이지는 마.”' },
  { tag: 'DAY 0 · 오후 8:47', speaker: '라디오 91.3', line: '…긴급 통행금지는 계속됩니다. 해가 진 뒤 밖에서 들리는 목소리에 응답하지 마십시오…' },
];

const questions = [
  { id: 'origin', label: '어디서 왔습니까?', answer: '“세인트 머시 병원요. 어제 동관이 무너졌어요. 마지막 10킬로미터는 걸어왔고요.”' },
  { id: 'wound', label: '그 팔은 어떻게 다쳤죠?', answer: '“이빨 자국이 아니라 유리 파편이에요. 붕대도 깨끗합니다. 직접 보셔도 돼요.”' },
  { id: 'proof', label: '의사라는 걸 증명해 보세요.', answer: '그녀는 응급환자 분류 절차를 막힘없이 읊고, 약장 속 유효기간 지난 약을 냄새만으로 맞힌다.' },
];

const items = [
  { id: 'food', icon: Soup, name: '통조림 ×3', short: '미개봉. 두 캔은 상표가 뜯겨 있다.', detail: '공장 봉인은 멀쩡하다. 투숙객 한 명이 사흘을 버틸 양이다.' },
  { id: 'fuel', icon: Fuel, name: '휘발유 · 8L', short: '탁한 붉은 연료통. 냄새는 신선하다.', detail: '물이 섞인 흔적은 없다. 발전기를 하룻밤 정도 더 돌릴 수 있다.' },
  { id: 'photo', icon: Inspect, name: '낡은 사진', short: '세인트 머시 병원 앞에 선 가족사진.', detail: '뒷면에는 “불이 꺼지면 42마일 지점으로.” 하루도 안 된 잉크다.' },
  { id: 'medicine', icon: HeartPulse, name: '밀봉된 항생제', short: '협상했을 때만 내놓은 물건.', detail: '광범위 항생제. 진품이며, 방 하나보다 훨씬 귀하다.' },
];

const defaultDialogue = '“방값만큼 일할게요. 이틀이면 됩니다. 그 이상은 바라지 않아요.”';

export default function Home() {
  const [save, setSave] = useState<UiSave>(makeInitial);
  const [hydrated, setHydrated] = useState(false);
  const [dialogue, setDialogue] = useState(defaultDialogue);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const restored = loadBrowserGame();
    setSave({ ...restored, prologue: Number((restored as GameState & { prologue?: number }).prologue ?? 0) });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && save.phase !== 'title') saveBrowserGame(save);
  }, [save, hydrated]);

  const update = (patch: Partial<UiSave>) => setSave((current) => ({ ...current, ...patch }));
  const reset = () => { clearBrowserGame(); setSave(makeInitial()); setDialogue(defaultDialogue); setSelectedItem(null); };
  const ask = (id: string, answer: string) => {
    update({ asked: [...new Set([...save.asked, id])] }); setDialogue(answer); setShowQuestions(false);
  };
  const inspect = (id: string) => {
    update({ inspected: [...new Set([...save.inspected, id])] }); setSelectedItem(id);
  };
  const refuse = () => update({ decision: 'refuse', phase: 'night' });
  const openAssignment = (mode: 'checkin' | 'move') => update({ phase: 'assignment', assignmentMode: mode, selectedRoomNumber: null });
  const confirmRoom = () => {
    if (save.selectedRoomNumber === null) return;
    const guests = save.guests.map((guest) => guest.id === ELEANOR_ID ? {
      ...guest,
      currentRoomNumber: save.selectedRoomNumber,
      status: 'STAYING' as const,
      checkedInDay: guest.checkedInDay ?? save.day,
      remainingNights: save.assignmentMode === 'checkin' ? guest.stayDuration : guest.remainingNights,
    } : guest);
    const positioned = save.assignmentMode === 'move'
      ? moveGuest(save.rooms, ELEANOR_ID, save.selectedRoomNumber)
      : assignGuest(save.rooms, save.selectedRoomNumber, ELEANOR_ID);
    update({
      guests,
      rooms: recalculateRoomEffects(positioned, guests),
      flags: setGuestRoomFlags(save.flags, save.selectedRoomNumber),
      resources: save.assignmentMode === 'checkin' ? {
        ...save.resources,
        fuel: save.resources.fuel + 8,
        medicine: save.resources.medicine + (save.negotiated ? 4 : 3),
        security: save.resources.security + 4,
      } : save.resources,
      eventHistory: save.assignmentMode === 'checkin' ? [...save.eventHistory, { day: save.day, type: 'CHECK_IN' as const, message: `엘리너 리드 · ${save.selectedRoomNumber}호 체크인` }] : save.eventHistory,
      decision: 'checkin', phase: 'management', assignmentMode: null,
    });
  };
  const checkout = () => {
    const guests = save.guests.map((guest) => guest.id === ELEANOR_ID ? { ...guest, currentRoomNumber: null, status: 'CHECKED_OUT' as const, remainingNights: 0 } : guest);
    update({ guests, rooms: recalculateRoomEffects(checkoutGuest(save.rooms, ELEANOR_ID), guests), flags: setGuestRoomFlags(save.flags, null), eventHistory: [...save.eventHistory, { day: save.day, type: 'CHECK_OUT', message: '엘리너 리드 · 수동 체크아웃' }], decision: null, phase: 'desk' });
  };

  if (save.phase === 'title') return <TitleScreen onStart={() => update({ phase: 'prologue' })} muted={muted} setMuted={setMuted} />;
  if (save.phase === 'prologue') {
    const beat = prologue[save.prologue];
    return (
      <main className="cinematic-screen">
        <img src="/juminjung/assets/front-desk-night.png" alt="아버지가 떠난 밤의 어두운 JUJU HOTEL 로비." />
        <div className="cinematic-wash" />
        <p className="scene-index">{beat.tag}</p>
        <section className="cutscene-copy" aria-live="polite">
          <span>{beat.speaker}</span><p>{beat.line}</p>
          <Button className="advance" onClick={() => save.prologue < prologue.length - 1 ? update({ prologue: save.prologue + 1 }) : update({ phase: 'desk', day: 1 })}>
            {save.prologue < prologue.length - 1 ? '계속' : '문을 연다'} <ChevronRight />
          </Button>
        </section>
        <div className="knock" aria-hidden="true">똑.<br/>똑.<br/>똑.</div>
      </main>
    );
  }
  const eleanor = save.guests.find((guest) => guest.id === ELEANOR_ID)!;
  if (save.phase === 'assignment') return <RoomAssignment day={save.day} rooms={save.rooms} guest={eleanor} selected={save.selectedRoomNumber} mode={save.assignmentMode!} onSelect={(roomNumber) => update({ selectedRoomNumber: roomNumber })} onConfirm={confirmRoom} onCancel={() => update({ phase: save.assignmentMode === 'move' ? 'management' : 'desk', assignmentMode: null, selectedRoomNumber: null })} />;
  if (save.phase === 'management') return <HotelManagement day={save.day} rooms={save.rooms} guest={eleanor} resources={save.resources} onMove={() => openAssignment('move')} onCheckout={checkout} onContinue={() => update({ phase: 'night' })} />;
  if (save.phase === 'night') return <NightEvent day={save.day} decision={save.decision!} roomNumber={eleanor.currentRoomNumber} onContinue={() => setSave((current) => ({ ...resolveDay(current), prologue: current.prologue }))} />;
  if (save.phase === 'report') return <MorningReport state={save} onNext={() => update({ phase: eleanor.status === 'STAYING' ? 'management' : 'desk', decision: eleanor.status === 'STAYING' ? 'checkin' : null, asked: [], inspected: [], negotiated: false, held: false })} onReset={reset} />;
  if (save.phase === 'ending') return <CampaignEnding state={save} onReset={reset} />;

  const availableItems = save.negotiated ? items : items.filter((item) => item.id !== 'medicine');
  const detail = items.find((item) => item.id === selectedItem);
  return (
    <main className="game-shell">
      <div className="rain" aria-hidden="true" />
      <header className="game-header">
        <div><p className="eyebrow">JUJU HOTEL · 프런트</p><h1>MAY I HAVE A ROOM?</h1></div>
        <div className="header-actions">
          <button className="icon-button" onClick={() => setMuted(!muted)} aria-label={muted ? '소리 켜기' : '소리 끄기'}>{muted ? <VolumeX/> : <Volume2/>}</button>
          <button className="icon-button" onClick={reset} aria-label="게임 다시 시작"><RotateCcw/></button>
          <div className="day-chip"><span>DAY {save.day || 1}</span><small>오후 8:47 · 비</small></div>
        </div>
      </header>

      <section className="desk-scene" aria-label="밤의 JUJU HOTEL 프런트">
        <img src="/juminjung/assets/front-desk-night.png" alt="비에 젖은 의사 엘리너가 낡은 프런트 카운터 앞에 서 있다." />
        <div className="scene-vignette" />
        <aside className="case-file left-panel">
          <span className="panel-label">방문자 001</span><h2>엘리너 리드</h2><p>31세 · 응급의학과 의사</p>
          <dl>
            <div><dt>요청</dt><dd>2박</dd></div><div><dt>상태</dt><dd>부상 · 안정</dd></div>
            <div><dt>제시품</dt><dd>{save.negotiated ? '보급품 + 항생제' : '보급품'}</dd></div>
          </dl>
          <div className="clue-count">단서 {save.asked.length + save.inspected.length} / 7<small>질문과 조사는 시간을 쓰지 않습니다.</small></div>
        </aside>
        <aside className="hotel-status right-panel">
          <span className="panel-label">야간 장부 · 자원 점수</span><strong>{save.rooms.filter(isRoomSelectable).length}</strong><small>빈 객실 · 총 30실</small>
          <Status icon={Fuel} label="연료" value={save.resources.fuel}/><Status icon={Soup} label="식량" value={save.resources.food}/><Status icon={Shield} label="보안" value={save.resources.security}/>
        </aside>

        <div className="item-tray" aria-label="제시한 물품">
          {availableItems.map(({ id, icon: Icon, name }) => <button key={id} className={save.inspected.includes(id) ? 'item inspected' : 'item'} onClick={() => inspect(id)}><Icon/><span>{name}</span><small>{save.inspected.includes(id) ? '조사 완료' : '조사'}</small></button>)}
        </div>

        <div className="dialogue-card">
          <div className="speaker"><Radio size={15}/> 엘리너 리드</div><p>{dialogue}</p>
          <div className="action-row">
            <Button variant="secondary" onClick={() => setShowQuestions(!showQuestions)}><CircleHelp/> 질문</Button>
            <Button variant="secondary" onClick={() => { setDialogue('카운터 위 물건을 선택하세요. 사람보다 소지품이 더 솔직할 때가 있습니다.'); }}><PackageSearch/> 조사</Button>
            <Button variant="secondary" title="항생제를 추가 숙박료로 요구합니다." disabled={save.negotiated} onClick={() => { update({ negotiated:true }); setDialogue('“좋아요. 밀봉된 약 한 병을 더 내죠. 대신 문은 잠가주고, 자정 뒤에는 아무것도 묻지 마세요.”'); }}><Droplets/> 협상</Button>
            <Button variant="secondary" title="방문자를 현관 안쪽에 잠시 대기시킵니다." disabled={save.held} onClick={() => { update({ held:true }); setDialogue('꺼져가는 현관등 아래 그녀를 잠시 대기시킨다. 등 뒤 유리문에서 무언가 한 번 길게 긁히는 소리가 난다.'); }}><Radio/> 보류</Button>
          </div>
          {showQuestions && <div className="question-menu">{questions.map((q) => <button key={q.id} className={save.asked.includes(q.id) ? 'asked' : ''} onClick={() => ask(q.id,q.answer)}>{q.label}<ChevronRight/></button>)}</div>}
        </div>
        <div className="decision-bar">
          <p><span>호텔 규칙 01</span> 이 문을 통과한 모든 사람은 당신의 책임입니다.</p>
          <Button className="refuse" onClick={refuse}>거절</Button>
          <Button className="checkin" onClick={() => openAssignment('checkin')}><BedDouble/> 체크인 · 객실 선택</Button>
        </div>
      </section>

      {detail && <div className="modal-backdrop" onClick={() => setSelectedItem(null)}><section className="item-modal" role="dialog" aria-modal="true" aria-labelledby="item-title" onClick={(e) => e.stopPropagation()}><span className="panel-label">조사 기록 · {detail.id.toUpperCase()}</span><detail.icon/><h2 id="item-title">{detail.name}</h2><p>{detail.short}</p><blockquote>{detail.detail}</blockquote><Button onClick={() => setSelectedItem(null)}>프런트로 돌아가기</Button></section></div>}
    </main>
  );
}

function Status({ icon: Icon, label, value }: { icon: typeof Fuel; label: string; value: number }) {
  return <div className="resource-line"><Icon/><span>{label}</span><i><b style={{width:`${value}%`}} /></i><em>{value}</em></div>;
}

function TitleScreen({ onStart, muted, setMuted }: { onStart:()=>void; muted:boolean; setMuted:(v:boolean)=>void }) {
  return <main className="title-screen"><img src="/juminjung/assets/front-desk-night.png" alt="빗속의 JUJU HOTEL 프런트."/><div className="title-wash"/><button className="sound-corner" onClick={()=>setMuted(!muted)} aria-label="소리 전환">{muted?<VolumeX/>:<Volume2/>}</button><section className="title-lockup"><p>선택형 호텔 생존 스토리</p><h1><span>MAY I HAVE</span>A ROOM?</h1><div className="neon-rule"/><p className="title-tagline">30일 · 30개 객실 · 누구를 어디에 들일지는 당신의 선택</p><Button className="start-button" onClick={onStart}>DAY 0 시작<ChevronRight/></Button><small>진행 상황은 매 장면마다 이 기기에 자동 저장됩니다.</small></section></main>;
}

function HotelGrid({ rooms, selected, affected, onSelect }: { rooms: Room[]; selected?: number | null; affected?: number[]; onSelect?: (roomNumber:number)=>void }) {
  const aura = new Set(affected ?? []);
  return <div className="hotel-cutaway" aria-label="JUJU HOTEL 30개 객실 배치도">{[3,2,1].map((floor) => <div className="hotel-floor" key={floor}><strong>{floor}F</strong><div className="room-row">{rooms.filter((room) => room.floor === floor).map((room) => <button key={room.roomNumber} disabled={Boolean(onSelect) && !isRoomSelectable(room)} onClick={() => onSelect?.(room.roomNumber)} className={['room-cell', room.status.toLowerCase(), selected === room.roomNumber ? 'selected' : '', aura.has(room.roomNumber) ? 'aura' : ''].join(' ')}><b>{room.roomNumber}</b><span>{room.occupied ? '엘리너' : room.status}</span>{aura.has(room.roomNumber) && <i>의료</i>}</button>)}</div></div>)}</div>;
}

function RoomAssignment({ day, rooms, guest, selected, mode, onSelect, onConfirm, onCancel }: { day:number; rooms:Room[]; guest:Guest; selected:number|null; mode:'checkin'|'move'; onSelect:(roomNumber:number)=>void; onConfirm:()=>void; onCancel:()=>void }) {
  const previewGuest = { ...guest, currentRoomNumber: selected };
  const affected = selected === null ? [] : getAffectedRoomNumbers(rooms, previewGuest);
  return <main className="room-screen"><header><div><p className="eyebrow">JUJU HOTEL · 객실 배치 전략</p><h1>{mode === 'move' ? '엘리너 객실 이동' : '투숙객 객실 배정'}</h1></div><div className="day-chip"><span>DAY {day}</span><small>빈 객실 {rooms.filter(isRoomSelectable).length} / 30</small></div></header><section className="room-layout"><div className="room-board"><HotelGrid rooms={rooms} selected={selected} affected={affected} onSelect={onSelect}/><div className="room-legend"><span>빈 객실</span><span>사용 중</span><span>Medical Care Zone</span></div></div><aside className="aura-preview"><span className="panel-label">투숙객 능력 미리보기</span><h2>{guest.name}</h2><p>{guest.role} · {guest.stayDuration}박 요청</p><div className="aura-card"><HeartPulse/><div><strong>Medical Care Zone</strong><p>배정 객실과 인접한 객실의 <b>일반 질병</b> 발생률을 0%로 설정합니다.</p></div></div><dl><div><dt>선택 객실</dt><dd>{selected ?? '선택 전'}</dd></div><div><dt>영향 객실</dt><dd>{affected.length ? affected.join(' · ') : '객실을 선택하세요'}</dd></div><div><dt>제외</dt><dd>괴물 감염 · 스토리 질병 · 부상</dd></div></dl><div className="assignment-actions"><Button variant="secondary" onClick={onCancel}>취소</Button><Button className="checkin" disabled={selected === null} onClick={onConfirm}>{mode === 'move' ? '이동 확정' : '체크인 확정'} <ChevronRight/></Button></div></aside></section></main>;
}

function HotelManagement({ day, rooms, guest, resources, onMove, onCheckout, onContinue }: { day:number; rooms:Room[]; guest:Guest; resources:GameState['resources']; onMove:()=>void; onCheckout:()=>void; onContinue:()=>void }) {
  const affected = getAffectedRoomNumbers(rooms, guest);
  return <main className="room-screen"><header><div><p className="eyebrow">JUJU HOTEL · 운영 현황</p><h1>객실 관리</h1></div><div className="day-chip"><span>DAY {day}</span><small>식량 {resources.food} · 물 {resources.water} · 연료 {resources.fuel}</small></div></header><section className="room-layout"><div className="room-board"><HotelGrid rooms={rooms} affected={affected}/></div><aside className="aura-preview"><span className="panel-label">현재 투숙객</span><h2>{guest.name} · {guest.currentRoomNumber}호</h2><p>남은 숙박 {guest.remainingNights}박</p><div className="aura-card active"><HeartPulse/><div><strong>Medical Care Zone 활성</strong><p>{affected.join(' · ')}호의 일반 질병 확률 0%</p></div></div><p className="system-note">오늘 밤 예상 소비: 식량 1 · 물 1 · 연료 1. 객실 이동 시 보호 범위가 즉시 다시 계산됩니다.</p><div className="management-actions"><Button variant="secondary" onClick={onMove}>객실 이동</Button><Button className="refuse" onClick={onCheckout}>체크아웃</Button><Button className="checkin" onClick={onContinue}>DAY {day} 종료 <ChevronRight/></Button></div></aside></section></main>;
}

function NightEvent({ day, decision, roomNumber, onContinue }: { day:number; decision: Exclude<Decision,null>; roomNumber:number|null; onContinue:()=>void }) {
  const accepted=decision==='checkin';
  return <main className="event-screen"><div className="event-light"/><Radio className="event-icon"/><p className="scene-index">DAY {day} · 오전 2:13</p><section><span>야간 사건 · {accepted?`${roomNumber}호`:'동쪽 철문'}</span><h1>{accepted?'문틈 아래의 불빛':'세 번의 노크, 그리고 침묵'}</h1><p>{accepted?'무언가 깨지는 소리에 호텔 전체가 깨어난다. 엘리너는 이미 복도에 나와 월터의 피 흘리는 옆구리를 두 손으로 누르고 있다. 그녀는 허락도 구하지 않고 약장을 연다. 동이 틀 무렵, 월터는 다시 안정적으로 숨을 쉰다.':'라디오에서 잡음과 함께 여자의 목소리가 흘러나온다. 해 뜰 무렵 철문에는 깨끗한 의료용 붕대가 묶여 있다. 진흙 위에는 발자국 하나 없다.'}</p><blockquote>{accepted?'“의사라는 증거를 원했죠.” — 엘리너':'같은 목소리가 한 번 더 말한다. “42마일 지점.”'}</blockquote><Button onClick={onContinue}>밤을 넘긴다 <ChevronRight/></Button></section></main>;
}

function MorningReport({ state, onNext, onReset }: { state:UiSave; onNext:()=>void; onReset:()=>void }) {
  const summary = state.lastDaySummary;
  const guest = state.guests.find((item) => item.id === ELEANOR_ID)!;
  const checkedOut = summary?.checkedOutGuestIds.includes(ELEANOR_ID) ?? false;
  return <main className="report-screen"><header><p className="eyebrow">JUJU HOTEL · 아침 장부</p><h1>DAY {state.day}</h1><span>오전 6:32 · 자동 저장 완료</span></header><section className="report-paper"><div className="stamp">{checkedOut?'숙박 종료':'야간 정산'}</div><p className="panel-label">간밤의 보고</p><h2>{checkedOut?'엘리너가 예정된 숙박을 마치고 떠났습니다.':guest.status === 'STAYING'?`${guest.currentRoomNumber}호 · 남은 숙박 ${guest.remainingNights}박`:'30개 객실이 모두 비어 있습니다.'}</h2><p>{state.decision === 'checkin'?'엘리너가 호텔 사람들의 경계 어린 관심을 얻었습니다. 객실 배치와 보호 범위는 다음 날에도 유지됩니다.':'동쪽 철문의 카메라가 잠시 꺼졌지만 침입 흔적은 발견되지 않았습니다.'}</p><div className="ledger-grid"><Result icon={BedDouble} label="투숙객" before={String(summary?.occupiedGuests ?? 0)} after={String(state.guests.filter((item)=>item.status==='STAYING').length)}/><Result icon={Soup} label="식량" before={`-${summary?.consumed.food ?? 0}`} after={String(state.resources.food)}/><Result icon={Droplets} label="물" before={`-${summary?.consumed.water ?? 0}`} after={String(state.resources.water)}/><Result icon={Fuel} label="연료" before={`-${summary?.consumed.fuel ?? 0}`} after={String(state.resources.fuel)}/></div><div className="consequence"><span>HOTEL LOG</span><strong>{state.eventHistory.at(-1)?.message ?? '특이사항 없음'}</strong><p>숙박기간, 객실 상태, Aura와 자원은 현재 DAY 저장에 포함됩니다.</p></div><footer><div><span>DAY {summary?.completedDay ?? state.day - 1} 완료</span><p>다음 날에도 객실 배치와 운영 결과가 이어집니다.</p></div><div className="report-actions"><Button variant="secondary" onClick={onReset}><RotateCcw/> 새 게임</Button><Button onClick={onNext}>DAY {state.day} 운영 계속 <ChevronRight/></Button></div></footer></section></main>;
}

function Result({icon:Icon,label,before,after,good}:{icon:typeof Fuel;label:string;before:string;after:string;good?:boolean}) { return <div className="ledger-item"><Icon/><span>{label}</span><s>{before}</s><strong className={good?'good':''}>{after}</strong></div>; }

function CampaignEnding({ state, onReset }: { state:UiSave; onReset:()=>void }) {
  const survivors = state.guests.filter((guest) => guest.status === 'STAYING').length;
  return <main className="event-screen"><div className="event-light"/><p className="scene-index">DAY 30 · 오전 6:32</p><section><span>30일 운영 기록</span><h1>아버지가 돌아왔다.</h1><p>철문 너머로 익숙한 세 번의 노크가 들립니다. 완성된 엔딩 평가는 후속 스토리 사이클에서 확장되지만, DAY 30 정산과 저장은 여기서 안전하게 종료됩니다.</p><blockquote>남은 식량 {state.resources.food} · 물 {state.resources.water} · 연료 {state.resources.fuel} · 현재 투숙객 {survivors}명</blockquote><Button onClick={onReset}><RotateCcw/> 새로운 30일 시작</Button></section></main>;
}
