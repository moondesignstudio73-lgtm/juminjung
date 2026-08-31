'use client';

import './aura.css';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  BedDouble, BookOpen, Brain, ChevronRight, CircleHelp, Droplets, Fuel, Handshake, HeartPulse,
  Inspect, PackageSearch, Radio, RotateCcw, Search, Shield, Soup, TriangleAlert, Utensils, Volume2, VolumeX, Wrench,
} from 'lucide-react';
import { getActiveAuraSynergies, getAffectedRoomNumbers, recalculateRoomEffects } from '@/game/aura-effect-manager';
import { shouldShowAuraOverlay, toggleAuraGuestId } from '@/game/aura-display';
import { getManagedGuest, getStayingGuestsForManagement } from '@/game/management-guest';
import { resolveDay } from '@/game/day-manager';
import { setGuestRoomFlags } from '@/game/event-manager';
import { createGuests, ELEANOR_ID } from '@/game/guest-data';
import { clearBrowserGame, createInitialGameState, loadBrowserGame, saveBrowserGame } from '@/game/save-manager';
import { assignGuest, checkoutGuest, getRoomOccupantLabel, isRoomSelectable, moveGuest } from '@/game/room-manager';
import { getActiveRelationships } from '@/game/relationship-manager';
import { completeEventStage } from '@/game/story-event-manager';
import { applyStoryChoice, canChooseStoryChoice, getPendingStoryChoice } from '@/game/story-choice-manager';
import { advanceEnding, getEndingCondition, getEndingNarrative, leaveEnding, startEnding } from '@/game/ending-manager';
import { ENDING_CONDITIONS } from '@/game/ending-data';
import { FACILITIES } from '@/game/facility-data';
import { buildFacility, canBuildFacility, performHotelAction } from '@/game/hotel-action-manager';
import { canChooseNightChoice, getEffectiveNightChoice, selectNightEvent } from '@/game/night-event-manager';
import { getHotelLogEntries } from '@/game/hotel-log-manager';
import { applyVisitorCheckInBenefits, getEligibleVisitor, getNextRevisitDay, getVisitorReaction, getVisitorReactionById, markVisitorRefused, prepareGuestCheckIn } from '@/game/visitor-manager';
import { getGuestVisualState, getNightEventPortraits, getStoryEventExpression } from '@/game/guest-visual-manager';
import { getCutscene } from '@/game/cutscene-data';
import { dismissCutscene } from '@/game/cutscene-manager';
import { normalizePrologueIndex, PROLOGUE_BEATS } from '@/game/prologue-data';
import { DEFAULT_FRONT_DESK_BACKGROUND } from '@/game/background-data';
import { beginSpriteLoad, canDisplaySprite, completeSpriteLoad, failSpriteLoad, shouldDisplaySpritePlaceholder, type SpriteLoadState } from '@/game/sprite-load-manager';
import { applyVisitorQuestionClue, getAvailableVisitorQuestions, getVisitorClueRule, getVisitorTraitLabel } from '@/game/visitor-clue-data';
import type { AuraDefinition, FacilityId, GameState, Guest, GuestExpression, HotelActionId, Room } from '@/game/types';

type UiSave = GameState & { prologue: number };
const makeInitial = (): UiSave => ({ ...createInitialGameState(), prologue: 0 });
const routeToNight = (state:UiSave):UiSave => { const pending = getPendingStoryChoice(state); return { ...state, phase: pending ? 'story' : 'night', pendingStoryEventId: pending?.id ?? null }; };

const itemIcons = { FOOD: Soup, FUEL: Fuel, MEDICINE: HeartPulse, VALUABLE: PackageSearch, INFORMATION: Inspect } as const;

export default function Home() {
  const [save, setSave] = useState<UiSave>(makeInitial);
  const [hydrated, setHydrated] = useState(false);
  const [dialogue, setDialogue] = useState('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [muted, setMuted] = useState(false);
  const [managedGuestId, setManagedGuestId] = useState<string | null>(null);
  const eligibleVisitor = getEligibleVisitor(save.guests, save.day, save.flags);
  const isReturningVisitor = eligibleVisitor?.status === 'CHECKED_OUT';
  const visitor = eligibleVisitor ?? save.guests.find((guest) => guest.status === 'STAYING') ?? save.guests[0];
  const visitorReaction = eligibleVisitor && !isReturningVisitor ? getVisitorReaction(save, eligibleVisitor) : null;
  const stayingGuests = getStayingGuestsForManagement(save.guests);
  const managedGuest = getManagedGuest(save.guests, managedGuestId) ?? visitor;
  const activeCutscene = getCutscene(save.activeCutsceneId);

  useEffect(() => {
    const restored = loadBrowserGame();
    setSave({ ...restored, prologue: normalizePrologueIndex((restored as GameState & { prologue?: number }).prologue) });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && save.phase !== 'title') saveBrowserGame(save);
  }, [save, hydrated]);

  useEffect(() => {
    if (save.phase === 'desk' && eligibleVisitor) setDialogue(isReturningVisitor ? `“길 위에서 다시 돌아왔습니다. 이번에도 ${eligibleVisitor.stayDuration}박을 부탁하죠. 지난번처럼 값을 치르겠습니다.”` : visitorReaction?.dialogue ?? `“${eligibleVisitor.introDialogue}”`);
  }, [save.phase, save.day, eligibleVisitor?.id, isReturningVisitor, visitorReaction?.id]);

  const update = (patch: Partial<UiSave>) => setSave((current) => ({ ...current, ...patch }));
  const reset = () => { clearBrowserGame(); setSave(makeInitial()); setDialogue(''); setSelectedItem(null); setManagedGuestId(null); };
  const ask = (question: Guest['questions'][number]) => {
    const result = applyVisitorQuestionClue(save.guests, visitor.id, question.id, save.inspected);
    update({ guests:result.guests, asked: [...new Set([...save.asked, question.id])] });
    setDialogue(`“${question.answer}”${result.applied&&result.rule?`\n\n[확인된 단서] ${result.rule.finding}`:''}`); setShowQuestions(false);
  };
  const inspect = (id: string) => {
    update({ inspected: [...new Set([...save.inspected, id])] }); setSelectedItem(id);
  };
  const refuse = () => setSave((current) => routeToNight({ ...current, guests: markVisitorRefused(current.guests, visitor.id, current.day), eventHistory: [...current.eventHistory, { day: current.day, type: 'EVENT', message: `${visitor.name} · ${visitor.status === 'CHECKED_OUT' ? '재입실 거절' : '입실 거절'}` }], decision: 'refuse', pendingVisitorReactionId: null }));
  const openAssignment = (mode: 'checkin' | 'move') => update({ phase: 'assignment', assignmentMode: mode, selectedRoomNumber: null, pendingVisitorReactionId: mode === 'checkin' ? visitorReaction?.id ?? null : null });
  const confirmRoom = () => {
    if (save.selectedRoomNumber === null) return;
    const assignmentGuest = save.assignmentMode === 'move' ? managedGuest : visitor;
    const reaction = save.assignmentMode === 'checkin' ? getVisitorReactionById(assignmentGuest, save.pendingVisitorReactionId) : null;
    const positionedGuests = save.assignmentMode === 'checkin' ? prepareGuestCheckIn(save.guests, assignmentGuest.id, save.selectedRoomNumber, save.day, save.flags) : save.guests.map((guest) => guest.id === assignmentGuest.id ? {
      ...guest,
      currentRoomNumber: save.selectedRoomNumber,
      status: 'STAYING' as const,
      remainingNights: guest.remainingNights,
    } : guest);
    const benefits = save.assignmentMode === 'checkin'
      ? applyVisitorCheckInBenefits(save.resources, positionedGuests, assignmentGuest.id, save.negotiated, reaction)
      : { resources: save.resources, guests: positionedGuests, applied: false };
    const arrival = save.assignmentMode === 'checkin' ? completeEventStage(benefits.guests, assignmentGuest.id, 'ARRIVAL') : { guests: benefits.guests, entry: null };
    const guests = arrival.guests;
    const positioned = save.assignmentMode === 'move'
      ? moveGuest(save.rooms, assignmentGuest.id, save.selectedRoomNumber)
      : assignGuest(save.rooms, save.selectedRoomNumber, assignmentGuest.id);
    const roomFlags = assignmentGuest.id === ELEANOR_ID ? setGuestRoomFlags(save.flags, save.selectedRoomNumber) : save.flags;
    const reactionApplied = benefits.applied && reaction;
    setManagedGuestId(assignmentGuest.id);
    update({
      guests,
      rooms: recalculateRoomEffects(positioned, guests),
      flags: reactionApplied ? { ...roomFlags, [`visitor_reaction_${assignmentGuest.id}_${reactionApplied.id}`]: true } : roomFlags,
      resources: benefits.resources,
      eventHistory: save.assignmentMode === 'checkin' ? [...save.eventHistory, { day: save.day, type: 'CHECK_IN' as const, message: `${visitor.name} · ${save.selectedRoomNumber}호 ${isReturningVisitor ? '재체크인' : '체크인'}` }, ...(reactionApplied ? [{ day: save.day, type: 'EVENT' as const, message: `세력 반응 · ${visitor.name} · ${reactionApplied.label}` }] : []), ...(arrival.entry ? [{ ...arrival.entry, day: save.day }] : [])] : save.eventHistory,
      decision: 'checkin', phase: 'management', assignmentMode: null, selectedRoomNumber: null, pendingVisitorReactionId: null,
    });
  };
  const checkout = () => {
    const guests = save.guests.map((guest) => guest.id === managedGuest.id ? { ...guest, currentRoomNumber: null, status: 'CHECKED_OUT' as const, remainingNights: 0, storyFlags: { ...guest.storyFlags, last_checked_out_day: save.day, next_revisit_day: getNextRevisitDay(save.day) } } : guest);
    update({ guests, rooms: recalculateRoomEffects(checkoutGuest(save.rooms, managedGuest.id), guests), flags: managedGuest.id === ELEANOR_ID ? setGuestRoomFlags(save.flags, null) : save.flags, eventHistory: [...save.eventHistory, { day: save.day, type: 'CHECK_OUT', message: `${managedGuest.name} · 수동 체크아웃` }], decision: null, phase: 'desk' });
  };

  if (!hydrated) return <LobbyLoading />;
  if (activeCutscene) return <StoryCutscene day={save.day} cutscene={activeCutscene} onContinue={() => setSave((current) => ({ ...dismissCutscene(current), prologue: current.prologue }))} />;
  if (save.phase === 'title') return <TitleScreen onStart={() => update({ phase: 'prologue' })} muted={muted} setMuted={setMuted} />;
  if (save.phase === 'prologue') {
    const beat = PROLOGUE_BEATS[save.prologue];
    return (
      <main className="cinematic-screen prologue-cutscene">
        <img src={beat.image} alt={beat.imageAlt} />
        <div className="cutscene-rain" aria-hidden="true" />
        <div className="cinematic-wash" />
        <p className="scene-index">{beat.tag}</p>
        <section className="cutscene-copy" aria-live="polite">
          <span>{beat.speaker}</span><p>{beat.line}</p>
          <Button className="advance" onClick={() => save.prologue < PROLOGUE_BEATS.length - 1 ? update({ prologue: save.prologue + 1 }) : update({ phase: 'desk', day: 1 })}>
            {save.prologue < PROLOGUE_BEATS.length - 1 ? '계속' : '문을 연다'} <ChevronRight />
          </Button>
        </section>
        {save.prologue===PROLOGUE_BEATS.length-1&&<div className="knock" aria-hidden="true">똑.<br/>똑.<br/>똑.</div>}
      </main>
    );
  }
  if (save.phase === 'assignment') return <RoomAssignment day={save.day} rooms={save.rooms} guest={save.assignmentMode === 'move' ? managedGuest : visitor} selected={save.selectedRoomNumber} mode={save.assignmentMode!} onSelect={(roomNumber) => update({ selectedRoomNumber: roomNumber })} onConfirm={confirmRoom} onCancel={() => update({ phase: save.assignmentMode === 'move' ? 'management' : 'desk', assignmentMode: null, selectedRoomNumber: null, pendingVisitorReactionId: null })} />;
  if (save.phase === 'management') return <HotelManagement state={save} guest={managedGuest} stayingGuests={stayingGuests} hasStayingGuest={stayingGuests.length > 0} onSelectGuest={setManagedGuestId} onBuild={(id) => setSave((current) => ({ ...buildFacility(current, id).state, prologue: current.prologue }))} onAction={(id) => setSave((current) => ({ ...performHotelAction(current, id).state, prologue: current.prologue }))} onMove={() => openAssignment('move')} onCheckout={checkout} onContinue={() => setSave((current) => routeToNight(current))} />;
  if (save.phase === 'story') return <StoryChoiceScene state={save} onChoose={(eventId,choiceId) => setSave((current) => routeToNight({ ...applyStoryChoice(current,eventId,choiceId).state, prologue:current.prologue }))} />;
  if (save.phase === 'night') return <NightEvent state={save} onChoose={(eventId,choiceId) => setSave((current) => ({ ...resolveDay({ ...current, selectedNightEventId:eventId, selectedNightChoiceId:choiceId }), prologue: current.prologue }))} />;
  if (save.phase === 'report') return <MorningReport state={save} onStartEnding={(endingId) => setSave((current)=>({ ...startEnding(current,endingId), prologue:current.prologue }))} onNext={() => { const nextVisitor = getEligibleVisitor(save.guests, save.day, save.flags); const staying = save.guests.some((guest) => guest.status === 'STAYING'); update({ phase: nextVisitor ? 'desk' : staying ? 'management' : 'desk', decision: staying ? 'checkin' : null, asked: [], inspected: [], negotiated: false, held: false }); if (nextVisitor) setDialogue(nextVisitor.introDialogue); }} onReset={reset} />;
  if (save.phase === 'ending') return <CampaignEnding state={save} onReturn={() => setSave((current)=>({ ...leaveEnding(current), prologue:current.prologue }))} onAdvance={() => setSave((current)=>current.activeEndingId?({ ...advanceEnding(current), prologue:current.prologue }):current)} />;

  if (!eligibleVisitor) return <QuietDesk day={save.day} resources={save.resources} staying={save.guests.filter((guest)=>guest.status==='STAYING').length} onManage={() => update({ phase: 'management' })} onEnd={() => setSave((current) => routeToNight({ ...current, decision:'refuse' }))} />;
  const availableItems = visitor.offeredItems.filter((item) => !item.negotiatedOnly || save.negotiated);
  const availableQuestions = getAvailableVisitorQuestions(visitor, save.inspected);
  const detail = visitor.offeredItems.find((item) => item.id === selectedItem);
  const detailClue = detail ? getVisitorClueRule(visitor.id,'ITEM',detail.id) : null;
  const unlockedQuestion = detailClue?.unlocksQuestionId ? visitor.questions.find((question)=>question.id===detailClue.unlocksQuestionId) : null;
  const DetailIcon = detail ? itemIcons[detail.type] : Inspect;
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
        <div className="frontdesk-background"><img src={DEFAULT_FRONT_DESK_BACKGROUND.image} alt={DEFAULT_FRONT_DESK_BACKGROUND.alt} /></div>
        <div className="frontdesk-environment" aria-hidden="true"><div className="lobby-rain" /></div>
        <div className="scene-vignette" />
        <div className="visitor-layer"><CharacterSprite guest={visitor} context="desk" /></div>
        <aside className="case-file left-panel">
          <span className="panel-label">방문자 · {visitor.id.toUpperCase()}</span><h2>{visitor.name}</h2><p>{visitor.age}세 · {visitor.role}</p>
          <dl>
            <div><dt>요청</dt><dd>{visitor.stayDuration}박</dd></div><div><dt>상태</dt><dd>{visitor.conditionLabel} · {getGuestVisualState(visitor).label}</dd></div>
            <div><dt>위험도</dt><dd>{visitor.riskLevel}</dd></div>
          </dl>
          <div className="clue-count">단서 {save.asked.length + save.inspected.length} / {visitor.questions.length + visitor.offeredItems.length}<small>숨겨진 특성은 조사 전 표시되지 않습니다.</small></div>
          {visitor.discoveredTraits.length>0&&<div className="verified-traits"><span>확인된 특성</span>{visitor.discoveredTraits.map((trait)=><b key={trait}>{getVisitorTraitLabel(visitor.id,trait)}</b>)}</div>}
          {visitorReaction&&<div className="faction-reaction"><span>{visitorReaction.faction.toUpperCase()} REACTION</span><strong>{visitorReaction.label}</strong><small>Trust {visitorReaction.trustDelta>0?'+':''}{visitorReaction.trustDelta}{visitorReaction.offerBonus?' · 추가 제안 있음':''}</small></div>}
        </aside>
        <aside className="hotel-status right-panel">
          <span className="panel-label">야간 장부 · 자원 점수</span><strong>{save.rooms.filter(isRoomSelectable).length}</strong><small>빈 객실 · 총 30실</small>
          <Status icon={Fuel} label="연료" value={save.resources.fuel}/><Status icon={Soup} label="식량" value={save.resources.food}/><Status icon={Shield} label="보안" value={save.resources.security}/>
        </aside>

        <div className="item-tray" aria-label="제시한 물품">
          {availableItems.map(({ id, type, name }) => { const Icon = itemIcons[type]; return <button key={id} className={save.inspected.includes(id) ? 'item inspected' : 'item'} onClick={() => inspect(id)}><Icon/><span>{name}</span><small>{save.inspected.includes(id) ? '조사 완료' : '조사'}</small></button>; })}
        </div>

        <div className="dialogue-card">
          <div className="speaker"><Radio size={15}/> {visitor.name}</div><p>{dialogue}</p>
          <div className="action-row">
            <Button variant="secondary" onClick={() => setShowQuestions(!showQuestions)}><CircleHelp/> 질문</Button>
            <Button variant="secondary" onClick={() => { setDialogue('카운터 위 물건을 선택하세요. 사람보다 소지품이 더 솔직할 때가 있습니다.'); }}><PackageSearch/> 조사</Button>
            <Button variant="secondary" title="추가 숙박 대가를 요구합니다." disabled={save.negotiated} onClick={() => { update({ negotiated:true }); setDialogue(`“${visitor.negotiationDialogue}”`); }}><Droplets/> 협상</Button>
            <Button variant="secondary" title="방문자를 현관 안쪽에 잠시 대기시킵니다." disabled={save.held} onClick={() => { update({ held:true }); setDialogue('꺼져가는 현관등 아래 그녀를 잠시 대기시킨다. 등 뒤 유리문에서 무언가 한 번 길게 긁히는 소리가 난다.'); }}><Radio/> 보류</Button>
          </div>
          {showQuestions && <div className="question-menu">{availableQuestions.map((q) => <button key={q.id} className={save.asked.includes(q.id) ? 'asked' : ''} onClick={() => ask(q)}>{q.label}<ChevronRight/></button>)}{availableQuestions.length<visitor.questions.length&&<small className="locked-question-hint">물품을 조사하면 추가 질문이 열립니다.</small>}</div>}
        </div>
        <div className="decision-bar">
          <p><span>호텔 규칙 01</span> 이 문을 통과한 모든 사람은 당신의 책임입니다.</p>
          <Button className="refuse" onClick={refuse}>거절</Button>
          <Button className="checkin" onClick={() => openAssignment('checkin')}><BedDouble/> 체크인 · 객실 선택</Button>
        </div>
      </section>

      {detail && <div className="modal-backdrop" onClick={() => setSelectedItem(null)}><section className="item-modal" role="dialog" aria-modal="true" aria-labelledby="item-title" onClick={(e) => e.stopPropagation()}><span className="panel-label">조사 기록 · {detail.id.toUpperCase()}</span><DetailIcon/><h2 id="item-title">{detail.name}</h2><p>{detail.short}</p><blockquote>{detail.detail}</blockquote>{detailClue&&<div className="clue-unlock"><strong>새 단서</strong><p>{detailClue.finding}</p>{unlockedQuestion&&<small>질문 해금 · {unlockedQuestion.label}</small>}</div>}<Button onClick={() => setSelectedItem(null)}>프런트로 돌아가기</Button></section></div>}
    </main>
  );
}

function Status({ icon: Icon, label, value }: { icon: typeof Fuel; label: string; value: number }) {
  return <div className="resource-line"><Icon/><span>{label}</span><i><b style={{width:`${value}%`}} /></i><em>{value}</em></div>;
}

function CharacterSprite({ guest, context, expression }: { guest: Guest; context: 'desk' | 'story' | 'event-left' | 'event-right'; expression?: GuestExpression }) {
  const visual = getGuestVisualState(guest, expression);
  const requestedAsset = visual.asset ?? null;
  const [loadState, setLoadState] = useState<SpriteLoadState>(() => beginSpriteLoad(requestedAsset));

  useEffect(() => {
    let active = true;
    setLoadState(beginSpriteLoad(requestedAsset));
    if (!requestedAsset) { setLoadState(failSpriteLoad(null)); return () => { active = false; }; }
    const image = new Image();
    image.onload = async () => {
      try { await image.decode(); } catch { /* onload already confirmed usable image data */ }
      if (active) setLoadState(completeSpriteLoad(requestedAsset));
    };
    image.onerror = () => { if (active) setLoadState(failSpriteLoad(requestedAsset)); };
    image.src = requestedAsset;
    return () => { active = false; image.onload = null; image.onerror = null; };
  }, [guest.id, requestedAsset]);

  if (!canDisplaySprite(requestedAsset, loadState)) {
    if (!shouldDisplaySpritePlaceholder(requestedAsset, loadState)) return null;
    return <figure className={`character-sprite ${context} sprite-placeholder`} aria-label={`${guest.name} 방문객 이미지 로드 실패`}><div className="generic-silhouette" aria-hidden="true"/><figcaption>방문객 이미지 없음</figcaption></figure>;
  }
  return <figure className={`character-sprite ${context} expression-${visual.expression} ${visual.modifiers.map((item)=>`state-${item.toLowerCase()}`).join(' ')}`} data-expression={visual.expression} aria-label={`${guest.name} · ${visual.label}`}>
    <img className="sprite-ready" src={requestedAsset!} alt={`${guest.name}의 ${visual.expression} 표정 반신 일러스트`} onError={() => setLoadState(failSpriteLoad(requestedAsset))} />
    <figcaption>{visual.label}</figcaption>
  </figure>;
}

function TitleScreen({ onStart, muted, setMuted }: { onStart:()=>void; muted:boolean; setMuted:(v:boolean)=>void }) {
  return <main className="title-screen"><img src={DEFAULT_FRONT_DESK_BACKGROUND.image} alt={DEFAULT_FRONT_DESK_BACKGROUND.alt}/><div className="title-wash"/><button className="sound-corner" onClick={()=>setMuted(!muted)} aria-label="소리 전환">{muted?<VolumeX/>:<Volume2/>}</button><section className="title-lockup"><p>선택형 호텔 생존 스토리</p><h1><span>MAY I HAVE</span>A ROOM?</h1><div className="neon-rule"/><p className="title-tagline">30개 객실 · 이 호텔이 어떤 곳이 될지는 당신의 선택</p><Button className="start-button" onClick={onStart}>DAY 0 시작<ChevronRight/></Button><small>진행 상황은 매 장면마다 이 기기에 자동 저장됩니다.</small></section></main>;
}

function LobbyLoading() {
  return <main className="lobby-loading" aria-label="저장된 방문객 불러오는 중"><img src={DEFAULT_FRONT_DESK_BACKGROUND.image} alt={DEFAULT_FRONT_DESK_BACKGROUND.alt}/><div className="scene-vignette"/><span>방문 기록 확인 중…</span></main>;
}

const ROOM_GUEST_CATALOG = createGuests();
const AURA_ICONS:Record<AuraDefinition['icon'],typeof HeartPulse> = {'heart-pulse':HeartPulse,wrench:Wrench,shield:Shield,utensils:Utensils,brain:Brain,'triangle-alert':TriangleAlert,'circle-help':CircleHelp,handshake:Handshake,search:Search};

function AuraGlyph({ aura, size=12 }: { aura:AuraDefinition; size?:number }) { const Icon=AURA_ICONS[aura.icon]; return <Icon size={size} aria-hidden="true"/>; }

function HotelGrid({ rooms, auraDefinition, auraMode='ambient', selected, affected, onSelect }: { rooms: Room[]; auraDefinition?:AuraDefinition|null; auraMode?:'preview'|'ambient'; selected?: number | null; affected?: number[]; onSelect?: (roomNumber:number)=>void }) {
  const aura = new Set(affected ?? []);
  return <div className="hotel-cutaway" role="grid" aria-label="JUJU HOTEL 30개 객실 배치도">{[3,2,1].map((floor) => <div className="hotel-floor" role="row" key={floor}><strong>{floor}F</strong><div className="room-row">{rooms.filter((room) => room.floor === floor).map((room) => {
    const affectedByAura = aura.has(room.roomNumber) && Boolean(auraDefinition);
    const className = ['room-cell', room.status.toLowerCase(), selected === room.roomNumber ? 'selected' : '', affectedByAura ? `aura aura-${auraDefinition!.category.toLowerCase()} aura-${auraMode}` : ''].join(' ');
    const content = <><b>{room.roomNumber}</b><span>{getRoomOccupantLabel(room, ROOM_GUEST_CATALOG)}</span>{affectedByAura && <i title={auraDefinition!.name}><AuraGlyph aura={auraDefinition!}/><em>{auraDefinition!.shortLabel}</em></i>}</>;
    return onSelect
      ? <button type="button" role="gridcell" key={room.roomNumber} disabled={!isRoomSelectable(room)} onClick={() => onSelect(room.roomNumber)} className={className}>{content}</button>
      : <div role="gridcell" key={room.roomNumber} className={className}>{content}</div>;
  })}</div></div>)}</div>;
}

function RoomAssignment({ day, rooms, guest, selected, mode, onSelect, onConfirm, onCancel }: { day:number; rooms:Room[]; guest:Guest; selected:number|null; mode:'checkin'|'move'; onSelect:(roomNumber:number)=>void; onConfirm:()=>void; onCancel:()=>void }) {
  const previewGuest = { ...guest, currentRoomNumber: selected };
  const affected = selected === null ? [] : getAffectedRoomNumbers(rooms, previewGuest);
  const showAura = shouldShowAuraOverlay('assignment');
  return <main className="room-screen">
    <header><div><p className="eyebrow">JUJU HOTEL · 객실 배치 전략</p><h1>{guest.name} 객실 {mode==='move'?'이동':'배정'}</h1></div><div className="day-chip"><span>DAY {day}</span><small>빈 객실 {rooms.filter(isRoomSelectable).length} / 30</small></div></header>
    <section className="room-layout"><div className="room-board"><HotelGrid rooms={rooms} auraDefinition={showAura?guest.aura:null} auraMode="preview" selected={selected} affected={showAura?affected:[]} onSelect={onSelect}/><div className="room-legend"><span>빈 객실</span><span>사용 중</span><span>{guest.aura?.name??'Aura 없음'}</span></div></div>
    <aside className="aura-preview"><span className="panel-label">투숙객 능력 미리보기</span><h2>{guest.name}</h2><p>{guest.role} · {guest.stayDuration}박 요청</p>
      {guest.aura?<div className={`aura-card aura-${guest.aura.category.toLowerCase()}`}><AuraGlyph aura={guest.aura} size={20}/><div><strong>{guest.aura.name}</strong><p>{guest.aura.description}</p></div></div>:<p className="system-note">이 투숙객은 현재 객실 Aura가 없습니다. 관계와 숨겨진 특성은 이후 사건에 영향을 줍니다.</p>}
      <dl><div><dt>선택 객실</dt><dd>{selected??'선택 전'}</dd></div><div><dt>영향 객실</dt><dd>{affected.length?affected.join(' · '):guest.aura?'객실을 선택하세요':'없음'}</dd></div><div><dt>Health / Stress / Trust</dt><dd>{guest.health} / {guest.stress} / {guest.trust}</dd></div></dl>
      <div className="assignment-actions"><Button variant="secondary" onClick={onCancel}>취소</Button><Button className="checkin" disabled={selected===null} onClick={onConfirm}>{mode==='move'?'이동 확정':'체크인 확정'} <ChevronRight/></Button></div>
    </aside></section>
  </main>;
}

function HotelManagement({ state, guest, stayingGuests, hasStayingGuest, onSelectGuest, onBuild, onAction, onMove, onCheckout, onContinue }: { state:UiSave; guest:Guest; stayingGuests:Guest[]; hasStayingGuest:boolean; onSelectGuest:(guestId:string)=>void; onBuild:(id:FacilityId)=>void; onAction:(id:HotelActionId)=>void; onMove:()=>void; onCheckout:()=>void; onContinue:()=>void }) {
  const [auraGuestId, setAuraGuestId] = useState<string | null>(null);
  const affected = hasStayingGuest ? getAffectedRoomNumbers(state.rooms, guest) : [];
  const auraRequested = auraGuestId === guest.id;
  const showAura = shouldShowAuraOverlay('management', auraRequested) && hasStayingGuest && Boolean(guest.aura);
  const relationships = getActiveRelationships(state.rooms, state.guests);
  const synergies = getActiveAuraSynergies(state.rooms, state.guests);
  return <main className="room-screen">
    <header><div><p className="eyebrow">JUJU HOTEL · 운영 현황</p><h1>객실·시설 관리</h1></div><div className="day-chip"><span>DAY {state.day}</span><small>행동 {state.actionPoints}/{state.maxActionPoints} · 부품 {state.resources.parts}</small></div></header>
    <section className="room-layout"><div className="room-board"><div className="room-board-toolbar"><span>Aura 범위는 필요할 때만 객실 위에 표시됩니다.</span><Button variant="secondary" aria-label="Aura 범위 표시" aria-pressed={showAura} disabled={!hasStayingGuest||!guest.aura} onClick={()=>setAuraGuestId((visibleGuestId)=>toggleAuraGuestId(visibleGuestId,guest.id))}>{guest.aura&&<AuraGlyph aura={guest.aura} size={14}/>} Aura 범위 <small>{showAura?'표시 중':'숨김'}</small></Button></div><HotelGrid rooms={state.rooms} auraDefinition={showAura?guest.aura:null} auraMode="ambient" affected={showAura?affected:[]}/><div className="operations-panel"><span className="panel-label">낮 행동</span><div className="operation-grid"><Button disabled={state.actionPoints<1||state.resources.parts<2} onClick={()=>onAction('repair_hotel')}>호텔 보수 · 부품 2</Button><Button disabled={state.actionPoints<1} onClick={()=>onAction('community_outreach')}>공동체 회의</Button><Button disabled={state.actionPoints<1||state.resources.fuel<1} onClick={()=>onAction('security_patrol')}>경계 순찰 · 연료 1</Button><Button disabled={state.actionPoints<1||state.resources.fuel<2} onClick={()=>onAction('trade_run')}>교역 원정 · 연료 2</Button></div><span className="panel-label">시설 건설 · 업그레이드</span><div className="facility-grid">{FACILITIES.map((facility)=>{const level=state.facilities[facility.id]??0;const active=level?facility.levels[level-1]:null;const next=facility.levels[level];return <article key={facility.id} className={level?'built':''}><strong>{facility.name} · LV.{level}</strong><p>{active?active.description:facility.description}{next&&<><br/><em>다음: {next.name} · {next.description}</em></>}</p><small>{next?Object.entries(next.cost).map(([key,value])=>`${key} ${value}`).join(' · '):'최고 단계 · 안정 가동'}</small><Button disabled={!canBuildFacility(state,facility.id)} onClick={()=>onBuild(facility.id)}>{!next?'MAX':level?'강화':'건설'}</Button></article>})}</div></div></div>
      <aside className="aura-preview">
        <span className="panel-label">{hasStayingGuest?'현재 투숙객':'호텔 운영'}</span>
        {hasStayingGuest&&<label className="resident-selector"><span>관리할 투숙객</span><select aria-label="관리할 투숙객" value={guest.id} onChange={(event)=>onSelectGuest(event.target.value)}>{stayingGuests.map((resident)=><option key={resident.id} value={resident.id}>{resident.name} · {resident.currentRoomNumber}호 · {resident.remainingNights}박</option>)}</select></label>}
        <h2>{hasStayingGuest?`${guest.name} · ${guest.currentRoomNumber}호`:'현재 투숙객 없음'}</h2><p>{hasStayingGuest?`${guest.role} · 남은 숙박 ${guest.remainingNights}박`:'빈 호텔에서도 낮 행동과 시설 건설을 진행할 수 있습니다.'}</p>{hasStayingGuest&&guest.aura?<div className={`aura-card active aura-${guest.aura.category.toLowerCase()}`}><AuraGlyph aura={guest.aura} size={20}/><div><strong>{guest.aura.name} 활성</strong><p>{guest.aura.description}<br/>{affected.length?`영향 객실 ${affected.join(' · ')}`:'영향 범위 없음'}</p></div></div>:<p className="system-note">{hasStayingGuest?'객실 Aura 없음 · 관계 이벤트 대상':'다음 방문자를 기다리며 호텔을 정비하십시오.'}</p>}<dl><div><dt>호텔 상태</dt><dd>{state.hotelStats.hotelCondition}</dd></div><div><dt>Security</dt><dd>{state.hotelStats.security}</dd></div><div><dt>공동체 / 군 / 상인</dt><dd>{state.reputations.community} / {state.reputations.military} / {state.reputations.merchant}</dd></div><div><dt>활성 관계</dt><dd>{relationships.length}</dd></div><div><dt>Aura 시너지</dt><dd>{synergies.map((item)=>item.name).join(' · ')||'없음'}</dd></div></dl><p className="system-note">{state.eventHistory.at(-1)?.message??'행동을 선택하면 시설·평판·엔딩 경로가 변화합니다.'}</p><div className="management-actions"><Button variant="secondary" disabled={!hasStayingGuest} onClick={onMove}>객실 이동</Button><Button className="refuse" disabled={!hasStayingGuest} onClick={onCheckout}>체크아웃</Button><Button className="checkin" onClick={onContinue}>DAY {state.day} 종료 <ChevronRight/></Button></div>
      </aside>
    </section>
  </main>;
}

function NightEvent({ state, onChoose }: { state:UiSave; onChoose:(eventId:string,choiceId:string)=>void }) {
  const event = selectNightEvent(state);
  const portraits = getNightEventPortraits(event.id);
  const leftGuest = portraits ? state.guests.find((guest)=>guest.id===portraits[0].guestId) : undefined;
  const rightGuest = portraits ? state.guests.find((guest)=>guest.id===portraits[1].guestId) : undefined;
  return <main className="event-screen"><div className="event-light"/><Radio className="event-icon"/>{leftGuest&&<CharacterSprite guest={leftGuest} context="event-left" expression={portraits?.[0].expression}/>} {rightGuest&&<CharacterSprite guest={rightGuest} context="event-right" expression={portraits?.[1].expression}/>}<p className="scene-index">DAY {state.day} · 오전 2:13 · THREAT {String(state.flags.monster_threat??0)}</p><section><span>야간 사건 · {state.worldState}</span><h1>{event.title}</h1><p>{event.description}</p><blockquote>{event.quote}</blockquote><div className="night-choices">{event.choices.map((baseChoice)=>{const choice=getEffectiveNightChoice(state,baseChoice);return <Button key={choice.id} disabled={!canChooseNightChoice(state,baseChoice)} onClick={()=>onChoose(event.id,choice.id)}><span>{choice.label}</span><small>{choice.description}</small><ChevronRight/></Button>})}</div></section></main>;
}

function StoryChoiceScene({ state, onChoose }: { state:UiSave; onChoose:(eventId:string,choiceId:string)=>void }) {
  const event = getPendingStoryChoice(state);
  const guest = state.guests.find((item)=>item.id===event?.guestId);
  if (!event || !guest) return <main className="event-screen"><section><h1>스토리 기록을 확인할 수 없습니다.</h1></section></main>;
  return <main className="event-screen story-event"><div className="event-light"/><CharacterSprite guest={guest} context="story" expression={getStoryEventExpression(event.id)}/><p className="scene-index">DAY {state.day} · {guest.name} · {event.stage==='CONFLICT'?'갈등':'결말'}</p><section><span>NPC STORY EVENT</span><h1>{event.title}</h1><p>{event.description}</p><blockquote>{event.quote}</blockquote><div className="night-choices">{event.choices.map((choice)=><Button key={choice.id} disabled={!canChooseStoryChoice(state,choice)} onClick={()=>onChoose(event.id,choice.id)}><span>{choice.label}</span><small>{choice.description}</small><ChevronRight/></Button>)}</div></section></main>;
}

function StoryCutscene({ day, cutscene, onContinue }: { day:number; cutscene:NonNullable<ReturnType<typeof getCutscene>>; onContinue:()=>void }) {
  return <main className="cinematic-screen story-cutscene">
    <img src={cutscene.image} alt={cutscene.imageAlt}/><div className="cutscene-rain" aria-hidden="true"/><div className="cinematic-wash"/><div className="cutscene-flicker" aria-hidden="true"/>
    <p className="scene-index">DAY {Math.max(1,day-1)} · {cutscene.kicker}</p>
    <section className="cutscene-copy" aria-live="polite"><span>JUJU HOTEL · 사건 기록</span><h1>{cutscene.title}</h1><p>{cutscene.body}</p><blockquote>“{cutscene.quote}”</blockquote><Button className="advance" onClick={onContinue}>아침 장부로 <ChevronRight/></Button></section>
  </main>;
}

function MorningReport({ state, onNext, onReset, onStartEnding }: { state:UiSave; onNext:()=>void; onReset:()=>void; onStartEnding:(endingId:GameState['availableEndings'][number])=>void }) {
  const [journalOpen,setJournalOpen] = useState(false);
  const [logFilter,setLogFilter] = useState<'ALL'|'CHECK_IN'|'CHECK_OUT'|'RESOURCE'|'EVENT'>('ALL');
  const summary = state.lastDaySummary;
  const staying = state.guests.filter((guest) => guest.status==='STAYING');
  const departed = summary?.checkedOutGuestIds.map((id)=>state.guests.find((guest)=>guest.id===id)?.name??id)??[];
  const visibleEndings = state.availableEndings.map(getEndingCondition).filter(Boolean);
  const destinyRoutes = ENDING_CONDITIONS.filter((ending)=>!ending.hidden||state.endingProgress[ending.endingId]!=='UNKNOWN').sort((a,b)=>b.priority-a.priority);
  const hasUnknownRoute = ENDING_CONDITIONS.some((ending)=>ending.hidden&&(state.endingProgress[ending.endingId]??'UNKNOWN')==='UNKNOWN');
  const relationshipLog = state.eventHistory.filter((entry)=>entry.relationshipChanges?.length).slice(-3).reverse();
  const guestName = (id:string)=>state.guests.find((guest)=>guest.id===id)?.name??id;
  const journalEntries = getHotelLogEntries(state.eventHistory,logFilter);
  return <main className="report-screen">
    <header><p className="eyebrow">JUJU HOTEL · 아침 장부</p><h1>DAY {state.day}</h1><span>WORLD STATE · {state.worldState}</span></header>
    <section className="report-paper"><div className="stamp">{departed.length?'숙박 종료':'야간 정산'}</div><p className="panel-label">현재 목표</p><h2>호텔을 지키고, 아버지에게 무슨 일이 있었는지 밝혀내십시오.</h2><p>DAY는 호텔이 버틴 시간의 기록입니다. 정해진 마지막 날은 없습니다.</p>
      <div className="ledger-grid"><Result icon={BedDouble} label="투숙객" before={String(summary?.occupiedGuests??0)} after={String(staying.length)}/><Result icon={Soup} label="식량" before={`-${summary?.consumed.food??0}`} after={String(state.resources.food)}/><Result icon={Droplets} label="물" before={`-${summary?.consumed.water??0}`} after={String(state.resources.water)}/><Result icon={Fuel} label="연료" before={`-${summary?.consumed.fuel??0}`} after={String(state.resources.fuel)}/></div>
      <div className="consequence"><span>HOTEL LOG</span><strong>{state.eventHistory.at(-1)?.message??'특이사항 없음'}</strong><p>세계의 압력과 호텔의 선택이 다음 방문자, 자원, 세력 활동을 바꿉니다.</p>{summary&&(Object.keys(summary.facilityProduction??{}).length>0||Object.keys(summary.facilityUpkeep??{}).length>0)&&<small>시설 생산 {Object.entries(summary.facilityProduction??{}).map(([key,value])=>`${key} +${value}`).join(' · ')||'없음'} / 유지비 {Object.entries(summary.facilityUpkeep??{}).map(([key,value])=>`${key} -${value}`).join(' · ')||'없음'}</small>}{summary?.inactiveFacilities?.length?<small className="facility-warning">가동 중단 · {summary.inactiveFacilities.map((id)=>FACILITIES.find((facility)=>facility.id===id)?.name??id).join(' · ')}</small>:null}</div>
      <Button className="journal-toggle" variant="secondary" onClick={()=>setJournalOpen(!journalOpen)}><BookOpen/> HOTEL JOURNAL {journalOpen?'닫기':`전체 ${state.eventHistory.length}건`}</Button>
      {journalOpen&&<div className="hotel-journal"><div className="journal-filters">{(['ALL','CHECK_IN','CHECK_OUT','RESOURCE','EVENT'] as const).map((filter)=><button key={filter} aria-pressed={logFilter===filter} className={logFilter===filter?'active':''} onClick={()=>setLogFilter(filter)}>{filter}</button>)}<small>{journalEntries.length} / {state.eventHistory.length}건</small></div><div className="journal-list">{journalEntries.length?journalEntries.map(({entry,index})=><article key={`${index}-${entry.day}-${entry.message}`}><time>DAY {entry.day}</time><span>{entry.type}</span><strong>{entry.message}</strong>{entry.relationshipChanges?.map((change)=><p key={`${change.sourceId}-${change.targetId}`}>{guestName(change.sourceId)} → {guestName(change.targetId)} · {change.delta>0?'+':''}{change.delta}{change.type?` · ${change.type}`:''}</p>)}</article>):<p>이 유형의 기록이 없습니다.</p>}</div></div>}
      <div className="relationship-journal"><span>RELATIONSHIP JOURNAL</span>{relationshipLog.length?relationshipLog.map((entry)=><div key={`${entry.day}-${entry.message}`}><strong>DAY {entry.day} · {entry.message}</strong>{entry.relationshipChanges!.map((change)=><p key={`${change.sourceId}-${change.targetId}`}>{guestName(change.sourceId)} → {guestName(change.targetId)} <b>{change.delta>0?'+':''}{change.delta}</b>{change.type?` · ${change.type}`:''}</p>)}</div>):<p>아직 기록된 관계 변화가 없습니다. 객실 거리는 관계 사건의 강도를 바꿉니다.</p>}</div>
      <div className="destiny-panel"><span>ENDGAME / DESTINY</span>{destinyRoutes.map((ending)=>{const status=state.endingProgress[ending.endingId]??'IN_PROGRESS';const available=visibleEndings.some((item)=>item?.endingId===ending.endingId);return <div key={ending.endingId}><strong>{status==='AVAILABLE'?'NEW PATH AVAILABLE':status} · {ending.name}</strong><p>{ending.description}</p>{available&&<Button onClick={()=>onStartEnding(ending.endingId)}>FINAL EVENT 시작</Button>}</div>})}{hasUnknownRoute&&<div><strong>UNKNOWN · 숨겨진 경로</strong><p>일부 결말은 장부에 조건이나 이름이 표시되지 않습니다.</p></div>}</div>
      <footer><div><span>DAY {summary?.completedDay??state.day-1} 완료</span><p>원한다면 해금된 최종 사건을 미루고 운영을 계속할 수 있습니다.</p></div><div className="report-actions"><Button variant="secondary" onClick={onReset}><RotateCcw/> 새 게임</Button><Button onClick={onNext}>DAY {state.day} 운영 계속 <ChevronRight/></Button></div></footer>
    </section>
  </main>;
}

function Result({icon:Icon,label,before,after,good}:{icon:typeof Fuel;label:string;before:string;after:string;good?:boolean}) { return <div className="ledger-item"><Icon/><span>{label}</span><s>{before}</s><strong className={good?'good':''}>{after}</strong></div>; }

function QuietDesk({day,resources,staying,onManage,onEnd}:{day:number;resources:GameState['resources'];staying:number;onManage:()=>void;onEnd:()=>void}) {
  return <main className="event-screen"><div className="event-light"/><Radio className="event-icon"/><p className="scene-index">DAY {day} · 오후 8:47</p><section><span>JUJU HOTEL · 방문 기록</span><h1>오늘은 문을 두드리는 사람이 없다.</h1><p>투숙객 {staying}명이 호텔 안에 있습니다. 시설을 건설하거나 호텔을 정비한 뒤 밤을 정산할 수 있습니다.</p><blockquote>식량 {resources.food} · 물 {resources.water} · 연료 {resources.fuel}</blockquote><div className="assignment-actions"><Button variant="secondary" onClick={onManage}>호텔 운영</Button><Button onClick={onEnd}>밤을 넘긴다 <ChevronRight/></Button></div></section></main>;
}

function CampaignEnding({ state, onReturn, onAdvance }: { state:UiSave; onReturn:()=>void; onAdvance:()=>void }) {
  const ending = state.activeEndingId ? getEndingCondition(state.activeEndingId) : null;
  const narrative = state.activeEndingId ? getEndingNarrative(state.activeEndingId) : null;
  const index = Math.max(0,Math.min(state.endingSceneIndex,(narrative?.scenes.length??1)-1));
  const scene = narrative?.scenes[index];
  const last = Boolean(narrative&&index===narrative.scenes.length-1);
  const image = narrative?.image ?? DEFAULT_FRONT_DESK_BACKGROUND.image;
  const imageAlt = narrative?.imageAlt ?? `${ending?.name??'JUJU HOTEL'} 최종 사건의 호텔 로비.`;
  return <main className="cinematic-screen ending-cutscene"><img src={image} alt={imageAlt}/><div className="cinematic-wash"/><p className="scene-index">DAY {state.day} · {narrative?.kicker??'FINAL EVENT'} · {index+1}/{narrative?.scenes.length??1}</p><section className="cutscene-copy"><span>{ending?.name??'DESTINY'}</span><h1>{scene?.title??'기록을 찾을 수 없습니다.'}</h1><p>{scene?.body??ending?.description}</p><blockquote>{scene?.quote??'“May I have a room?”'}</blockquote><div className="ending-progress" aria-label="엔딩 장면 진행도">{narrative?.scenes.map((beat,beatIndex)=><i key={beat.id} className={beatIndex<=index?'active':''}/>)}</div><div className="assignment-actions"><Button variant="secondary" onClick={onReturn}>아침 장부로 돌아가기 · 진행 초기화</Button><Button onClick={onAdvance}>{last?'에필로그 기록 완료':'다음 장면'} <ChevronRight/></Button></div></section></main>;
}
