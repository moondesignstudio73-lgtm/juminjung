'use client';

import './aura.css';
import './guidance-overrides.css';
import './system-menu.css';
import './front-desk-hub.css';
import './npc-profile.css';
import { useEffect, useState, useRef, type ReactNode } from 'react';
import {
  getActionFeedback,
  RESOURCE_LABELS,
  type ActionFeedback,
} from '@/game/action-feedback';
import { ResourceChangeToast, ChangeLines } from './action-feedback';
import { Button } from '@/components/ui/button';
import { SystemMenu } from './system-menu';
import { NightManagement } from './night-management';
import { RoomRecovery, ResidentDetails } from './community';
import {
  NpcCompactRecord,
  NpcIdentity,
  NpcProfileLedger,
  NpcRankBadge,
} from './npc-profile';
import type { ProfessionalStat } from '@/game/npc-rank';
import { formatUpkeep, getNpcUpkeep } from '@/game/npc-upkeep';
import { expelResident, restoreRoom } from '@/game/community-manager';
import {
  getCapacityComparison,
  residentReplacementBlockReason,
} from '@/game/capacity-manager';
import { residenceLabel } from '@/game/community-data';
import { HotelStatus, RoomContents } from './hotel-ui';
import { canUseShortcut, roomCaption } from '@/game/ui-guidance';
import { getLivingForecast } from '@/game/day-flow-manager';
import './ui-polish.css';
import { DayFlowNav, DayFlowPage, FlowArchive } from './day-flow';
import {
  advanceDayFlow,
  currentDayStage,
  normalizeDayFlow,
  openOptionalOperations,
  type DayStage,
} from '@/game/day-flow-manager';
import {
  beginNightShift,
  completeNightShift,
  repairGenerator,
  performNightHotelAction,
  isGeneratorSpecialist,
  moveNightLocation,
  inspectGenerator,
  assignGeneratorDuty,
  upgradeGenerator,
  nightClock,
} from '@/game/night-work-manager';
import {
  getPlacementProfile,
  getRecommendedRooms,
  getPlacementDescription,
} from '@/game/placement-guidance';
import {
  BedDouble,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  ChevronRight,
  CircleHelp,
  Droplets,
  Fuel,
  Handshake,
  HeartPulse,
  Inspect,
  LayoutGrid,
  PackageSearch,
  Radio,
  ScrollText,
  Search,
  Shield,
  Soup,
  TriangleAlert,
  Utensils,
  Volume2,
  VolumeX,
  Wrench,
  X,
} from 'lucide-react';
import {
  getAffectedRoomNumbers,
  recalculateRoomEffects,
} from '@/game/aura-effect-manager';
import { shouldShowAuraOverlay, toggleAuraGuestId } from '@/game/aura-display';
import {
  getManagedGuest,
  getStayingGuestsForManagement,
} from '@/game/management-guest';
import { resolveDay } from '@/game/day-manager';
import { setGuestRoomFlags } from '@/game/event-manager';
import { createGuests, ELEANOR_ID } from '@/game/guest-data';
import {
  clearBrowserGame,
  createInitialGameState,
  loadBrowserGame,
  saveBrowserGame,
} from '@/game/save-manager';
import {
  assignGuest,
  checkoutGuest,
  getRoomOccupantLabel,
  isRoomSelectable,
  moveGuest,
} from '@/game/room-manager';
import { completeEventStage } from '@/game/story-event-manager';
import {
  applyStoryChoice,
  canChooseStoryChoice,
  getPendingStoryChoice,
} from '@/game/story-choice-manager';
import {
  advanceEnding,
  getEndingCondition,
  getEndingNarrative,
  leaveEnding,
  startEnding,
} from '@/game/ending-manager';
import { FACILITIES } from '@/game/facility-data';
import {
  buildFacility,
  canBuildFacility,
  canPerformHotelAction,
  getHotelActionDefinition,
  performHotelAction,
} from '@/game/hotel-action-manager';
import {
  canChooseNightChoice,
  getEffectiveNightChoice,
  selectNightEvent,
} from '@/game/night-event-manager';
import { getHotelLogEntries } from '@/game/hotel-log-manager';
import {
  applyVisitorCheckInBenefits,
  getNextRevisitDay,
  getVisitorReaction,
  getVisitorReactionById,
  markVisitorRefused,
  prepareGuestCheckIn,
} from '@/game/visitor-manager';
import {
  advanceDailyVisitorQueue,
  getCurrentQueuedVisitor,
  getDailyVisitorCountBreakdown,
  prepareDailyVisitorQueue,
  recordVisitorDecision,
  updateVisitorFinalState,
} from '@/game/visitor-queue-manager';
import {
  getGuestVisualState,
  getNightEventPortraits,
  getStoryEventExpression,
} from '@/game/guest-visual-manager';
import { getCutscene } from '@/game/cutscene-data';
import { dismissCutscene } from '@/game/cutscene-manager';
import { getHotelPolicyTransition } from '@/game/day-four-transition';
import {
  configureFoodRation,
  calculatePowerPlan,
  getRationPlan,
  configurePowerCircuit,
  getActivePowerCircuits,
  getDailyObjectives,
  getPowerCapacity,
  POWER_CIRCUITS,
  RATION_POLICIES,
} from '@/game/daily-survival-manager';
import {
  assignStaffDuty,
  canRunScavengeMission,
  getAssignedStaff,
  getScavengeChanceBreakdown,
  getScavengeRouteModifiers,
  pruneStaffAssignments,
  runScavengeMission,
  SCAVENGE_MISSIONS,
  STAFF_DUTIES,
} from '@/game/staff-operation-manager';
import {
  assessInvestigationConclusion,
  canConcludeInvestigationCase,
  canInvestigateCasePoint,
  concludeInvestigationCase,
  getEvidenceDefinition,
  getInvestigationCaseDefinition,
  investigateCasePoint,
} from '@/game/investigation-manager';
import {
  getMonsterCodexDefinition,
  getMonsterEvidenceScore,
  getMonsterKnowledgeSourceDefinition,
  getMonsterSourceWeight,
  hasMonsterCountermeasure,
  recordVisitorStatement,
} from '@/game/monster-codex-manager';
import { NIGHT_PREPARATION_OPTIONS } from '@/game/night-preparation-data';
import {
  configureNightPreparation,
  getNightPreparationPlan,
} from '@/game/night-preparation-manager';
import { normalizePrologueIndex, PROLOGUE_BEATS } from '@/game/prologue-data';
import { DEFAULT_FRONT_DESK_BACKGROUND } from '@/game/background-data';
import {
  beginSpriteLoad,
  canDisplaySprite,
  completeSpriteLoad,
  failSpriteLoad,
  shouldDisplaySpritePlaceholder,
  type SpriteLoadState,
} from '@/game/sprite-load-manager';
import {
  applyVisitorQuestionClue,
  getAvailableVisitorQuestions,
  getVisitorClueRule,
  getVisitorTraitLabel,
} from '@/game/visitor-clue-data';
import {
  getOnboardingGuide,
  getPrimaryObjective,
} from '@/game/onboarding-manager';
import type {
  AuraDefinition,
  FacilityId,
  FoodRationPolicy,
  GameState,
  Guest,
  GuestExpression,
  HotelActionId,
  InvestigationCaseId,
  InvestigationConclusionId,
  InvestigationPointId,
  NightPreparationCategory,
  NightPreparationOptionId,
  PowerCircuitId,
  Room,
  ScavengeMissionId,
  StaffDutyId,
} from '@/game/types';
import './no-scroll.css';
import './ui-scale.css';

type UiSave = GameState & { prologue: number };
const makeInitial = (): UiSave => ({
  ...createInitialGameState(),
  prologue: 0,
});
const routeToNight = (state: UiSave): UiSave => {
  const pending = getPendingStoryChoice(state);
  return {
    ...state,
    phase: pending ? 'story' : 'night',
    pendingStoryEventId: pending?.id ?? null,
  };
};

const itemIcons = {
  FOOD: Soup,
  FUEL: Fuel,
  MEDICINE: HeartPulse,
  VALUABLE: PackageSearch,
  INFORMATION: Inspect,
} as const;
const nightPreparationCategories: ReadonlyArray<{
  id: NightPreparationCategory;
  name: string;
}> = [
  { id: 'PATROL', name: '순찰' },
  { id: 'ISOLATION', name: '격리' },
  { id: 'EXTERIOR_LIGHT', name: '외부 조명' },
  { id: 'NOISE', name: '소음 통제' },
];

export default function Home() {
  const [save, setSave] = useState<UiSave>(makeInitial);
  const [reviewStage, setReviewStage] = useState<DayStage | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [operationTools, setOperationTools] = useState(false);
  useEffect(() => {
    setReviewStage(null);
    setArchiveOpen(false);
    setOperationTools(false);
  }, [save.day, save.phase, save.dayFlow?.stage]);
  const previousFeedbackState = useRef<UiSave | null>(null);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(
    null,
  );
  useEffect(() => {
    const previous = previousFeedbackState.current;
    previousFeedbackState.current = save;
    if (previous) {
      const feedback = getActionFeedback(previous, save);
      if (feedback) setActionFeedback(feedback);
      else if (previous.phase !== save.phase) setActionFeedback(null);
    }
  }, [save]);
  useEffect(() => {
    if (!actionFeedback) return;
    const timer = setTimeout(() => setActionFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [actionFeedback]);
  const [roomAssignment, setRoomAssignment] = useState<{
    guestId: string;
    mode: 'checkin' | 'move';
    selectedRoomNumber: number | null;
    reactionId: string | null;
  } | null>(null);
  const [frontDeskSession, setFrontDeskSession] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [dialogue, setDialogue] = useState('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [managedGuestId, setManagedGuestId] = useState<string | null>(null);
  const eligibleVisitor = getCurrentQueuedVisitor(save);
  const isReturningVisitor = Boolean(
    eligibleVisitor && eligibleVisitor.status !== 'WAITING',
  );
  const visitor =
    eligibleVisitor ??
    save.guests.find((guest) => guest.status === 'STAYING') ??
    save.guests[0];
  const visitorReaction =
    eligibleVisitor && eligibleVisitor.npcType === 'MAIN' && !isReturningVisitor
      ? getVisitorReaction(save, eligibleVisitor)
      : null;
  const stayingGuests = getStayingGuestsForManagement(save.guests);
  const managedGuest = getManagedGuest(save.guests, managedGuestId) ?? visitor;
  const activeCutscene = getCutscene(save.activeCutsceneId);
  const visitorFlow = getDailyVisitorCountBreakdown(save);

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (
        save.day < 1 ||
        activeCutscene ||
        roomAssignment ||
        !canUseShortcut(
          event,
          event.target as Element,
          !!document.querySelector('[role="dialog"]'),
        )
      )
        return;
      if (event.key.toLowerCase() === 'j') {
        event.preventDefault();
        setArchiveOpen((value) => !value);
      }
      if (event.key === '4' && save.phase === 'night_management') {
        event.preventDefault();
        setArchiveOpen(false);
        setOperationTools(false);
        setSave((current) => ({
          ...current,
          dayFlow: {
            ...normalizeDayFlow(current).dayFlow!,
            operationLocation: null,
          },
        }));
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [save.day, save.phase, activeCutscene, roomAssignment]);

  useEffect(() => {
    const restored = loadBrowserGame();
    setSave({
      ...restored,
      prologue: normalizePrologueIndex(
        (restored as GameState & { prologue?: number }).prologue,
      ),
    });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && save.phase !== 'title') saveBrowserGame(save);
  }, [save, hydrated]);

  useEffect(() => {
    if (
      hydrated &&
      save.phase === 'desk' &&
      save.day > 0 &&
      save.visitorQueueDay !== save.day
    ) {
      setSave((current) => ({
        ...prepareDailyVisitorQueue(current),
        prologue: current.prologue,
      }));
    }
  }, [hydrated, save.phase, save.day, save.visitorQueueDay]);

  useEffect(() => {
    if (save.phase === 'desk' && eligibleVisitor) {
      setDialogue(
        isReturningVisitor
          ? '“길 위에서 다시 돌아왔습니다. 이번에는 함께 살아갈 자리를 찾고 있습니다.”'
          : (visitorReaction?.dialogue ?? eligibleVisitor.introDialogue),
      );
      setSelectedItem(null);
      setShowQuestions(false);
    }
  }, [
    save.phase,
    save.day,
    eligibleVisitor?.id,
    isReturningVisitor,
    visitorReaction?.id,
    frontDeskSession,
  ]);

  const update = (patch: Partial<UiSave>) =>
    setSave((current) => ({ ...current, ...patch }));
  const reset = () => {
    setReviewStage(null);
    setArchiveOpen(false);
    setOperationTools(false);
    previousFeedbackState.current = null;
    setActionFeedback(null);
    setRoomAssignment(null);
    setFrontDeskSession((n) => n + 1);
    clearBrowserGame();
    setSave(makeInitial());
    setDialogue('');
    setSelectedItem(null);
    setManagedGuestId(null);
  };
  const restore = (restored: GameState) => {
    setReviewStage(null);
    setArchiveOpen(false);
    setOperationTools(false);
    previousFeedbackState.current = null;
    setActionFeedback(null);
    setRoomAssignment(null);
    setFrontDeskSession((n) => n + 1);
    setSave({
      ...restored,
      prologue: normalizePrologueIndex(
        (restored as GameState & { prologue?: number }).prologue,
      ),
    });
    setDialogue('');
    setSelectedItem(null);
    setManagedGuestId(null);
  };
  const returnToTitle = () => {
    saveBrowserGame(save);
    update({ phase: 'title' });
  };
  const withSystemMenu = (screen: ReactNode) => (
    <>
      {save.day > 0 &&
        !activeCutscene &&
        !['title', 'prologue', 'ending'].includes(save.phase) && (
          <DayFlowNav
            state={save}
            review={reviewStage}
            onReview={(stage) => {
              setReviewStage(stage);
              setArchiveOpen(false);
            }}
            onArchive={() => setArchiveOpen(true)}
          />
        )}
      {save.day > 0 &&
        !activeCutscene &&
        ['desk', 'night_management'].includes(save.phase) &&
        !archiveOpen &&
        !reviewStage && <HotelStatus state={save} />}
      {archiveOpen ? (
        <FlowArchive state={save} onClose={() => setArchiveOpen(false)} />
      ) : reviewStage ? (
        <DayFlowPage
          key={`review-${reviewStage}`}
          state={save}
          stage={reviewStage}
          readOnly
          onContinue={() => setReviewStage(null)}
          onRation={() => {}}
          onOperation={() => {}}
        />
      ) : (
        screen
      )}
      <ResourceChangeToast feedback={actionFeedback} />
      <SystemMenu
        state={save}
        blocked={Boolean(roomAssignment)}
        muted={muted}
        onMutedChange={setMuted}
        onLoad={restore}
        onTitle={returnToTitle}
        onReset={reset}
      />
    </>
  );
  const ask = (question: Guest['questions'][number]) => {
    const clue = applyVisitorQuestionClue(
      save.guests,
      visitor.id,
      question.id,
      save.inspected,
    );
    const questioned: UiSave = {
      ...save,
      guests: clue.guests,
      asked: [...new Set([...save.asked, question.id])],
    };
    const statement = recordVisitorStatement(
      questioned,
      visitor.id,
      question.id,
      save.inspected,
    );
    setSave({ ...statement.state, prologue: save.prologue });
    const statementLabel =
      statement.record?.assessment === 'CONTRADICTED'
        ? '진술 모순'
        : statement.record?.assessment === 'CORROBORATED'
          ? '진술 확인'
          : '진술 기록';
    setDialogue(
      `“${question.answer}”${clue.applied && clue.rule ? `\n\n[확인된 단서] ${clue.rule.finding}` : ''}${statement.message ? `\n\n[${statementLabel} · MONSTER CODEX] ${statement.message}` : ''}`,
    );
    setShowQuestions(false);
  };
  const inspect = (id: string) => {
    update({ inspected: [...new Set([...save.inspected, id])] });
    setSelectedItem(id);
  };
  const refuse = () =>
    setSave((current) => {
      const currentVisitor = getCurrentQueuedVisitor(current);
      if (!currentVisitor) return current;
      let next: UiSave = {
        ...current,
        guests: markVisitorRefused(
          current.guests,
          currentVisitor.id,
          current.day,
        ),
        eventHistory: [
          ...current.eventHistory,
          {
            day: current.day,
            type: 'EVENT',
            message: `${currentVisitor.name} · ${currentVisitor.status === 'WAITING' ? '입실 거절' : '재입실 거절'}`,
          },
        ],
        decision: 'refuse',
        pendingVisitorReactionId: null,
      };
      next = recordVisitorDecision(
        next,
        currentVisitor.id,
        'REFUSED',
        null,
      ) as UiSave;
      next = advanceDailyVisitorQueue(next) as UiSave;
      return {
        ...next,
        phase: 'desk',
        prologue: current.prologue,
      };
    });
  const openAssignment = (mode: 'checkin' | 'move') =>
    setRoomAssignment({
      guestId: mode === 'move' ? managedGuest.id : visitor.id,
      mode,
      selectedRoomNumber: null,
      reactionId: mode === 'checkin' ? (visitorReaction?.id ?? null) : null,
    });
  const confirmRoom = () => {
    if (!roomAssignment || roomAssignment.selectedRoomNumber === null) return;
    const assignmentGuest = save.guests.find(
      (guest) => guest.id === roomAssignment.guestId,
    );
    if (!assignmentGuest) return;
    const targetRoom = save.rooms.find(
      (room) => room.roomNumber === roomAssignment.selectedRoomNumber,
    );
    const replacementResident =
      roomAssignment.mode === 'checkin' && targetRoom?.guestId
        ? save.guests.find((guest) => guest.id === targetRoom.guestId) ?? null
        : null;
    if (
      replacementResident &&
      residentReplacementBlockReason(replacementResident)
    )
      return;
    const assignmentBase = replacementResident
      ? (expelResident(save, replacementResident.id) as UiSave)
      : save;
    const reaction =
      roomAssignment.mode === 'checkin'
        ? getVisitorReactionById(assignmentGuest, roomAssignment.reactionId)
        : null;
    const positionedGuests =
      roomAssignment.mode === 'checkin'
        ? prepareGuestCheckIn(
            assignmentBase.guests,
            assignmentGuest.id,
            roomAssignment.selectedRoomNumber,
            assignmentBase.day,
            assignmentBase.flags,
            assignmentGuest.id,
          )
        : assignmentBase.guests.map((guest) =>
            guest.id === assignmentGuest.id
              ? {
                  ...guest,
                  currentRoomNumber: roomAssignment.selectedRoomNumber,
                  status: 'STAYING' as const,
                  remainingNights: guest.remainingNights,
                }
              : guest,
          );
    const benefits =
      roomAssignment.mode === 'checkin'
        ? applyVisitorCheckInBenefits(
            assignmentBase.resources,
            positionedGuests,
            assignmentGuest.id,
            save.negotiated,
            reaction,
          )
        : {
            resources: assignmentBase.resources,
            guests: positionedGuests,
            applied: false,
          };
    const arrival =
      roomAssignment.mode === 'checkin'
        ? completeEventStage(benefits.guests, assignmentGuest.id, 'ARRIVAL')
        : { guests: benefits.guests, entry: null };
    const guests = arrival.guests;
    const positioned =
      roomAssignment.mode === 'move'
        ? moveGuest(
            assignmentBase.rooms,
            assignmentGuest.id,
            roomAssignment.selectedRoomNumber,
          )
        : assignGuest(
            assignmentBase.rooms,
            roomAssignment.selectedRoomNumber,
            assignmentGuest.id,
          );
    const roomFlags =
      assignmentGuest.id === ELEANOR_ID
        ? setGuestRoomFlags(
            assignmentBase.flags,
            roomAssignment.selectedRoomNumber,
          )
        : assignmentBase.flags;
    const reactionApplied = benefits.applied && reaction;
    setManagedGuestId(assignmentGuest.id);
    let next: UiSave = {
      ...assignmentBase,
      guests,
      rooms: recalculateRoomEffects(positioned, guests),
      flags: reactionApplied
        ? {
            ...roomFlags,
            [`visitor_reaction_${assignmentGuest.id}_${reactionApplied.id}`]: true,
          }
        : roomFlags,
      resources: benefits.resources,
      eventHistory:
        roomAssignment.mode === 'checkin'
          ? [
              ...assignmentBase.eventHistory,
              {
                day: assignmentBase.day,
                type: 'CHECK_IN' as const,
                message: `${visitor.name} · ${roomAssignment.selectedRoomNumber}호 ${replacementResident ? `${replacementResident.name}과 교체 체크인` : isReturningVisitor ? '재체크인' : '체크인'}`,
              },
              ...(reactionApplied
                ? [
                    {
                      day: assignmentBase.day,
                      type: 'EVENT' as const,
                      message: `세력 반응 · ${visitor.name} · ${reactionApplied.label}`,
                    },
                  ]
                : []),
              ...(arrival.entry ? [{ ...arrival.entry, day: save.day }] : []),
            ]
          : save.eventHistory,
      decision: 'checkin',
      phase: 'desk',
      pendingVisitorReactionId: null,
    };
    if (roomAssignment.mode === 'checkin') {
      const itemsPaid = Object.fromEntries(
        Object.entries(benefits.resources)
          .map(([key, value]) => [
            key,
            Math.max(
              0,
              Number(value) -
                Number(
                  assignmentBase.resources[
                    key as keyof typeof assignmentBase.resources
                  ],
                ),
            ),
          ])
          .filter(([, value]) => Number(value) > 0),
      );
      next = recordVisitorDecision(
        next,
        assignmentGuest.id,
        'ACCEPTED',
        roomAssignment.selectedRoomNumber,
        itemsPaid,
      ) as UiSave;
      next = advanceDailyVisitorQueue(next) as UiSave;
      next = {
        ...next,
        phase: 'desk',
      };
    }
    setRoomAssignment(null);
    setSave({ ...next, prologue: assignmentBase.prologue });
  };
  const checkout = () =>
    setSave((current) => ({
      ...expelResident(current, managedGuest.id),
      prologue: current.prologue,
    }));

  if (!hydrated) return <LobbyLoading />;
  if (activeCutscene)
    return withSystemMenu(
      <StoryCutscene
        state={save}
        day={save.day}
        cutscene={activeCutscene}
        onContinue={() =>
          setSave((current) => ({
            ...dismissCutscene(current),
            prologue: current.prologue,
          }))
        }
      />,
    );
  if (save.phase === 'title')
    return (
      <TitleScreen
        onStart={() => update({ phase: 'prologue' })}
        onContinue={() => restore(loadBrowserGame())}
        onReset={reset}
        hasProgress={save.day > 0}
        muted={muted}
        setMuted={setMuted}
      />
    );
  if (save.phase === 'prologue') {
    const beat = PROLOGUE_BEATS[save.prologue];
    return withSystemMenu(
      <main className="cinematic-screen prologue-cutscene">
        <img src={beat.image} alt={beat.imageAlt} />
        <div className="cutscene-rain" aria-hidden="true" />
        <div className="cinematic-wash" />
        <p className="scene-index">{beat.tag}</p>
        <section className="cutscene-copy" aria-live="polite">
          <span>{beat.speaker}</span>
          <p>{beat.line}</p>
          <Button
            className="advance"
            onClick={() =>
              save.prologue < PROLOGUE_BEATS.length - 1
                ? update({ prologue: save.prologue + 1 })
                : setSave((current) => ({
                    ...normalizeDayFlow({
                      ...prepareDailyVisitorQueue({
                        ...current,
                        phase: 'desk',
                        day: 1,
                      }),
                      phase: 'report',
                    }),
                    prologue: current.prologue,
                  }))
            }
          >
            {save.prologue < PROLOGUE_BEATS.length - 1 ? '계속' : '문을 연다'}{' '}
            <ChevronRight />
          </Button>
        </section>
        {save.prologue === PROLOGUE_BEATS.length - 1 && (
          <div className="knock" aria-hidden="true">
            똑.
            <br />
            똑.
            <br />
            똑.
          </div>
        )}
      </main>,
    );
  }
  if (
    save.phase === 'desk' &&
    save.day > 0 &&
    save.visitorQueueDay !== save.day
  )
    return <LobbyLoading />;
  const frontDeskTools = (
    <FrontDeskTools
      initialPanel={operationTools ? 'staff' : undefined}
      key={frontDeskSession}
      hasVisitor={operationTools || Boolean(eligibleVisitor)}
      assignmentOpen={roomAssignment !== null}
      state={save}
      guest={managedGuest}
      stayingGuests={stayingGuests}
      hasStayingGuest={stayingGuests.length > 0}
      onSelectGuest={setManagedGuestId}
      onBuild={(id) =>
        setSave((current) => ({
          ...buildFacility(current, id).state,
          prologue: current.prologue,
        }))
      }
      onAction={(id) =>
        setSave((current) => ({
          ...performHotelAction(current, id).state,
          prologue: current.prologue,
        }))
      }
      onPower={(id, enabled) =>
        setSave((current) => ({
          ...configurePowerCircuit(current, id, enabled).state,
          prologue: current.prologue,
        }))
      }
      onRation={(policy) =>
        setSave((current) => ({
          ...configureFoodRation(current, policy),
          prologue: current.prologue,
        }))
      }
      onNightPreparation={(category, optionId) =>
        setSave((current) => ({
          ...configureNightPreparation(current, category, optionId).state,
          prologue: current.prologue,
        }))
      }
      onStaff={(dutyId, guestId) =>
        setSave((current) => ({
          ...assignStaffDuty(current, dutyId, guestId).state,
          prologue: current.prologue,
        }))
      }
      onScavenge={(missionId) =>
        setSave((current) => ({
          ...runScavengeMission(current, missionId).state,
          prologue: current.prologue,
        }))
      }
      onInvestigate={(caseId, pointId) =>
        setSave((current) => ({
          ...investigateCasePoint(current, caseId, pointId).state,
          prologue: current.prologue,
        }))
      }
      onConclude={(caseId, conclusionId) =>
        setSave((current) => ({
          ...concludeInvestigationCase(current, caseId, conclusionId).state,
          prologue: current.prologue,
        }))
      }
      onMove={() => openAssignment('move')}
      onCheckout={checkout}
      onStartEnding={(endingId) =>
        setSave((current) => ({
          ...startEnding(current, endingId),
          prologue: current.prologue,
        }))
      }
      onContinue={() =>
        setSave((current) => ({
          ...advanceDayFlow(current),
          prologue: current.prologue,
        }))
      }
    />
  );
  const continueFlow = () =>
    setSave((current) => {
      const next = advanceDayFlow(current);
      return next.phase === 'night'
        ? routeToNight({ ...next, prologue: current.prologue })
        : { ...next, prologue: current.prologue };
    });
  const flowPage = (stage: DayStage) => (
    <DayFlowPage
      key={`${save.day}-${stage}-${frontDeskSession}`}
      state={save}
      stage={stage}
      onContinue={continueFlow}
      onExpel={(id) =>
        setSave((current) => ({
          ...expelResident(current, id),
          prologue: current.prologue,
        }))
      }
      onRation={(policy) =>
        setSave((current) => ({
          ...configureFoodRation(current, policy),
          prologue: current.prologue,
        }))
      }
      onOperation={(location) => {
        if (location === 'front' && currentDayStage(save) === 'residents') {
          setSave((current) => ({
            ...openOptionalOperations(current),
            prologue: current.prologue,
          }));
          return;
        }
        if (location === 'staff') {
          setOperationTools(true);
          return;
        }
        setSave((current) => {
          const next = moveNightLocation(current, location);
          return {
            ...next,
            dayFlow: {
              ...normalizeDayFlow(next).dayFlow!,
              operationLocation: next.nightShift?.location ?? null,
            },
            prologue: current.prologue,
          };
        });
      }}
    />
  );
  if (save.phase === 'desk' && currentDayStage(save) === 'residents')
    return withSystemMenu(flowPage('residents'));
  if (save.phase === 'desk' && !eligibleVisitor)
    return withSystemMenu(flowPage('visitors'));
  if (save.phase === 'night_management' && !save.dayFlow?.operationLocation)
    return withSystemMenu(
      operationTools ? (
        <main className="day-flow-page operation-tools">
          <header>
            <h1>직원과 외부 업무</h1>
          </header>
          <Button variant="outline" onClick={() => setOperationTools(false)}>
            운영 목록으로 돌아가기
          </Button>
          {frontDeskTools}
        </main>
      ) : (
        flowPage('operations')
      ),
    );
  if (save.phase === 'night_management')
    return withSystemMenu(
      <main className="day-flow-page facility-page">
        <header>
          <p>
            DAY {save.day} · 호텔 내부 · {nightClock(save)}
          </p>
          <h1>필요한 공간을 살펴봅니다</h1>
        </header>
        <section className="day-flow-content facility-screen-content">
          <Button
            variant="outline"
            onClick={() =>
              setSave((current) => ({
                ...current,
                dayFlow: {
                  ...normalizeDayFlow(current).dayFlow!,
                  operationLocation: null,
                },
              }))
            }
          >
            운영 화면으로 돌아가기
          </Button>
          <div className="flow-facility">
            <NightManagement
              embedded
              key={frontDeskSession}
              state={save}
              onMove={(location) =>
                setSave((current) => ({
                  ...moveNightLocation(current, location),
                  prologue: current.prologue,
                }))
              }
              onInspect={() =>
                setSave((current) => ({
                  ...inspectGenerator(current),
                  prologue: current.prologue,
                }))
              }
              onAssign={(id) =>
                setSave((current) => ({
                  ...assignGeneratorDuty(current, id),
                  prologue: current.prologue,
                }))
              }
              onUpgrade={() =>
                setSave((current) => ({
                  ...upgradeGenerator(current),
                  prologue: current.prologue,
                }))
              }
              onRestoreRoom={(room, id) =>
                setSave((current) => ({
                  ...restoreRoom(current, room, id),
                  prologue: current.prologue,
                }))
              }
              onRepair={(id) =>
                setSave((current) => ({
                  ...repairGenerator(current, id).state,
                  prologue: current.prologue,
                }))
              }
              onAction={(id) =>
                setSave((current) => ({
                  ...performNightHotelAction(current, id),
                  prologue: current.prologue,
                }))
              }
              onRation={(policy) =>
                setSave((current) => ({
                  ...configureFoodRation(current, policy),
                  prologue: current.prologue,
                }))
              }
              onFinish={() =>
                setSave((current) =>
                  routeToNight({
                    ...completeNightShift(current),
                    prologue: current.prologue,
                  }),
                )
              }
            />
          </div>
        </section>
      </main>,
    );
  if (save.phase === 'story')
    return withSystemMenu(
      <StoryChoiceScene
        state={save}
        onChoose={(eventId, choiceId) =>
          setSave((current) =>
            routeToNight({
              ...applyStoryChoice(current, eventId, choiceId).state,
              prologue: current.prologue,
            }),
          )
        }
      />,
    );
  if (save.phase === 'night')
    return withSystemMenu(
      <NightEvent
        state={save}
        onChoose={(eventId, choiceId) =>
          setSave((current) => ({
            ...resolveDay({
              ...current,
              selectedNightEventId: eventId,
              selectedNightChoiceId: choiceId,
            }),
            prologue: current.prologue,
          }))
        }
      />,
    );
  if (save.phase === 'report') return withSystemMenu(flowPage('report'));
  if (save.phase === 'ending')
    return withSystemMenu(
      <CampaignEnding
        state={save}
        onReturn={() =>
          setSave((current) => ({
            ...leaveEnding(current),
            prologue: current.prologue,
          }))
        }
        onAdvance={() =>
          setSave((current) =>
            current.activeEndingId
              ? { ...advanceEnding(current), prologue: current.prologue }
              : current,
          )
        }
      />,
    );

  const availableItems = visitor.offeredItems.filter(
    (item) => !item.negotiatedOnly || save.negotiated,
  );
  const availableQuestions = getAvailableVisitorQuestions(
    visitor,
    save.inspected,
  );
  const detail = visitor.offeredItems.find((item) => item.id === selectedItem);
  const detailClue = detail
    ? getVisitorClueRule(visitor.id, 'ITEM', detail.id)
    : null;
  const unlockedQuestion = detailClue?.unlocksQuestionId
    ? visitor.questions.find(
        (question) => question.id === detailClue.unlocksQuestionId,
      )
    : null;
  const DetailIcon = detail ? itemIcons[detail.type] : Inspect;
  const onboarding = getOnboardingGuide(save.day);
  return withSystemMenu(
    <main
      data-front-desk-root
      data-game-phase={save.phase}
      className={`game-shell unified-front-desk day-flow-visitors onboarding-day-${Math.min(save.day, 10)}`}
    >
      <GameGuide />
      <div className="rain" aria-hidden="true" />
      <header className="game-header">
        <div>
          <p className="eyebrow">JUJU HOTEL · 프런트</p>
          <h1>MAY I HAVE A ROOM?</h1>
        </div>
        <div className="primary-objective">
          <small>오늘의 목표</small>
          <strong>{getPrimaryObjective(save)}</strong>
        </div>
        <div className="header-actions">
          <button
            className="icon-button"
            onClick={() => setMuted(!muted)}
            aria-label={muted ? '소리 켜기' : '소리 끄기'}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </button>
          <div className="day-chip">
            <span>DAY {save.day || 1}</span>
            <small>오후 8:47 · 비</small>
          </div>
        </div>
      </header>

      <section className="desk-scene" aria-label="밤의 JUJU HOTEL 프런트">
        {save.flags.generator_outage_day === save.day - 1 && (
          <output className="tutorial-callout">
            <b>지난밤 복도 조명이 꺼졌습니다.</b>
            <span>
              정전의 피해가 장부에 남았습니다. 오늘 밤 발전기실에서 수리를
              준비하세요.
            </span>
          </output>
        )}
        {eligibleVisitor && save.day <= 3 && (
          <output className="tutorial-callout">
            <b>{onboarding.unlocked}</b>
            <span>{onboarding.instruction}</span>
          </output>
        )}
        {eligibleVisitor &&
          save.day === 4 &&
          save.dailyVisitorIndex === 0 &&
          save.asked.length === 0 &&
          save.inspected.length === 0 &&
          !save.negotiated && (
            <output className="tutorial-callout policy-unlock-callout">
              <b>새 규칙 · 방문자 확인</b>
              <span>
                제시한 숙박 대가와 진술을 확인하세요. 질문·조사·협상은
                필요할 때 하나씩 사용하면 됩니다.
              </span>
            </output>
          )}
        <FrontDeskBackdrop />
        {save.day >= 4 && (
          <div className="hotel-policy-sign">
            <button
              type="button"
              aria-expanded={policyOpen}
              onClick={() => setPolicyOpen((open) => !open)}
            >
              <small>JUJU HOTEL</small>
              <strong>숙박 가능</strong>
              <span>물자 또는 기여 확인</span>
            </button>
            {policyOpen && (
              <output>
                <b>현재 숙박 규칙</b>
                <span>방문자의 말과 제공 물자를 확인한 뒤 입실을 결정합니다.</span>
                <small>특별한 사정은 관리자가 직접 판단합니다.</small>
              </output>
            )}
          </div>
        )}
        <div className="frontdesk-environment" aria-hidden="true">
          <div className="lobby-rain" />
        </div>
        <div className="scene-vignette" />
        {eligibleVisitor && (
          <>
            <div className="visitor-layer">
              <CharacterSprite guest={visitor} context="desk" />
            </div>
            <aside className="case-file left-panel">
              <span className="panel-label">
                오늘 방문 {save.dailyVisitorIndex + 1} /{' '}
                {save.dailyVisitorQueue.length}
              </span>
              <h2 className="npc-name-with-rank">
                {visitor.name} <NpcRankBadge guest={visitor} />
              </h2>
              <p>
                {visitor.age}세 · {visitor.role}
              </p>
              {save.day >= 4 && isGeneratorSpecialist(visitor) && (
                <p className="night-job-hint">
                  맡길 수 있는 일: 매일 발전기 점검·경미 수리
                  <br />
                  <small>
                    지속 배정하면 매일 발전기실을 방문할 필요가 줄어듭니다.
                    수리는 부품 1개로 내구도 +25. 숙박 중 식량과 물은 계속
                    필요합니다. 대형 파손은 직접 해결해야 합니다.
                  </small>
                </p>
              )}
              <dl>
                <div>
                  <dt>요청</dt>
                  <dd>{residenceLabel(visitor)}</dd>
                </div>
                {save.day < 4 && (
                  <div>
                    <dt>일일 유지비</dt>
                    <dd>
                      식량 −{formatUpkeep(getNpcUpkeep(visitor).food)} · 물 −
                      {formatUpkeep(getNpcUpkeep(visitor).water)}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>상태</dt>
                  <dd>
                    {visitor.conditionLabel} ·{' '}
                    {getGuestVisualState(visitor).label}
                  </dd>
                </div>
                {save.asked.length + save.inspected.length >= 2 && (
                  <div>
                    <dt>판단 메모</dt>
                    <dd>
                      {visitor.riskLevel >= 70
                        ? '위험 신호가 뚜렷함'
                        : visitor.riskLevel >= 40
                          ? '확인이 더 필요함'
                          : '현재까지 큰 모순 없음'}
                    </dd>
                  </div>
                )}
              </dl>
              {save.day >= 4 && (
                <NpcProfileLedger
                  guest={visitor}
                  negotiated={save.negotiated}
                />
              )}
              {save.day >= 4 && (
                <div className="clue-count">
                  단서 {save.asked.length + save.inspected.length} /{' '}
                  {visitor.questions.length + visitor.offeredItems.length}
                  <small>숨겨진 특성은 조사 전 표시되지 않습니다.</small>
                </div>
              )}
              {visitorFlow.radioSources.length > 0 && (
                <div className="radio-exposure">
                  <Radio size={13} />
                  <div>
                    <span>
                      {visitorFlow.radioAppliedBonus > 0
                        ? `라디오 유입 +${visitorFlow.radioAppliedBonus}`
                        : '라디오 유입 · 오늘 상한 도달'}
                    </span>
                    <small>
                      {visitorFlow.radioSources
                        .map((source) => source.label)
                        .join(' · ')}{' '}
                      · 일일 상한 6명
                    </small>
                  </div>
                </div>
              )}
              {visitorReaction && (
                <div className="faction-reaction">
                  <span>{visitorReaction.faction.toUpperCase()} REACTION</span>
                  <strong>{visitorReaction.label}</strong>
                  <small>
                    Trust {visitorReaction.trustDelta > 0 ? '+' : ''}
                    {visitorReaction.trustDelta}
                    {visitorReaction.offerBonus ? ' · 추가 제안 있음' : ''}
                  </small>
                </div>
              )}
            </aside>
            {onboarding.showResources && (
              <aside className="hotel-status right-panel">
                <span className="panel-label">야간 장부 · 자원 점수</span>
                <strong>{save.rooms.filter(isRoomSelectable).length}</strong>
                <small>빈 객실 · 총 30실</small>
                {onboarding.showPower && (
                  <Status
                    icon={Fuel}
                    label="연료"
                    value={save.resources.fuel}
                  />
                )}
                <Status icon={Soup} label="식량" value={save.resources.food} />
                {onboarding.showAdvanced && (
                  <Status
                    icon={Shield}
                    label="보안"
                    value={save.resources.security}
                  />
                )}
              </aside>
            )}

            {save.day >= 4 && (
              <div className="item-tray" aria-label="제시한 물품">
                {availableItems.map(({ id, type, name }) => {
                  const Icon = itemIcons[type];
                  return (
                    <button
                      key={id}
                      className={
                        save.inspected.includes(id) ? 'item inspected' : 'item'
                      }
                      onClick={() => inspect(id)}
                    >
                      <Icon />
                      <span>{name}</span>
                      <small>
                        {save.inspected.includes(id) ? '조사 완료' : '조사'}
                      </small>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="dialogue-card">
              <div className="speaker">
                <Radio size={15} /> {visitor.name}
              </div>
              <p>{dialogue}</p>
              {save.day >= 4 && (
                <div className="action-row">
                  <Button
                    variant="secondary"
                    onClick={() => setShowQuestions(!showQuestions)}
                  >
                    <CircleHelp /> 질문
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setDialogue(
                        '카운터 위 물건을 선택하세요. 사람보다 소지품이 더 솔직할 때가 있습니다.',
                      );
                    }}
                  >
                    <PackageSearch /> 조사
                  </Button>
                  <Button
                    variant="secondary"
                    title="추가 숙박 대가를 요구합니다."
                    disabled={save.negotiated}
                    onClick={() => {
                      update({ negotiated: true });
                      setDialogue(`“${visitor.negotiationDialogue}”`);
                    }}
                  >
                    <Droplets /> 협상
                  </Button>
                  <Button
                    variant="secondary"
                    title="방문자를 현관 안쪽에 잠시 대기시킵니다."
                    disabled={save.held}
                    onClick={() => {
                      update({ held: true });
                      setDialogue(
                        '꺼져가는 현관등 아래 그녀를 잠시 대기시킨다. 등 뒤 유리문에서 무언가 한 번 길게 긁히는 소리가 난다.',
                      );
                    }}
                  >
                    <Radio /> 보류
                  </Button>
                </div>
              )}
              {save.day >= 4 && showQuestions && (
                <div className="question-menu">
                  {availableQuestions.map((q) => (
                    <button
                      key={q.id}
                      className={save.asked.includes(q.id) ? 'asked' : ''}
                      onClick={() => ask(q)}
                    >
                      {q.label}
                      <ChevronRight />
                    </button>
                  ))}
                  {availableQuestions.length < visitor.questions.length && (
                    <small className="locked-question-hint">
                      물품을 조사하면 추가 질문이 열립니다.
                    </small>
                  )}
                </div>
              )}
            </div>
            <div className="decision-bar">
              <p>
                <span>
                  {save.day === 1 ? '지금 할 일 · 2단계' : '호텔 규칙 01'}
                </span>
                {save.day === 1
                  ? '방문 기록을 읽고 체크인 또는 거절을 선택하세요. 체크인하면 프론트 위 객실 배치도에서 빈 방을 고릅니다.'
                  : '이 문을 통과한 모든 사람은 당신의 책임입니다.'}
              </p>
              <Button className="refuse" onClick={refuse}>
                거절
              </Button>
              <Button
                className="checkin"
                onClick={() => openAssignment('checkin')}
              >
                <BedDouble /> 체크인 · 객실 선택
              </Button>
            </div>
          </>
        )}
      </section>
      {frontDeskTools}
      <div className="desk-status-bar" aria-label="호텔 현재 상태">
        {[
          ['food', save.resources.food],
          ['water', save.resources.water],
          ['fuel', save.resources.fuel],
          ['guests', stayingGuests.length],
          ['ap', save.actionPoints],
        ].map(([key, value]) => (
          <span
            key={key}
            className={
              actionFeedback?.changes.some((c) => c.resource === key)
                ? 'status-changed'
                : ''
            }
          >
            {RESOURCE_LABELS[key]} <b>{value}</b>
          </span>
        ))}
      </div>
      {roomAssignment && (
        <div className="front-desk-overlay room-assignment-overlay">
          <RoomAssignment
            state={save}
            day={save.day}
            rooms={save.rooms}
            guest={save.guests.find(
              (guest) => guest.id === roomAssignment.guestId,
            )!}
            selected={roomAssignment.selectedRoomNumber}
            mode={roomAssignment.mode}
            onSelect={(number) =>
              setRoomAssignment((current) =>
                current ? { ...current, selectedRoomNumber: number } : null,
              )
            }
            onConfirm={confirmRoom}
            onCancel={() => setRoomAssignment(null)}
            onReject={() => {
              setRoomAssignment(null);
              refuse();
            }}
          />
        </div>
      )}

      {detail && (
        <div className="modal-backdrop" onClick={() => setSelectedItem(null)}>
          <section
            className="item-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-title"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="panel-label">
              조사 기록 · {detail.id.toUpperCase()}
            </span>
            <DetailIcon />
            <h2 id="item-title">{detail.name}</h2>
            <p>{detail.short}</p>
            <blockquote>{detail.detail}</blockquote>
            {detailClue && (
              <div className="clue-unlock">
                <strong>새 단서</strong>
                <p>{detailClue.finding}</p>
                {unlockedQuestion && (
                  <small>질문 해금 · {unlockedQuestion.label}</small>
                )}
              </div>
            )}
            <Button onClick={() => setSelectedItem(null)}>
              프런트로 돌아가기
            </Button>
          </section>
        </div>
      )}
    </main>,
  );
}

function FrontDeskBackdrop() {
  const [instanceId] = useState(() => crypto.randomUUID());
  return (
    <div className="frontdesk-background" data-front-desk-instance={instanceId}>
      <img
        src={DEFAULT_FRONT_DESK_BACKGROUND.image}
        alt={DEFAULT_FRONT_DESK_BACKGROUND.alt}
      />
    </div>
  );
}

function Status({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Fuel;
  label: string;
  value: number;
}) {
  return (
    <div className="resource-line">
      <Icon />
      <span>{label}</span>
      <i>
        <b style={{ width: `${value}%` }} />
      </i>
      <em>{value}</em>
    </div>
  );
}

function OnboardingBanner({ day, step }: { day: number; step: string }) {
  const guide = getOnboardingGuide(day);
  return (
    <section className="onboarding-banner" aria-live="polite">
      <small>{guide.unlocked}</small>
      <strong>{guide.title}</strong>
      <span>{step}</span>
    </section>
  );
}

function CharacterSprite({
  guest,
  context,
  expression,
}: {
  guest: Guest;
  context: 'desk' | 'story' | 'event-left' | 'event-right';
  expression?: GuestExpression;
}) {
  const visual = getGuestVisualState(guest, expression);
  const requestedAsset = visual.asset ?? null;
  const [loadState, setLoadState] = useState<SpriteLoadState>(() =>
    beginSpriteLoad(requestedAsset),
  );

  useEffect(() => {
    let active = true;
    setLoadState(beginSpriteLoad(requestedAsset));
    if (!requestedAsset) {
      setLoadState(failSpriteLoad(null));
      return () => {
        active = false;
      };
    }
    const image = new Image();
    image.onload = async () => {
      try {
        await image.decode();
      } catch {
        /* onload already confirmed usable image data */
      }
      if (active) setLoadState(completeSpriteLoad(requestedAsset));
    };
    image.onerror = () => {
      if (active) setLoadState(failSpriteLoad(requestedAsset));
    };
    image.src = requestedAsset;
    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [guest.id, requestedAsset]);

  if (!canDisplaySprite(requestedAsset, loadState)) {
    if (!shouldDisplaySpritePlaceholder(requestedAsset, loadState)) return null;
    return (
      <figure
        className={`character-sprite ${context} sprite-placeholder`}
        aria-label={`${guest.name} 방문객 이미지 로드 실패`}
      >
        <div className="generic-silhouette" aria-hidden="true" />
        <figcaption>방문객 이미지 없음</figcaption>
      </figure>
    );
  }
  return (
    <figure
      className={`character-sprite ${context} expression-${visual.expression} ${visual.modifiers.map((item) => `state-${item.toLowerCase()}`).join(' ')}`}
      data-expression={visual.expression}
      aria-label={`${guest.name} · ${visual.label}`}
    >
      <img
        className="sprite-ready"
        src={requestedAsset!}
        alt={`${guest.name}의 ${visual.expression} 표정 반신 일러스트`}
        onError={() => setLoadState(failSpriteLoad(requestedAsset))}
      />
      <figcaption>{visual.label}</figcaption>
    </figure>
  );
}

function TitleScreen({
  onStart,
  onContinue,
  onReset,
  hasProgress,
  muted,
  setMuted,
}: {
  onStart: () => void;
  onContinue: () => void;
  onReset: () => void;
  hasProgress: boolean;
  muted: boolean;
  setMuted: (v: boolean) => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <main className="title-screen">
      <img
        src={DEFAULT_FRONT_DESK_BACKGROUND.image}
        alt={DEFAULT_FRONT_DESK_BACKGROUND.alt}
      />
      <div className="title-wash" />
      <button
        className="sound-corner"
        onClick={() => setMuted(!muted)}
        aria-label="소리 전환"
      >
        {muted ? <VolumeX /> : <Volume2 />}
      </button>
      <section className="title-lockup">
        <p>선택형 호텔 생존 스토리</p>
        <h1>
          <span>MAY I HAVE</span>A ROOM?
        </h1>
        <div className="neon-rule" />
        <p className="title-tagline">
          세상이 무너진 뒤, 실종된 아버지가 남긴 30개 객실의 호텔.
          <br />
          문을 두드리는 생존자를 받아들이고 그날 밤의 대가를 감당하세요.
        </p>
        <div className="title-actions">
          {hasProgress ? (
            <>
              <Button className="start-button" onClick={onContinue}>
                DAY 계속하기
                <ChevronRight />
              </Button>
              <button
                className="title-new-game"
                onClick={() => setConfirmReset(true)}
              >
                새 게임
              </button>
            </>
          ) : (
            <Button className="start-button" onClick={onStart}>
              이야기 시작 · DAY 0<ChevronRight />
            </Button>
          )}
          <GameGuide />
        </div>
        <small>
          선택은 인물 관계와 호텔의 운명에 남습니다 · 매 장면 자동 저장
        </small>
      </section>
      {confirmReset && (
        <div className="title-reset-layer">
          <section
            className="reset-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="title-reset-title"
          >
            <span className="reset-warning" aria-hidden="true">
              !
            </span>
            <h2 id="title-reset-title">현재 진행 상황이 삭제됩니다.</h2>
            <p>정말 새 게임을 시작하시겠습니까?</p>
            <div>
              <Button
                variant="secondary"
                onClick={() => setConfirmReset(false)}
              >
                취소
              </Button>
              <Button
                className="danger"
                onClick={() => {
                  onReset();
                  setConfirmReset(false);
                }}
              >
                새 게임 시작
              </Button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function LobbyLoading() {
  return (
    <main className="lobby-loading" aria-label="저장된 방문객 불러오는 중">
      <img
        src={DEFAULT_FRONT_DESK_BACKGROUND.image}
        alt={DEFAULT_FRONT_DESK_BACKGROUND.alt}
      />
      <div className="scene-vignette" />
      <span>방문 기록 확인 중…</span>
    </main>
  );
}

function GameGuide() {
  const [page, setPage] = useState<'story' | 'loop' | 'terms'>('story');
  return (
    <details className="game-guide">
      <summary>
        <CircleHelp /> 게임 설명 · 플레이 방법
      </summary>
      <div className="guide-sheet">
        <header>
          <span>JUJU HOTEL 안내서</span>
          <strong>당신은 방만 내어주는 사람이 아닙니다.</strong>
        </header>
        <nav className="guide-tabs" aria-label="도움말 분류">
          {(
            [
              ['story', '이야기'],
              ['loop', '플레이'],
              ['terms', '용어'],
            ] as const
          ).map(([id, label]) => (
            <button
              type="button"
              key={id}
              aria-pressed={page === id}
              onClick={() => setPage(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        {page === 'story' && (
          <section className="guide-story">
            <h2>이야기</h2>
            <p>
              대붕괴 이후, 도시의 밤은 사람의 것이 아니게 되었습니다. 당신은
              실종된 아버지가 남긴 JUJU HOTEL을 맡아 문 앞의 생존자를
              심사합니다. 누구를 들이고 내보냈는지, 아버지의 흔적을 얼마나
              밝혔는지가 호텔의 결말을 바꿉니다.
            </p>
          </section>
        )}
        {page === 'loop' && (
          <ol>
            <li>
              <b>프런트에서 결정</b>
              <span>방문자의 사연을 읽고 질문한 뒤 입실 또는 거절합니다.</span>
            </li>
            <li>
              <b>객실 배정</b>
              <span>능력 범위를 보고 빈 객실을 선택합니다.</span>
            </li>
            <li>
              <b>오늘의 문제 해결</b>
              <span>목표에 필요한 관리만 처리합니다.</span>
            </li>
            <li>
              <b>밤을 지나 결과 확인</b>
              <span>야간 선택의 대가를 다음 아침에 확인합니다.</span>
            </li>
          </ol>
        )}
        {page === 'terms' && (
          <dl>
            <div>
              <dt>AP</dt>
              <dd>낮에 쓸 수 있는 행동 횟수</dd>
            </div>
            <div>
              <dt>Aura</dt>
              <dd>주변 객실에 퍼지는 투숙객 효과</dd>
            </div>
            <div>
              <dt>Trust / Stress</dt>
              <dd>신뢰 / 불안. 관계 사건과 선택에 영향</dd>
            </div>
            <div>
              <dt>DAY</dt>
              <dd>호텔이 버틴 날짜. 정해진 제한 없음</dd>
            </div>
          </dl>
        )}
        <p className="guide-tip">
          막히면 화면의 황동색 ‘오늘의 목표’를 먼저 읽으세요. 회색 버튼은
          자원이나 선행 행동이 부족한 상태입니다.
        </p>
      </div>
    </details>
  );
}

const ROOM_GUEST_CATALOG = createGuests();
const AURA_ICONS: Record<AuraDefinition['icon'], typeof HeartPulse> = {
  'heart-pulse': HeartPulse,
  wrench: Wrench,
  shield: Shield,
  utensils: Utensils,
  brain: Brain,
  'triangle-alert': TriangleAlert,
  'circle-help': CircleHelp,
  handshake: Handshake,
  search: Search,
};

function AuraGlyph({
  aura,
  size = 12,
}: {
  aura: AuraDefinition;
  size?: number;
}) {
  const Icon = AURA_ICONS[aura.icon];
  return <Icon size={size} aria-hidden="true" />;
}

function HotelGrid({
  rooms,
  auraDefinition,
  auraMode = 'ambient',
  selected,
  affected,
  onSelect,
  inspectOccupied = false,
  guests = ROOM_GUEST_CATALOG,
  recommended = [],
  onPreview,
}: {
  rooms: Room[];
  auraDefinition?: AuraDefinition | null;
  auraMode?: 'preview' | 'ambient';
  selected?: number | null;
  affected?: number[];
  onSelect?: (roomNumber: number) => void;
  inspectOccupied?: boolean;
  guests?: Guest[];
  recommended?: number[];
  onPreview?: (roomNumber: number | null) => void;
}) {
  const aura = new Set(affected ?? []);
  return (
    <div
      className="hotel-cutaway"
      role="grid"
      aria-label="JUJU HOTEL 30개 객실 배치도"
    >
      {[3, 2, 1].map((floor) => (
        <div className="hotel-floor" role="row" key={floor}>
          <strong>{floor}F</strong>
          <div className="room-row">
            {rooms
              .filter((room) => room.floor === floor)
              .map((room) => {
                const affectedByAura =
                  aura.has(room.roomNumber) && Boolean(auraDefinition);
                const className = [
                  'room-cell',
                  room.status.toLowerCase(),
                  selected === room.roomNumber ? 'selected' : '',
                  recommended.includes(room.roomNumber)
                    ? 'placement-recommended'
                    : '',
                  affectedByAura
                    ? `aura aura-${auraDefinition!.category.toLowerCase()} aura-${auraMode}`
                    : '',
                ].join(' ');
                const content = (
                  <>
                    <RoomContents room={room} guests={guests} />
                    {recommended.includes(room.roomNumber) && (
                      <small
                        className="room-recommendation"
                        aria-label="추천 객실"
                        title="추천 객실"
                      >
                        ★
                      </small>
                    )}
                  </>
                );
                return onSelect ? (
                  <button
                    type="button"
                    role="gridcell"
                    key={room.roomNumber}
                    disabled={!inspectOccupied && !isRoomSelectable(room)}
                    onClick={() => onSelect(room.roomNumber)}
                    onMouseEnter={() => onPreview?.(room.roomNumber)}
                    onMouseLeave={() => onPreview?.(null)}
                    onFocus={() => onPreview?.(room.roomNumber)}
                    onBlur={() => onPreview?.(null)}
                    className={className}
                    aria-label={`${room.roomNumber}호 ${roomCaption(room, guests)}${recommended.includes(room.roomNumber) ? ', 추천 객실' : ''}${affectedByAura ? `, ${auraDefinition!.name} 영향 범위` : ''}`}
                  >
                    {content}
                  </button>
                ) : (
                  <div
                    role="gridcell"
                    key={room.roomNumber}
                    className={className}
                  >
                    {content}
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}

function RoomAssignment({
  state,
  day,
  rooms,
  guest,
  selected,
  mode,
  onSelect,
  onConfirm,
  onCancel,
  onReject,
}: {
  state: GameState;
  day: number;
  rooms: Room[];
  guest: Guest;
  selected: number | null;
  mode: 'checkin' | 'move';
  onSelect: (roomNumber: number | null) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onReject?: () => void;
}) {
  const [hoveredRoom, setHoveredRoom] = useState<number | null>(null);
  const [lastPreviewRoom, setLastPreviewRoom] = useState<number | null>(null);
  const [inspectedNumber, setInspectedNumber] = useState<number | null>(null);
  const [confirmReplacement, setConfirmReplacement] = useState(false);
  const cancelAssignment = useRef(onCancel);
  cancelAssignment.current = onCancel;
  useEffect(() => {
    const body = document.body;
    const previous = body.dataset.roomAssignmentOpen;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const bodyPadding =
      Number.parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.dataset.roomAssignmentOpen = 'true';
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0)
      body.style.paddingRight = `${bodyPadding + scrollbarWidth}px`;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancelAssignment.current();
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      if (previous === undefined) delete body.dataset.roomAssignmentOpen;
      else body.dataset.roomAssignmentOpen = previous;
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, []);
  const profile = getPlacementProfile(guest);
  const fullCapacity = mode === 'checkin' && !rooms.some(isRoomSelectable);
  const tutorial = day === 1 && mode === 'checkin';
  const inspectedRoom = rooms.find(
    (room) =>
      room.roomNumber ===
      (hoveredRoom ?? selected ?? inspectedNumber ?? lastPreviewRoom),
  );
  const selectedResident =
    fullCapacity && selected !== null
      ? state.guests.find(
          (candidate) =>
            candidate.id ===
            rooms.find((room) => room.roomNumber === selected)?.guestId,
        ) ?? null
      : null;
  const inspectedResident = inspectedRoom?.guestId
    ? state.guests.find((candidate) => candidate.id === inspectedRoom.guestId) ??
      null
    : null;
  const replacementBlock = selectedResident
    ? residentReplacementBlockReason(selectedResident)
    : null;
  const capacityComparison = selectedResident
    ? getCapacityComparison(state, selectedResident, guest)
    : null;
  const positionDescription = inspectedRoom
    ? getPlacementDescription(inspectedRoom, rooms)
    : null;
  const recommended = getRecommendedRooms(guest, rooms);
  const inspectedAffected = inspectedRoom
    ? getAffectedRoomNumbers(rooms, {
        ...guest,
        currentRoomNumber: inspectedRoom.roomNumber,
      })
    : [];
  const previewGuest = { ...guest, currentRoomNumber: selected };
  const affected =
    selected === null ? [] : getAffectedRoomNumbers(rooms, previewGuest);
  const inspectedIsRecommended = inspectedRoom
    ? recommended.includes(inspectedRoom.roomNumber)
    : false;
  const inspectedInfluenceCount = inspectedRoom
    ? Math.max(0, inspectedAffected.length - 1)
    : 0;
  const selectedInfluenceCount = Math.max(0, affected.length - 1);
  const showAura = day === 1 || shouldShowAuraOverlay('assignment');
  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label="객실 배정"
      className={`room-screen front-desk-assignment onboarding-day-${Math.min(day, 10)}${fullCapacity ? ' full-capacity-assignment' : ''}`}
    >
      <header>
        <div>
          <p className="eyebrow">JUJU HOTEL · 객실 배치 전략</p>
          <h1>
            {fullCapacity
              ? '객실 만실'
              : `${guest.name} 객실 ${mode === 'move' ? '이동' : '배정'}`}
          </h1>
        </div>
        <div className="day-chip">
          <span>DAY {day}</span>
          <small>
            빈 객실 {rooms.filter(isRoomSelectable).length} · 개방{' '}
            {
              rooms.filter(
                (r) => r.status === 'EMPTY' || r.status === 'OCCUPIED',
              ).length
            }{' '}
            / 30
          </small>
        </div>
      </header>
      {fullCapacity ? (
        <div className="placement-intro capacity-intro" role="status">
          <strong>빈 객실이 없습니다</strong>
          <p>
            기존 주민을 선택해 신규 방문자와 비교하거나, 잠긴 객실의 복구
            조건을 확인하세요. 받지 않으려면 방문자를 거절할 수 있습니다.
          </p>
        </div>
      ) : tutorial ? (
        <div className="placement-intro">
          <strong>첫 번째 객실 배치</strong>
          <p>
            {guest.name}은 주변 객실 주민을 회복시키는 지원형 투숙객입니다.
          </p>
          <p>
            {profile?.recommended === 'CENTER'
              ? '중앙 객실을 추천하지만, 문이 열린 어느 빈 객실이든 선택할 수 있습니다.'
              : '능력과 드러난 특성을 살펴보고 머물 곳을 정하세요.'}
          </p>
        </div>
      ) : (
        day <= 3 &&
        mode === 'checkin' && (
          <OnboardingBanner
            day={day}
            step={
              selected === null
                ? '빈 객실을 하나 선택하세요'
                : `${selected}호를 선택했습니다. 체크인을 확정하세요.`
            }
          />
        )
      )}
      <section className="room-layout">
        <div className="room-board">
          <div className="placement-map-scroll">
            <HotelGrid
              rooms={rooms}
              guests={state.guests}
              auraDefinition={showAura ? guest.aura : null}
              auraMode="preview"
              selected={selected}
              affected={showAura ? inspectedAffected : []}
              inspectOccupied
              onSelect={(number) => {
                setInspectedNumber(number);
                setConfirmReplacement(false);
                const room = rooms.find((candidate) => candidate.roomNumber === number)!;
                onSelect(
                  isRoomSelectable(room) || (fullCapacity && room.occupied)
                    ? number
                    : null,
                );
              }}
              recommended={recommended}
              onPreview={(number) => {
                setHoveredRoom(number);
                if (number !== null) setLastPreviewRoom(number);
              }}
            />
          </div>
          <div className="room-legend">
            <span className="legend-empty">빈 객실</span>
            <span className="legend-locked">잠김·파손</span>
            <span className="legend-recommended">★ 추천</span>
            {guest.aura && <span className="legend-aura">능력 영향</span>}
          </div>
          <div className="room-detail-panel" aria-live="polite">
            <div className="room-detail-content">
              {inspectedResident ? (
                <section className="capacity-room-resident">
                  <strong>
                    {inspectedRoom!.roomNumber}호 · {inspectedResident.name}
                  </strong>
                  <p>
                    {inspectedResident.role} · 현재 담당{' '}
                    {Object.entries(state.staffAssignments)
                      .filter(([, id]) => id === inspectedResident.id)
                      .map(([id]) =>
                        STAFF_DUTIES.find((duty) => duty.id === id)?.name,
                      )
                      .filter(Boolean)
                      .join(', ') || '없음'}
                  </p>
                  <small>
                    {inspectedResident.aura?.name ?? '객실 효과 없음'} · 클릭하면
                    신규 방문자와 비교합니다.
                  </small>
                </section>
              ) : inspectedRoom ? (
                <section
                  className={`placement-room-detail${inspectedIsRecommended ? ' is-recommended' : ''}`}
                >
                  <header>
                    <strong>{inspectedRoom.roomNumber}호</strong>
                    <span>
                      {roomCaption(inspectedRoom, state.guests)} ·{' '}
                      {positionDescription!.title}
                    </span>
                  </header>
                  {inspectedRoom.recovery &&
                  !inspectedRoom.recovery.restored ? (
                    <RoomRecovery
                      key={inspectedRoom.roomNumber}
                      state={state}
                      roomNumber={inspectedRoom.roomNumber}
                      compact
                    />
                  ) : (
                    <p>{positionDescription!.text}</p>
                  )}
                  <footer>
                    {inspectedIsRecommended && profile && (
                      <span className="placement-reason">
                        ★ 추천 객실 · {profile.reason}
                      </span>
                    )}
                    {guest.aura && (
                      <span className="placement-range">
                        <AuraGlyph aura={guest.aura} /> 능력 영향 · 주변{' '}
                        {inspectedInfluenceCount}객실
                      </span>
                    )}
                  </footer>
                </section>
              ) : (
                <p className="room-detail-placeholder">
                  객실을 가리키거나 선택하면 위치와 상태를 확인할 수 있습니다.
                </p>
              )}
            </div>
          </div>
        </div>
        <aside className="aura-preview">
          {fullCapacity ? (
            <FullCapacityPanel
              state={state}
              visitor={guest}
              resident={selectedResident}
              comparison={capacityComparison}
              blockReason={replacementBlock}
              confirming={confirmReplacement}
              onRequestConfirm={() => setConfirmReplacement(true)}
              onCancelConfirm={() => setConfirmReplacement(false)}
              onConfirm={onConfirm}
              onReject={onReject}
              onCancel={onCancel}
            />
          ) : (
            <>
              <div className="assignment-guest-scroll">
                <span className="panel-label">배정할 투숙객</span>
                <h2>{guest.name}</h2>
                <NpcIdentity guest={guest} />
                {guest.aura ? (
                  <div
                    className={`aura-card aura-${guest.aura.category.toLowerCase()}`}
                  >
                    <AuraGlyph aura={guest.aura} size={20} />
                    <div>
                      <strong>{guest.aura.name}</strong>
                      <p>
                        {guest.aura.name === 'Basic Care'
                          ? '주변 객실 주민의 야간 체력 회복 +2'
                          : guest.aura.description}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="system-note">객실에 영향을 주는 능력 없음</p>
                )}
                {profile && (
                  <div className="placement-tip">
                    <strong>배치 팁</strong>
                    <p>
                      {profile.recommended === 'CENTER'
                        ? '지원형 능력은 중앙 객실에서 활용하기 좋습니다.'
                        : '주변 방과 거리를 두는 배치를 고려하세요.'}
                    </p>
                  </div>
                )}
                <section className="room-choice-summary" aria-live="polite">
                  <div>
                    <small>선택 객실</small>
                    <strong>{selected === null ? '—' : `${selected}호`}</strong>
                  </div>
                  <div>
                    <small>영향 범위</small>
                    <strong>
                      {selected === null
                        ? '—'
                        : guest.aura
                          ? `${selectedInfluenceCount}객실`
                          : '없음'}
                    </strong>
                  </div>
                </section>
              </div>
              <div className="assignment-actions">
                <Button variant="secondary" onClick={onCancel}>
                  취소
                </Button>
                <Button
                  className="checkin"
                  disabled={selected === null}
                  onClick={onConfirm}
                >
                  {mode === 'move' ? '이동 확정' : '체크인 확정'}{' '}
                  <ChevronRight />
                </Button>
              </div>
            </>
          )}
        </aside>
      </section>
    </section>
  );
}

function FullCapacityPanel({
  state,
  visitor,
  resident,
  comparison,
  blockReason,
  confirming,
  onRequestConfirm,
  onCancelConfirm,
  onConfirm,
  onReject,
  onCancel,
}: {
  state: GameState;
  visitor: Guest;
  resident: Guest | null;
  comparison: ReturnType<typeof getCapacityComparison> | null;
  blockReason: string | null;
  confirming: boolean;
  onRequestConfirm: () => void;
  onCancelConfirm: () => void;
  onConfirm: () => void;
  onReject?: () => void;
  onCancel: () => void;
}) {
  const [explainedStat, setExplainedStat] = useState<{
    owner: string;
    stat: ProfessionalStat;
  } | null>(null);
  const history = resident
    ? state.eventHistory
        .filter((entry) => entry.message.includes(resident.name))
        .slice(-1)
        .reverse()
    : [];
  return (
    <div className="capacity-panel">
      <div className="capacity-panel-body">
        <span className="panel-label">만실 · 주민 비교</span>
        {!resident || !comparison ? (
          <>
            <h2 className="npc-name-with-rank">
              {visitor.name} <NpcRankBadge guest={visitor} />
            </h2>
            <p>{visitor.role} · 신규 방문자</p>
            <section className="capacity-empty-state">
              <strong>누구의 방을 내어줄까요?</strong>
              <p>
                사용 중인 객실을 선택하면 현재 주민이 맡은 일과 교체 후 소비량을
                비교합니다. 잠긴 객실에서는 복구 조건을 볼 수 있습니다.
              </p>
              <NpcCompactRecord
                guest={visitor}
                onExplain={(owner, stat) => setExplainedStat({ owner, stat })}
              />
            </section>
          </>
        ) : (
          <>
            <div className="capacity-versus">
              <article className="capacity-person current-resident">
                <small>현재 주민</small>
                <strong>
                  {resident.name} <NpcRankBadge guest={resident} />
                </strong>
                <span>{comparison.current.job}</span>
                <NpcCompactRecord
                  guest={resident}
                  resident
                  onExplain={(owner, stat) => setExplainedStat({ owner, stat })}
                />
              </article>
              <article className="capacity-person incoming-visitor">
                <small>신규 방문자</small>
                <strong>
                  {visitor.name} <NpcRankBadge guest={visitor} />
                </strong>
                <span>{comparison.incoming.job}</span>
                <NpcCompactRecord
                  guest={visitor}
                  onExplain={(owner, stat) => setExplainedStat({ owner, stat })}
                />
              </article>
            </div>
            <output className="capacity-stat-explanation" aria-live="polite">
              <strong>
                {explainedStat
                  ? `${explainedStat.owner} · ${explainedStat.stat.label}`
                  : '능력 설명'}
              </strong>
              <span>
                {explainedStat?.stat.help ??
                  'ⓘ를 누르면 두 사람의 실제 전문 수치가 쓰이는 곳을 설명합니다.'}
              </span>
              {explainedStat && (
                <button type="button" onClick={() => setExplainedStat(null)}>
                  닫기
                </button>
              )}
            </output>
            <section className="capacity-impact">
              <strong>교체 후 예상 변화</strong>
              <div>
                <span>식량 소비</span>
                <b>{formatUpkeep(comparison.before.food)} → {formatUpkeep(comparison.after.food)} / DAY</b>
              </div>
              <div>
                <span>물 소비</span>
                <b>{formatUpkeep(comparison.before.water)} → {formatUpkeep(comparison.after.water)} / DAY</b>
              </div>
              <div>
                <span>식량 유지 가능</span>
                <b>
                  {comparison.before.food > 0
                    ? (state.resources.food / comparison.before.food).toFixed(1)
                    : '∞'}{' '}
                  →{' '}
                  {comparison.after.food > 0
                    ? (state.resources.food / comparison.after.food).toFixed(1)
                    : '∞'}일
                </b>
              </div>
              <div>
                <span>물 유지 가능</span>
                <b>
                  {comparison.before.water > 0
                    ? (state.resources.water / comparison.before.water).toFixed(1)
                    : '∞'}{' '}
                  →{' '}
                  {comparison.after.water > 0
                    ? (state.resources.water / comparison.after.water).toFixed(1)
                    : '∞'}일
                </b>
              </div>
              <p className="capacity-loss">
                잃는 것 · {comparison.current.duties.length
                  ? `${comparison.current.duties.join(', ')} 해제`
                  : '현재 담당 업무 없음'}
                {resident.aura ? ` · ${resident.aura.name} 객실 효과 중단` : ''}
              </p>
              <p className="capacity-gain">
                얻는 것 · {comparison.incoming.duties.join(', ')}
                {visitor.aura ? ` · ${visitor.aura.name} 객실 효과` : ''}
              </p>
            </section>
            <section className="capacity-history">
              <strong>호텔에서의 기록</strong>
              <p>
                거주 {comparison.current.days}일 · 객실 복구{' '}
                {comparison.current.repairs}회 · 신뢰 {resident.trust}
              </p>
              {history.map((entry, index) => (
                <small key={`${entry.day}-${index}`}>DAY {entry.day} · {entry.message}</small>
              ))}
            </section>
            {blockReason && <p className="capacity-block">퇴실 불가 · {blockReason}</p>}
          </>
        )}
      </div>
      <div className="assignment-actions capacity-actions">
        <Button variant="secondary" onClick={onCancel}>배정 취소</Button>
        <Button variant="outline" className="visitor-refuse" onClick={onReject}>
          방문자 거절
        </Button>
        <Button
          className="checkin"
          disabled={!resident || Boolean(blockReason)}
          onClick={onRequestConfirm}
        >
          기존 주민과 교체
        </Button>
      </div>
      {confirming && resident && (
        <div className="capacity-confirm" role="group" aria-label="주민 교체 확인">
          <strong>{resident.name} 퇴실 후 {visitor.name} 체크인을 확정할까요?</strong>
          <p>
            {resident.name}의 담당 업무와 객실 효과가 해제됩니다. 이 결정은 되돌릴
            수 없습니다.
          </p>
          <div>
            <Button variant="secondary" onClick={onCancelConfirm}>취소</Button>
            <Button variant="destructive" onClick={onConfirm}>교체 확정</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StaffOperations({
  state,
  stayingGuests,
  onAssign,
  onScavenge,
}: {
  state: UiSave;
  stayingGuests: Guest[];
  onAssign: (dutyId: StaffDutyId, guestId: string | null) => void;
  onScavenge: (missionId: ScavengeMissionId) => void;
}) {
  const [view, setView] = useState<'duties' | 'scavenge'>('duties');
  const scout = getAssignedStaff(state, 'SCAVENGE');
  const done = state.lastScavengeDay === state.day;
  const resourceLabel: Record<keyof GameState['resources'], string> = {
    food: '식량',
    water: '물',
    medicine: '의약품',
    fuel: '연료',
    parts: '부품',
    security: '보안 물자',
  };
  return (
    <>
      <section className="staff-operations" aria-label="투숙객 근무 및 탐색">
        <nav className="panel-tabs" aria-label="주민 업무 분류">
          <button
            type="button"
            aria-pressed={view === 'duties'}
            onClick={() => setView('duties')}
          >
            호텔 업무
          </button>
          <button
            type="button"
            aria-pressed={view === 'scavenge'}
            onClick={() => setView('scavenge')}
          >
            외부 탐색
          </button>
        </nav>
        {view === 'duties' && (
          <>
            <div className="staff-heading">
              <span className="panel-label">투숙객 근무 배치</span>
              <small>한 사람당 한 역할 · 야간 자동 정산</small>
            </div>
            <div className="staff-grid">
              {STAFF_DUTIES.map((duty) => (
                <label key={duty.id}>
                  <strong>{duty.name}</strong>
                  <small>{duty.description}</small>
                  <select
                    aria-label={`${duty.name} 담당자`}
                    value={state.staffAssignments[duty.id] ?? ''}
                    onChange={(event) =>
                      onAssign(duty.id, event.target.value || null)
                    }
                  >
                    <option value="">미배치</option>
                    {stayingGuests.map((resident) => (
                      <option key={resident.id} value={resident.id}>
                        {resident.name} · {duty.skillLabel}{' '}
                        {resident.skills[duty.skill]}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </>
        )}
        {view === 'scavenge' && (
          <>
            <div className="staff-heading">
              <span className="panel-label">외부 탐색 · 1 AP</span>
              <small>
                {scout
                  ? `${scout.name} · 탐색 ${scout.skills.scavenge}`
                  : '외부 정찰 담당자를 배치하십시오.'}
              </small>
            </div>
            <div className="scavenge-grid">
              {SCAVENGE_MISSIONS.map((mission) => {
                const route = getScavengeRouteModifiers(
                  mission.id,
                  state.flags.safe_routes_mapped === true,
                );
                const chancePlan = scout
                  ? getScavengeChanceBreakdown(scout, mission.id, route.active)
                  : null;
                const chance = chancePlan?.chance ?? 0;
                const cost =
                  Object.entries(mission.cost)
                    .map(
                      ([key, value]) =>
                        `${resourceLabel[key as keyof GameState['resources']]} ${value}`,
                    )
                    .join(' · ') || '준비 자원 없음';
                const reward = Object.entries(mission.rewards)
                  .map(
                    ([key, value]) =>
                      `${resourceLabel[key as keyof GameState['resources']]} +${value}`,
                  )
                  .join(' · ');
                return (
                  <article key={mission.id}>
                    <strong>{mission.name}</strong>
                    <p>{mission.description}</p>
                    <small>
                      성공 가능성 {chance}% · {cost}
                      <br />
                      기본 회수 {reward}
                      {route.active ? (
                        <>
                          <br />
                          안전 통로 ·{' '}
                          {chancePlan && chancePlan.appliedChanceBonus === 0
                            ? '성공률 상한'
                            : `성공 최대 +${chancePlan?.appliedChanceBonus ?? route.chanceBonus}%`}{' '}
                          · 노출 -{route.exposureReduction}
                        </>
                      ) : null}
                    </small>
                    <Button
                      disabled={!canRunScavengeMission(state, mission.id)}
                      onClick={() => onScavenge(mission.id)}
                    >
                      {done ? '오늘 탐색 완료' : '탐색 출발'}
                    </Button>
                  </article>
                );
              })}
            </div>
            {state.lastScavengeReport?.day === state.day && (
              <p
                className={`scavenge-report outcome-${state.lastScavengeReport.outcome.toLowerCase()}`}
              >
                {state.lastScavengeReport.message} · 판정{' '}
                {state.lastScavengeReport.roll}/
                {state.lastScavengeReport.chance}
              </p>
            )}
          </>
        )}
      </section>
      <MonsterCodexPanel state={state} />
    </>
  );
}

function InvestigationPanel({
  state,
  onInvestigate,
  onConclude,
}: {
  state: UiSave;
  onInvestigate: (
    caseId: InvestigationCaseId,
    pointId: InvestigationPointId,
  ) => void;
  onConclude: (
    caseId: InvestigationCaseId,
    conclusionId: InvestigationConclusionId,
  ) => void;
}) {
  const [casePage, setCasePage] = useState(0);
  if (!state.investigationCases.length) return null;
  const safeCasePage = Math.min(casePage, state.investigationCases.length - 1);
  const assessmentLabel = {
    UNKNOWN: '미확인',
    SUPPORTED: '증거 지지',
    CONTRADICTED: '증거 모순',
  } as const;
  const statusLabel = {
    OPEN: '사건 개시',
    INVESTIGATING: '조사 중',
    SOLVED: '결론 기록',
    UNRESOLVED: '미해결 봉인',
  } as const;
  return (
    <section className="investigation-panel" aria-label="호텔 조사 사건">
      <div className="staff-heading">
        <span className="panel-label">INVESTIGATION · 호텔 사건</span>
        <small>현장 조사 1 AP · 증거를 모아 직접 결론 선택</small>
      </div>
      {state.investigationCases
        .slice(safeCasePage, safeCasePage + 1)
        .map((caseState) => {
          const definition = getInvestigationCaseDefinition(caseState.caseId);
          if (!definition) return null;
          const active =
            caseState.status === 'OPEN' || caseState.status === 'INVESTIGATING';
          const canConclude = canConcludeInvestigationCase(
            state,
            caseState.caseId,
          );
          const selectedConclusion = definition.conclusions.find(
            (entry) => entry.id === caseState.conclusionId,
          );
          return (
            <article
              className={`investigation-case-file status-${caseState.status.toLowerCase()}`}
              key={caseState.caseId}
            >
              <header>
                <div>
                  <strong>{definition.title}</strong>
                  <p>{definition.summary}</p>
                </div>
                <span>
                  {statusLabel[caseState.status]} · 증거{' '}
                  {caseState.collectedEvidenceIds.length}/
                  {definition.points.length}
                </span>
              </header>
              <div className="investigation-points">
                {definition.points.map((point) => {
                  const inspected = caseState.inspectedPointIds.includes(
                    point.id,
                  );
                  return (
                    <button
                      type="button"
                      key={point.id}
                      disabled={
                        !canInvestigateCasePoint(
                          state,
                          caseState.caseId,
                          point.id,
                        )
                      }
                      onClick={() => onInvestigate(caseState.caseId, point.id)}
                    >
                      <Search size={16} />
                      <span>
                        <b>{point.name}</b>
                        <small>
                          {inspected ? point.finding : point.description}
                        </small>
                      </span>
                      <em>{inspected ? '증거 확보' : '1 AP'}</em>
                    </button>
                  );
                })}
              </div>
              {caseState.collectedEvidenceIds.length > 0 && (
                <div className="evidence-list">
                  {caseState.collectedEvidenceIds.map((evidenceId) => {
                    const evidence = getEvidenceDefinition(evidenceId);
                    return evidence ? (
                      <div key={evidence.id}>
                        <Inspect size={15} />
                        <span>
                          <b>{evidence.name}</b>
                          <small>{evidence.description}</small>
                        </span>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
              <div className="case-conclusions">
                <strong>사건 결론</strong>
                <small>
                  {canConclude
                    ? '수집한 증거를 바탕으로 하나의 결론을 기록할 수 있습니다.'
                    : `증거 ${definition.minimumEvidenceToConclude}개를 모아야 결론을 선택할 수 있습니다.`}
                </small>
                {definition.conclusions.map((conclusion) => {
                  const assessment = assessInvestigationConclusion(
                    caseState,
                    caseState.caseId,
                    conclusion.id,
                  );
                  return (
                    <button
                      type="button"
                      key={conclusion.id}
                      className={`assessment-${assessment.toLowerCase()} ${caseState.conclusionId === conclusion.id ? 'selected' : ''}`}
                      disabled={!active || !canConclude}
                      onClick={() =>
                        onConclude(caseState.caseId, conclusion.id)
                      }
                    >
                      <span>
                        <b>{conclusion.label}</b>
                        <small>{conclusion.description}</small>
                      </span>
                      <em>
                        {caseState.conclusionId === conclusion.id
                          ? '채택됨'
                          : assessmentLabel[assessment]}
                      </em>
                    </button>
                  );
                })}
              </div>
              {selectedConclusion && (
                <p className="case-result">
                  최종 기록 · {selectedConclusion.label}
                </p>
              )}
            </article>
          );
        })}
      {state.investigationCases.length > 1 && (
        <nav className="game-pagination" aria-label="조사 사건 페이지">
          <Button
            variant="outline"
            disabled={safeCasePage === 0}
            onClick={() => setCasePage(safeCasePage - 1)}
          >
            ‹ 이전
          </Button>
          <span>
            {safeCasePage + 1} / {state.investigationCases.length}
          </span>
          <Button
            variant="outline"
            disabled={safeCasePage === state.investigationCases.length - 1}
            onClick={() => setCasePage(safeCasePage + 1)}
          >
            다음 ›
          </Button>
        </nav>
      )}
    </section>
  );
}

function MonsterCodexPanel({ state }: { state: UiSave }) {
  const [page, setPage] = useState(0);
  if (!state.monsterCodex.length) return null;
  const safePage = Math.min(page, state.monsterCodex.length - 1);
  const certaintyLabel = {
    RUMOR: '미확인 제보',
    CORROBORATED: '교차 확인',
    VERIFIED: '현장 검증',
  } as const;
  return (
    <section className="monster-codex-panel" aria-label="괴물 관찰 기록">
      <div className="staff-heading">
        <span className="panel-label">MONSTER CODEX · 행동 기록</span>
        <small>
          미확인 제보는 낮은 신뢰도로 보존되며, 교차 확인과 현장 검증이 야간
          대응책을 해금합니다.
        </small>
      </div>
      {state.monsterCodex.slice(safePage, safePage + 1).map((entry) => {
        const definition = getMonsterCodexDefinition(entry.entryId);
        if (!definition) return null;
        const ready = hasMonsterCountermeasure(state, entry.entryId);
        const evidenceScore = getMonsterEvidenceScore(state, entry.entryId);
        const sources = entry.sourceIds
          .map(getMonsterKnowledgeSourceDefinition)
          .filter((source) => source !== null);
        return (
          <article
            className={`codex-entry ${ready ? 'countermeasure-ready' : ''}`}
            key={entry.entryId}
          >
            <header>
              <BookOpen size={20} />
              <div>
                <strong>{definition.name}</strong>
                <small>{definition.classification}</small>
              </div>
              <em>
                대응 근거 {evidenceScore}/{definition.tacticalThreshold}
              </em>
            </header>
            <p>{definition.description}</p>
            <div className="codex-insights">
              {definition.insights.map((insight) => {
                const unlocked = entry.insightIds.includes(insight.id);
                return (
                  <div
                    key={insight.id}
                    className={unlocked ? 'unlocked' : 'locked'}
                  >
                    <Search size={14} />
                    <span>
                      <b>{unlocked ? insight.name : '미확인 행동'}</b>
                      <small>
                        {unlocked
                          ? insight.description
                          : '추가 진술이나 현장 증거가 필요합니다.'}
                      </small>
                    </span>
                  </div>
                );
              })}
            </div>
            {sources.length > 0 && (
              <div className="codex-sources" aria-label="Codex 근거 기록">
                {sources.map((source) => (
                  <span
                    className={`certainty-${source.certainty.toLowerCase()}`}
                    key={source.id}
                  >
                    <b>{certaintyLabel[source.certainty]}</b>
                    {source.name} · +{getMonsterSourceWeight(source.id)}
                  </span>
                ))}
              </div>
            )}
            <div
              className={`codex-countermeasure ${ready ? 'ready' : 'pending'}`}
            >
              <Shield size={16} />
              <span>
                <b>{ready ? '야간 대응 준비 완료' : '대응 분석 중'}</b>
                <small>
                  {ready
                    ? definition.countermeasure
                    : `신뢰도 ${Math.max(0, definition.tacticalThreshold - evidenceScore)}를 더 확보하십시오.`}
                </small>
              </span>
            </div>
          </article>
        );
      })}
      {state.monsterCodex.length > 1 && (
        <nav className="game-pagination" aria-label="도감 페이지">
          <Button
            variant="outline"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
          >
            ‹ 이전
          </Button>
          <span>
            {safePage + 1} / {state.monsterCodex.length}
          </span>
          <Button
            variant="outline"
            disabled={safePage === state.monsterCodex.length - 1}
            onClick={() => setPage(safePage + 1)}
          >
            다음 ›
          </Button>
        </nav>
      )}
    </section>
  );
}

type FrontDeskPanel =
  | 'ledger'
  | 'rooms'
  | 'guests'
  | 'resources'
  | 'staff'
  | 'events'
  | 'codex'
  | 'advanced';

function FrontDeskTools({
  initialPanel,
  hasVisitor,
  assignmentOpen,
  state,
  guest,
  stayingGuests,
  hasStayingGuest,
  onSelectGuest,
  onBuild,
  onAction,
  onPower,
  onRation,
  onNightPreparation,
  onStaff,
  onScavenge,
  onInvestigate,
  onConclude,
  onMove,
  onCheckout,
  onStartEnding,
  onContinue,
}: {
  initialPanel?: FrontDeskPanel;
  hasVisitor: boolean;
  assignmentOpen: boolean;
  state: UiSave;
  guest: Guest;
  stayingGuests: Guest[];
  hasStayingGuest: boolean;
  onSelectGuest: (guestId: string) => void;
  onBuild: (id: FacilityId) => void;
  onAction: (id: HotelActionId) => void;
  onPower: (id: PowerCircuitId, enabled: boolean) => void;
  onRation: (policy: FoodRationPolicy) => void;
  onNightPreparation: (
    category: NightPreparationCategory,
    optionId: NightPreparationOptionId,
  ) => void;
  onStaff: (dutyId: StaffDutyId, guestId: string | null) => void;
  onScavenge: (missionId: ScavengeMissionId) => void;
  onInvestigate: (
    caseId: InvestigationCaseId,
    pointId: InvestigationPointId,
  ) => void;
  onConclude: (
    caseId: InvestigationCaseId,
    conclusionId: InvestigationConclusionId,
  ) => void;
  onMove: () => void;
  onCheckout: () => void;
  onStartEnding: (id: GameState['availableEndings'][number]) => void;
  onContinue: () => void;
}) {
  const [panel, setPanel] = useState<FrontDeskPanel | null>(
    initialPanel ?? null,
  );
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (
        !canUseShortcut(
          event,
          event.target as Element,
          !!document.querySelector('[role="dialog"]'),
        )
      )
        return;
      if (['1', '2', '3'].includes(event.key)) {
        event.preventDefault();
        setPanel(
          event.key === '1' ? null : event.key === '2' ? 'rooms' : 'guests',
        );
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);
  const [guestNote, setGuestNote] = useState<
    'dialogue' | 'status' | 'residence' | null
  >(null);
  const [guestPage, setGuestPage] = useState(0);
  const [auraGuestId, setAuraGuestId] = useState<string | null>(null);
  const [inspectedRoomNumber, setInspectedRoomNumber] = useState<number | null>(
    null,
  );
  const [generatorInspected, setGeneratorInspected] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const onboarding = getOnboardingGuide(state.day);
  const latestEvent = state.eventHistory.at(-1);
  const pendingFrontEvent = !hasVisitor ? getPendingStoryChoice(state) : null;
  const centralTitle =
    pendingFrontEvent?.title ??
    (state.day === 1 && !hasVisitor
      ? '오늘의 방문객 응대를 마쳤습니다'
      : onboarding.title);
  const centralInstruction =
    pendingFrontEvent?.description ??
    (state.day === 1 && !hasVisitor
      ? '장부와 투숙객을 확인한 뒤 오늘 영업을 마감하세요. 밤에 선택의 결과를 확인합니다.'
      : onboarding.instruction);
  const latestCheckin = [...state.eventHistory]
    .reverse()
    .find((entry) => entry.day === state.day && entry.type === 'CHECK_IN');
  const affected = hasStayingGuest
    ? getAffectedRoomNumbers(state.rooms, guest)
    : [];
  const showAura =
    hasStayingGuest &&
    Boolean(guest.aura) &&
    shouldShowAuraOverlay('management', auraGuestId === guest.id);
  const powerCapacity = getPowerCapacity(
    state.resources.fuel,
    state.flags.generator_network_stable === true,
  );
  const activePower = getActivePowerCircuits(state);
  const preparationPlan = getNightPreparationPlan(state);
  const occupiedRooms = state.rooms.filter((room) => room.guestId).length;
  const todayCheckins = state.eventHistory.filter(
    (entry) => entry.day === state.day && entry.type === 'CHECK_IN',
  ).length;
  const todayCheckouts = state.eventHistory.filter(
    (entry) => entry.day === state.day && entry.type === 'CHECK_OUT',
  ).length;
  const dailyDemand = stayingGuests.length;
  const living = getLivingForecast(state);
  const basicPower = calculatePowerPlan(state, dailyDemand);
  const foodDemand = living.food;
  const fuelDemand = basicPower.fuelDemand + preparationPlan.fuelCost;
  const foodDays = foodDemand ? state.resources.food / foodDemand : Infinity;
  const waterDays = living.waterDays ?? Infinity;
  const medicineLow =
    state.resources.medicine < Math.max(2, stayingGuests.length);
  const infectionRisk = stayingGuests.some((resident) => resident.health < 45)
    ? '높음'
    : stayingGuests.some((resident) => resident.health < 70)
      ? '주의'
      : '낮음';
  const unresolved =
    state.day === 6
      ? [
          !state.staffAssignments.MAINTENANCE ? '정비 담당자 지정' : null,
          !generatorInspected ? '발전기실 조사' : null,
        ].filter((item): item is string => item !== null)
      : [];
  const goalProgress =
    state.day === 6 ? `${2 - unresolved.length} / 2 완료` : '진행 상황 보기';
  const guestPageSize = 5;
  const guestPageCount = Math.max(
    1,
    Math.ceil(stayingGuests.length / guestPageSize),
  );
  const safeGuestPage = Math.min(guestPage, guestPageCount - 1);
  const visibleGuests = stayingGuests.slice(
    safeGuestPage * guestPageSize,
    (safeGuestPage + 1) * guestPageSize,
  );

  const quickMenus: Array<{
    id: FrontDeskPanel;
    label: string;
    unlockDay: number;
    icon: ReactNode;
  }> = [
    { id: 'ledger', label: '호텔 장부', unlockDay: 1, icon: <BookOpen /> },
    { id: 'guests', label: '주민', unlockDay: 1, icon: <HeartPulse /> },
    { id: 'rooms', label: '객실', unlockDay: 1, icon: <LayoutGrid /> },
    { id: 'resources', label: '자원', unlockDay: 4, icon: <Soup /> },
    {
      id: 'staff',
      label: '주민 업무',
      unlockDay: 5,
      icon: <BriefcaseBusiness />,
    },
    { id: 'advanced', label: '호텔 운영', unlockDay: 7, icon: <Wrench /> },
    { id: 'events', label: '사건 기록', unlockDay: 9, icon: <ScrollText /> },
    { id: 'codex', label: '도감', unlockDay: 10, icon: <BookOpen /> },
  ];

  const openGoalPanel = () => {
    if (state.day === 2) setPanel('rooms');
    else if (state.day === 3) setPanel('guests');
    else if (state.day === 5 || state.day === 6) setPanel('staff');
    else if (state.day === 8) setPanel('staff');
    else if (state.day === 9) setPanel('events');
    else if (state.day >= 10) setPanel('codex');
    else if (state.day >= 4 && state.day <= 7) setPanel('resources');
    else setPanel('ledger');
  };

  const tryCloseDay = () => {
    if (unresolved.length) setConfirmClose(true);
    else onContinue();
  };

  return (
    <div
      className={`front-desk-tools ${assignmentOpen ? 'assignment-open' : ''}`}
    >
      <nav className="front-desk-quick" aria-label="호텔 퀵메뉴">
        {quickMenus
          .filter((item) => item.id !== 'advanced' && item.id !== 'resources')
          .map((item) => {
            const unlocked = state.day >= item.unlockDay;
            return (
              <button
                type="button"
                key={item.id}
                data-panel={item.id}
                title={
                  unlocked
                    ? item.label
                    : `DAY ${item.unlockDay}부터 이용할 수 있습니다`
                }
                disabled={!unlocked}
                className={panel === item.id ? 'active' : ''}
                aria-label={
                  unlocked
                    ? item.label
                    : `${item.label} DAY ${item.unlockDay} 해금`
                }
                onClick={() => setPanel(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.id === 'guests' &&
                  stayingGuests.some(
                    (g) => g.health < 70 || g.infectionState !== 'HEALTHY',
                  ) && (
                    <small className="menu-alert">
                      주의{' '}
                      {
                        stayingGuests.filter(
                          (g) =>
                            g.health < 70 || g.infectionState !== 'HEALTHY',
                        ).length
                      }
                    </small>
                  )}
                {!unlocked && <small>DAY {item.unlockDay}</small>}
              </button>
            );
          })}
      </nav>

      <button type="button" className="front-desk-goal" onClick={openGoalPanel}>
        <small>오늘의 목표</small>
        <strong>
          {hasVisitor ? '방문객의 사정을 듣고 입실을 결정하세요' : centralTitle}
        </strong>
        <span>{goalProgress}</span>
      </button>

      {!hasVisitor && (
        <section className="front-desk-scene" aria-label="현재 프론트 사건">
          <article className="front-desk-event">
            <span className="panel-label">현재 가장 중요한 일</span>
            <h2>{centralTitle}</h2>
            <p>{centralInstruction}</p>
            {latestCheckin && (
              <output className="front-desk-feedback">
                <BedDouble />
                <span>
                  <strong>객실 배정 완료</strong>
                  {latestCheckin.message}
                </span>
              </output>
            )}
            {state.day === 6 && !pendingFrontEvent && (
              <GeneratorIncident
                guests={stayingGuests}
                assignedGuestId={state.staffAssignments.MAINTENANCE ?? null}
                inspected={generatorInspected}
                onInspect={() => setGeneratorInspected(true)}
                onAssign={(guestId) => onStaff('MAINTENANCE', guestId)}
              />
            )}
            {state.day !== 6 && latestEvent && (
              <p className="front-desk-last-event">
                <span>최근 기록</span>
                {latestEvent.message}
              </p>
            )}
            <Button className="front-desk-primary" onClick={tryCloseDay}>
              {pendingFrontEvent ? '사건 확인 후 오늘 마감' : '오늘 영업 마감'}{' '}
              <ChevronRight />
            </Button>
            <small className="front-desk-primary-note">
              마감 후 호텔을 순회하며 작업합니다. 순회를 마치면 밤의 사건과
              결과로 이어집니다.
            </small>
          </article>
        </section>
      )}

      {panel && !assignmentOpen && (
        <div
          className="front-desk-overlay"
          role="presentation"
          onMouseDown={() => setPanel(null)}
        >
          <aside
            className="front-desk-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={quickMenus.find((item) => item.id === panel)?.label}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <small>JUJU HOTEL · DAY {state.day}</small>
                <h2>{quickMenus.find((item) => item.id === panel)?.label}</h2>
              </div>
              <button
                type="button"
                className="modal-close-button"
                aria-label="패널 닫기"
                onClick={() => setPanel(null)}
              >
                <X />
              </button>
            </header>

            {panel === 'ledger' && (
              <div className="ledger-panel">
                <section className="ledger-summary">
                  <article>
                    <span>객실</span>
                    <strong>
                      {occupiedRooms} /{' '}
                      {
                        state.rooms.filter(
                          (r) =>
                            r.status === 'EMPTY' || r.status === 'OCCUPIED',
                        ).length
                      }{' '}
                      개방 객실
                    </strong>
                    <small>사용 중</small>
                  </article>
                  <article>
                    <span>투숙객</span>
                    <strong>{stayingGuests.length}명</strong>
                    <small>현재 체류</small>
                  </article>
                  <article>
                    <span>오늘 입실</span>
                    <strong>{todayCheckins}명</strong>
                    <small>프론트 기록</small>
                  </article>
                  <article>
                    <span>오늘 퇴실</span>
                    <strong>{todayCheckouts}명</strong>
                    <small>프론트 기록</small>
                  </article>
                </section>
                <section className="ledger-vitals">
                  <article className={foodDays < 2 ? 'danger' : ''}>
                    <span>식량</span>
                    <strong>
                      {state.resources.food} ·{' '}
                      {Number.isFinite(foodDays)
                        ? `${foodDays.toFixed(1)}일분`
                        : '현재 소비 없음'}
                    </strong>
                  </article>
                  <article className={waterDays < 2 ? 'danger' : ''}>
                    <span>물</span>
                    <strong>
                      {state.resources.water} ·{' '}
                      {Number.isFinite(waterDays)
                        ? `${waterDays.toFixed(1)}일분`
                        : '현재 소비 없음'}
                    </strong>
                  </article>
                  <article className={medicineLow ? 'danger' : ''}>
                    <span>의약품</span>
                    <strong>
                      {state.resources.medicine} ·{' '}
                      {medicineLow ? '부족' : '보통'}
                    </strong>
                  </article>
                  <article>
                    <span>호텔 안전도</span>
                    <strong>{state.hotelStats.security}%</strong>
                  </article>
                  <article>
                    <span>호텔 상태</span>
                    <strong>{state.hotelStats.hotelCondition}%</strong>
                  </article>
                  <article className={infectionRisk === '높음' ? 'danger' : ''}>
                    <span>감염 위험</span>
                    <strong>{infectionRisk}</strong>
                  </article>
                </section>
                <section className="ledger-priority">
                  <p>
                    연료 {state.resources.fuel} · 부품 {state.resources.parts} ·
                    빈 방 {state.rooms.filter(isRoomSelectable).length}
                  </p>
                  <p className="ledger-consumption">
                    오늘 예상 소비: 식량 {foodDemand} · 물 {dailyDemand} · 연료{' '}
                    {fuelDemand}
                    <br />
                    현재 인원·배급·전력 기준이며 사건과 능력 효과에 따라
                    달라집니다.
                  </p>
                  <div className="ledger-shortcuts">
                    <Button
                      variant="secondary"
                      disabled={state.day < 4}
                      onClick={() => setPanel('resources')}
                    >
                      배급 변경{state.day < 4 ? ' · DAY 4' : ''}
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={state.day < 6}
                      onClick={() => setPanel('resources')}
                    >
                      발전기 설정{state.day < 6 ? ' · DAY 6' : ''}
                    </Button>
                  </div>
                  <small>현재 최우선 목표</small>
                  <strong>{onboarding.title}</strong>
                  <p>{onboarding.instruction}</p>
                </section>
                <HotelArchive state={state} onStartEnding={onStartEnding} />
              </div>
            )}

            {panel === 'rooms' && (
              <div className="hub-rooms-panel">
                <div className="room-board-toolbar">
                  <span>
                    객실을 클릭하지 않아도 현재 배치를 한눈에 볼 수 있습니다.
                  </span>
                  <Button
                    variant="secondary"
                    disabled={state.day < 2 || !hasStayingGuest || !guest.aura}
                    aria-pressed={showAura}
                    onClick={() =>
                      setAuraGuestId((id) => toggleAuraGuestId(id, guest.id))
                    }
                  >
                    Aura {showAura ? '숨기기' : '보기'}
                  </Button>
                </div>
                <HotelGrid
                  rooms={state.rooms}
                  guests={state.guests}
                  inspectOccupied
                  selected={inspectedRoomNumber}
                  onSelect={(number) => {
                    setInspectedRoomNumber(number);
                    const occupantId = state.rooms.find(
                      (room) => room.roomNumber === number,
                    )?.guestId;
                    if (occupantId) onSelectGuest(occupantId);
                  }}
                  auraDefinition={showAura ? guest.aura : null}
                  auraMode="ambient"
                  affected={showAura ? affected : []}
                />
                {inspectedRoomNumber !== null && (
                  <div className="guest-inline-note">
                    <strong>{inspectedRoomNumber}호</strong>
                    <p>
                      {getRoomOccupantLabel(
                        state.rooms.find(
                          (room) => room.roomNumber === inspectedRoomNumber,
                        )!,
                        state.guests,
                      )}
                    </p>
                    {state.rooms.find(
                      (room) => room.roomNumber === inspectedRoomNumber,
                    )?.guestId && (
                      <Button
                        variant="secondary"
                        onClick={() => setPanel('guests')}
                      >
                        투숙객 관리
                      </Button>
                    )}
                    <RoomRecovery
                      key={inspectedRoomNumber}
                      state={state}
                      roomNumber={inspectedRoomNumber}
                    />
                  </div>
                )}
              </div>
            )}

            {panel === 'guests' && (
              <div className="hub-guests-panel">
                <div className="guest-list" role="list">
                  {stayingGuests.length ? (
                    visibleGuests.map((resident) => (
                      <button
                        type="button"
                        role="listitem"
                        key={resident.id}
                        className={resident.id === guest.id ? 'active' : ''}
                        onClick={() => onSelectGuest(resident.id)}
                      >
                        <span className="guest-list-avatar">
                          {resident.portrait ? (
                            <img
                              src={resident.portrait}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            resident.name.slice(0, 1)
                          )}
                        </span>
                        <span>
                          <strong>{resident.name}</strong>
                          <small>
                            <NpcRankBadge guest={resident} /> {resident.role} ·{' '}
                            {resident.currentRoomNumber}호
                          </small>
                        </span>
                        <em>
                          {resident.health < 55 ? '치료 필요' : '체류 중'}
                        </em>
                      </button>
                    ))
                  ) : (
                    <p className="empty-panel">
                      현재 투숙 중인 사람이 없습니다.
                    </p>
                  )}
                  {guestPageCount > 1 && (
                    <nav
                      className="game-pagination"
                      aria-label="주민 목록 페이지"
                    >
                      <Button
                        variant="outline"
                        disabled={safeGuestPage === 0}
                        onClick={() => setGuestPage(safeGuestPage - 1)}
                      >
                        ‹
                      </Button>
                      <span>
                        {safeGuestPage + 1} / {guestPageCount}
                      </span>
                      <Button
                        variant="outline"
                        disabled={safeGuestPage === guestPageCount - 1}
                        onClick={() => setGuestPage(safeGuestPage + 1)}
                      >
                        ›
                      </Button>
                    </nav>
                  )}
                </div>
                {hasStayingGuest && (
                  <article className="guest-detail-card">
                    <small>투숙객 상세</small>
                    <h3 className="npc-name-with-rank">
                      {guest.name} <NpcRankBadge guest={guest} />
                    </h3>
                    <p>
                      {guest.currentRoomNumber}호 · {guest.role}
                    </p>
                    <dl>
                      <div>
                        <dt>상태</dt>
                        <dd>
                          {guest.health < 55 ? '회복이 필요함' : '안정적'}
                        </dd>
                      </div>
                      <div>
                        <dt>현재 업무</dt>
                        <dd>
                          {STAFF_DUTIES.find(
                            (duty) =>
                              state.staffAssignments[duty.id] === guest.id,
                          )?.name ?? '휴식'}
                        </dd>
                      </div>
                    </dl>
                    {guestNote !== 'residence' && (
                      <NpcProfileLedger guest={guest} resident />
                    )}
                    <div className="guest-detail-actions">
                      <Button
                        variant="secondary"
                        onClick={() => setGuestNote('dialogue')}
                      >
                        대화
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setGuestNote('status')}
                      >
                        상태 확인
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setPanel(null);
                          onMove();
                        }}
                      >
                        객실 이동
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={state.day < 5}
                        onClick={() => setPanel('staff')}
                      >
                        업무 변경
                      </Button>
                      <Button
                        variant="secondary"
                        className="danger-action"
                        onClick={() =>
                          setGuestNote((current) =>
                            current === 'residence' ? null : 'residence',
                          )
                        }
                      >
                        거주 정보
                      </Button>
                    </div>
                    {guestNote === 'residence' ? (
                      <ResidentDetails
                        key={guest.id}
                        state={state}
                        guest={guest}
                        onExpel={() => onCheckout()}
                      />
                    ) : guestNote ? (
                      <p className="guest-inline-note">
                        {guestNote === 'dialogue'
                          ? `처음 프론트에서 남긴 말: ${guest.introDialogue}`
                          : `${guest.conditionLabel} · ${getGuestVisualState(guest).label}`}
                      </p>
                    ) : null}
                  </article>
                )}
              </div>
            )}

            {panel === 'resources' && (
              <div className="hub-resources-panel">
                <section className="resource-strip">
                  <span>
                    식량 <b>{state.resources.food}</b>
                  </span>
                  <span>
                    물 <b>{state.resources.water}</b>
                  </span>
                  <span>
                    연료 <b>{state.resources.fuel}</b>
                  </span>
                  <span>
                    의약품 <b>{state.resources.medicine}</b>
                  </span>
                </section>
                {state.day >= 4 && (
                  <div className="ration-plan">
                    <strong>식량 배급</strong>
                    {RATION_POLICIES.map((policy) => (
                      <button
                        key={policy.id}
                        type="button"
                        aria-pressed={state.foodRationPolicy === policy.id}
                        className={
                          state.foodRationPolicy === policy.id ? 'selected' : ''
                        }
                        onClick={() => onRation(policy.id)}
                      >
                        <span>{policy.name}</span>
                        <small>{policy.description}</small>
                      </button>
                    ))}
                  </div>
                )}
                {state.day >= 6 && (
                  <div className="power-plan">
                    <strong>
                      전력 배분 · {activePower.length}/{powerCapacity} 회로
                    </strong>
                    {POWER_CIRCUITS.map((circuit) => {
                      const selected = state.powerAllocation.includes(
                        circuit.id,
                      );
                      const active = activePower.includes(circuit.id);
                      return (
                        <button
                          key={circuit.id}
                          type="button"
                          aria-pressed={selected}
                          className={`${selected ? 'selected' : ''} ${active ? 'active' : 'standby'}`}
                          onClick={() => onPower(circuit.id, !selected)}
                        >
                          <span>{circuit.name}</span>
                          <small>
                            {active ? '가동' : selected ? '용량 부족' : '정지'}{' '}
                            · {circuit.description}
                          </small>
                        </button>
                      );
                    })}
                  </div>
                )}
                {state.day >= 7 && (
                  <div className="night-preparation-plan">
                    <strong>야간 준비</strong>
                    {nightPreparationCategories.map((category) => (
                      <fieldset key={category.id}>
                        <legend>{category.name}</legend>
                        {NIGHT_PREPARATION_OPTIONS.filter(
                          (option) => option.category === category.id,
                        ).map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            aria-pressed={
                              state.nightPreparation[category.id] === option.id
                            }
                            className={
                              state.nightPreparation[category.id] === option.id
                                ? 'selected'
                                : ''
                            }
                            onClick={() =>
                              onNightPreparation(category.id, option.id)
                            }
                          >
                            <span>{option.name}</span>
                            <small>{option.description}</small>
                          </button>
                        ))}
                      </fieldset>
                    ))}
                    <p>예상 연료 소비 {preparationPlan.fuelCost}</p>
                  </div>
                )}
              </div>
            )}

            {panel === 'staff' && (
              <div
                className={`hub-staff-panel ${state.day < 8 ? 'scavenge-locked' : ''}`}
              >
                <StaffOperations
                  state={state}
                  stayingGuests={stayingGuests}
                  onAssign={onStaff}
                  onScavenge={onScavenge}
                />
              </div>
            )}

            {panel === 'events' && (
              <div className="hub-events-panel">
                <InvestigationPanel
                  state={state}
                  onInvestigate={onInvestigate}
                  onConclude={onConclude}
                />
                <section className="event-journal">
                  <span className="panel-label">최근 사건</span>
                  {[...state.eventHistory]
                    .reverse()
                    .slice(0, 12)
                    .map((entry, index) => (
                      <article key={`${entry.day}-${index}`}>
                        <small>DAY {entry.day}</small>
                        <p>{entry.message}</p>
                      </article>
                    ))}
                </section>
              </div>
            )}

            {panel === 'codex' && <MonsterCodexPanel state={state} />}

            {panel === 'advanced' && (
              <div className="hub-advanced-panel">
                <span className="panel-label">호텔 운영 명령 · 1 AP</span>
                <div className="operation-grid">
                  <Button
                    disabled={
                      state.actionPoints < 1 || state.resources.parts < 2
                    }
                    onClick={() => onAction('repair_hotel')}
                  >
                    호텔 보수 · 부품 2
                  </Button>
                  <Button
                    disabled={state.actionPoints < 1}
                    onClick={() => onAction('community_outreach')}
                  >
                    공동체 회의
                  </Button>
                  <Button
                    disabled={
                      state.actionPoints < 1 || state.resources.fuel < 1
                    }
                    onClick={() => onAction('security_patrol')}
                  >
                    경계 순찰 · 연료 1
                  </Button>
                  <Button
                    disabled={!canPerformHotelAction(state, 'trade_run')}
                    onClick={() => onAction('trade_run')}
                  >
                    {getHotelActionDefinition(state, 'trade_run').name}
                  </Button>
                </div>
                <span className="panel-label">시설</span>
                <div className="facility-grid">
                  {FACILITIES.map((facility) => {
                    const level = state.facilities[facility.id] ?? 0;
                    const next = facility.levels[level];
                    return (
                      <article
                        key={facility.id}
                        className={level ? 'built' : ''}
                      >
                        <strong>
                          {facility.name} · LV.{level}
                        </strong>
                        <p>{next?.description ?? '최고 단계 · 안정 가동'}</p>
                        <Button
                          disabled={!canBuildFacility(state, facility.id)}
                          onClick={() => onBuild(facility.id)}
                        >
                          {!next ? 'MAX' : level ? '강화' : '건설'}
                        </Button>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {confirmClose && (
        <div className="front-desk-confirm" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="오늘 영업 마감 확인"
          >
            <TriangleAlert />
            <small>미해결 업무</small>
            <h2>아직 해결하지 않은 일이 있습니다.</h2>
            <ul>
              {unresolved.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p>
              프론트를 닫고 야간 순회를 시작하시겠습니까? 호텔 관리와 수리는
              순회 중에도 가능합니다.
            </p>
            <div>
              <Button
                variant="secondary"
                onClick={() => setConfirmClose(false)}
              >
                계속 운영
              </Button>
              <Button className="danger-action" onClick={onContinue}>
                오늘 마감
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function GeneratorIncident({
  guests,
  assignedGuestId,
  inspected,
  onInspect,
  onAssign,
}: {
  guests: Guest[];
  assignedGuestId: string | null;
  inspected: boolean;
  onInspect: () => void;
  onAssign: (guestId: string | null) => void;
}) {
  const assigned = guests.find((guest) => guest.id === assignedGuestId) ?? null;
  return (
    <section
      className={`generator-incident ${assigned ? 'ready' : inspected ? 'investigated' : 'warning'}`}
      aria-labelledby="generator-incident-title"
    >
      <div className="incident-icon">
        <Wrench />
      </div>
      <div className="incident-copy">
        <small>오늘의 긴급 문제</small>
        <h2 id="generator-incident-title">발전기에서 불규칙한 금속음이 난다</h2>
        {!inspected ? (
          <p>소리의 원인을 확인해야 누구를 보낼지 판단할 수 있습니다.</p>
        ) : (
          <p>
            <strong>조사 결과</strong> 냉각 팬 축이 흔들립니다. 오늘 밤 정비하지
            않으면 전력 상태가 악화될 수 있습니다.
          </p>
        )}
      </div>
      {!inspected ? (
        <Button onClick={onInspect}>
          <Search /> 원인 조사
        </Button>
      ) : (
        <label>
          <span>정비 담당자</span>
          <select
            aria-label="발전기 정비 담당자"
            value={assignedGuestId ?? ''}
            onChange={(event) => onAssign(event.target.value || null)}
          >
            <option value="">선택하세요</option>
            {[...guests]
              .sort((a, b) => b.skills.repair - a.skills.repair)
              .map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name} · 수리 {candidate.skills.repair}
                </option>
              ))}
          </select>
          {assigned ? (
            <small>
              {assigned.name} 배치 완료 · 예상 효율{' '}
              {Math.min(95, 35 + assigned.skills.repair * 10)}%
            </small>
          ) : (
            <small>수리 능력이 높은 사람일수록 야간 정비 효과가 큽니다.</small>
          )}
        </label>
      )}
    </section>
  );
}

function NightEvent({
  state,
  onChoose,
}: {
  state: UiSave;
  onChoose: (eventId: string, choiceId: string) => void;
}) {
  const event = selectNightEvent(state);
  const portraits = getNightEventPortraits(event.id);
  const leftGuest = portraits
    ? state.guests.find((guest) => guest.id === portraits[0].guestId)
    : undefined;
  const rightGuest = portraits
    ? state.guests.find((guest) => guest.id === portraits[1].guestId)
    : undefined;
  return (
    <main className="event-screen">
      <GameGuide />
      <div className="event-light" />
      <Radio className="event-icon" />
      {leftGuest && (
        <CharacterSprite
          guest={leftGuest}
          context="event-left"
          expression={portraits?.[0].expression}
        />
      )}{' '}
      {rightGuest && (
        <CharacterSprite
          guest={rightGuest}
          context="event-right"
          expression={portraits?.[1].expression}
        />
      )}
      <p className="scene-index">DAY {state.day} · NIGHT</p>
      <section>
        <span>프론트 마감 이후</span>
        <h1>
          {event.id === 'quiet_watch' ? '오늘 밤은 조용합니다' : event.title}
        </h1>
        <p>
          {event.id === 'quiet_watch'
            ? '멀리서 빗소리만 들립니다. 호텔은 아직 버티고 있습니다.'
            : event.description}
        </p>
        <blockquote>{event.quote}</blockquote>
        <div className="choice-explanation">
          하나를 선택하면 밤이 끝납니다. 작은 설명은 선택 직후 적용될 예상
          결과입니다.
        </div>
        <div className="night-choices">
          {event.choices
            .filter(
              (choice) => event.id !== 'quiet_watch' || choice.id === 'rest',
            )
            .map((baseChoice) => {
              const choice = getEffectiveNightChoice(state, baseChoice);
              return (
                <Button
                  key={choice.id}
                  disabled={!canChooseNightChoice(state, baseChoice)}
                  onClick={() => onChoose(event.id, choice.id)}
                >
                  <span>
                    {event.id === 'quiet_watch'
                      ? '밤을 지나 아침으로'
                      : choice.label}
                  </span>
                  <small>
                    {event.id === 'quiet_watch'
                      ? '모두 쉬게 합니다.'
                      : choice.description}
                  </small>
                  <ChevronRight />
                </Button>
              );
            })}
        </div>
      </section>
    </main>
  );
}

function StoryChoiceScene({
  state,
  onChoose,
}: {
  state: UiSave;
  onChoose: (eventId: string, choiceId: string) => void;
}) {
  const event = getPendingStoryChoice(state);
  const guest = state.guests.find((item) => item.id === event?.guestId);
  if (!event || !guest)
    return (
      <main className="event-screen">
        <section>
          <h1>스토리 기록을 확인할 수 없습니다.</h1>
        </section>
      </main>
    );
  return (
    <main className="event-screen story-event">
      <GameGuide />
      <div className="event-light" />
      <CharacterSprite
        guest={guest}
        context="story"
        expression={getStoryEventExpression(event.id)}
      />
      <p className="scene-index">
        DAY {state.day} · {guest.name} ·{' '}
        {event.stage === 'CONFLICT' ? '갈등' : '결말'}
      </p>
      <section>
        <span>투숙객 이야기 · 당신의 선택</span>
        <h1>{event.title}</h1>
        <p>{event.description}</p>
        <blockquote>{event.quote}</blockquote>
        <div className="choice-explanation">
          이 선택은 {guest.name}의 신뢰와 이후 이야기, 호텔의 결말에 남습니다.
        </div>
        <div className="night-choices">
          {event.choices.map((choice) => (
            <Button
              key={choice.id}
              disabled={!canChooseStoryChoice(state, choice)}
              onClick={() => onChoose(event.id, choice.id)}
            >
              <span>{choice.label}</span>
              <small>{choice.description}</small>
              <ChevronRight />
            </Button>
          ))}
        </div>
      </section>
    </main>
  );
}

function StoryCutscene({
  state,
  day,
  cutscene,
  onContinue,
}: {
  state: UiSave;
  day: number;
  cutscene: NonNullable<ReturnType<typeof getCutscene>>;
  onContinue: () => void;
}) {
  const transition =
    cutscene.id === 'hotel_policy_changed'
      ? getHotelPolicyTransition(state)
      : null;
  return (
    <main className="cinematic-screen story-cutscene">
      <GameGuide />
      <img src={cutscene.image} alt={cutscene.imageAlt} />
      <div className="cutscene-rain" aria-hidden="true" />
      <div className="cinematic-wash" />
      <div className="cutscene-flicker" aria-hidden="true" />
      <p className="scene-index">
        DAY {Math.max(1, day - 1)} · {cutscene.kicker}
      </p>
      <section className="cutscene-copy" aria-live="polite">
        <span>JUJU HOTEL · 사건 기록</span>
        <h1>{cutscene.title}</h1>
        <p>
          {cutscene.id === 'first_night' &&
          state.eventHistory.some((e) => e.day === 1 && e.type === 'CHECK_IN')
            ? '아버지가 없는 첫날 밤. 문을 열어준 사람들의 기척이 복도에 남아 있습니다. 닫힌 객실 문을 하나씩 지나며, 당신은 아침까지 이 호텔을 지키기로 합니다.'
            : transition?.storyBody ?? cutscene.body}
        </p>
        <blockquote>“{cutscene.quote}”</blockquote>
        <Button className="advance" onClick={onContinue}>
          {cutscene.id === 'hotel_policy_changed'
            ? 'DAY 4 아침 보고'
            : '밤의 결과 확인'}{' '}
          <ChevronRight />
        </Button>
      </section>
    </main>
  );
}

function HotelArchive({
  state,
  onStartEnding,
}: {
  state: UiSave;
  onStartEnding: (id: GameState['availableEndings'][number]) => void;
}) {
  const [filter, setFilter] = useState<
    'ALL' | 'CHECK_IN' | 'CHECK_OUT' | 'RESOURCE' | 'EVENT' | 'RELATIONSHIP'
  >('ALL');
  const [page, setPage] = useState(0);
  const labels = {
    ALL: '일일 기록',
    CHECK_IN: '입실',
    CHECK_OUT: '퇴실',
    RESOURCE: '자원 변화',
    EVENT: '사건·조사',
    RELATIONSHIP: '관계',
  };
  const entries = getHotelLogEntries(
    state.eventHistory,
    filter === 'RELATIONSHIP' ? 'ALL' : filter,
  ).filter(
    ({ entry }) =>
      filter !== 'RELATIONSHIP' || entry.relationshipChanges?.length,
  );
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(entries.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visibleEntries = entries.slice(
    safePage * pageSize,
    (safePage + 1) * pageSize,
  );
  return (
    <details className="hotel-archive">
      <summary>일일 기록과 호텔 저널</summary>
      {state.lastDaySummary && (
        <details className="archive-settlement">
          <summary>지난밤 운영 계산</summary>
          <p>
            일일 소비:{' '}
            {Object.entries(state.lastDaySummary.consumed)
              .map(([key, value]) => `${RESOURCE_LABELS[key] ?? key} ${value}`)
              .join(' · ')}
          </p>
          <p>
            시설 유지비:{' '}
            {Object.entries(state.lastDaySummary.facilityUpkeep ?? {})
              .map(([key, value]) => `${RESOURCE_LABELS[key] ?? key} ${value}`)
              .join(' · ') || '없음'}
          </p>
          <p>
            시설 생산:{' '}
            {Object.entries(state.lastDaySummary.facilityProduction ?? {})
              .map(([key, value]) => `${RESOURCE_LABELS[key] ?? key} +${value}`)
              .join(' · ') || '없음'}
          </p>
          {state.lastDaySummary.survivalWarnings?.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {state.lastDaySummary.staffDutyResults?.map((line) => (
            <p key={line.guestId}>
              {line.guestName}: {line.effect}
            </p>
          ))}
        </details>
      )}
      <nav aria-label="장부 기록 분류">
        {Object.entries(labels).map(([key, label]) => (
          <button
            key={key}
            aria-pressed={filter === key}
            onClick={() => {
              setFilter(key as typeof filter);
              setPage(0);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="journal-list">
        {visibleEntries.length ? (
          visibleEntries.map(({ entry, index }) => (
            <article key={index}>
              <small>DAY {entry.day}</small>
              <p>{entry.message}</p>
              {entry.relationshipChanges?.map((change, i) => (
                <small key={i}>
                  {state.guests.find((g) => g.id === change.sourceId)?.name ??
                    change.sourceId}{' '}
                  →{' '}
                  {state.guests.find((g) => g.id === change.targetId)?.name ??
                    change.targetId}
                  : {change.delta > 0 ? '+' : ''}
                  {change.delta}
                </small>
              ))}
            </article>
          ))
        ) : (
          <p>아직 이 분류의 기록이 없습니다.</p>
        )}
      </div>
      {pageCount > 1 && (
        <nav className="game-pagination" aria-label="호텔 저널 페이지">
          <Button
            variant="outline"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
          >
            최근
          </Button>
          <span>
            {safePage + 1} / {pageCount}
          </span>
          <Button
            variant="outline"
            disabled={safePage === pageCount - 1}
            onClick={() => setPage(safePage + 1)}
          >
            이전
          </Button>
        </nav>
      )}
      <p>아버지의 흔적은 사람들의 증언과 남겨진 기록에 숨어 있습니다.</p>
      {state.availableEndings.map((id) => {
        const ending = getEndingCondition(id);
        return ending ? (
          <div key={id}>
            <p>{ending.description}</p>
            <Button variant="secondary" onClick={() => onStartEnding(id)}>
              남겨진 이야기 확인 · {ending.name}
            </Button>
          </div>
        ) : null;
      })}
    </details>
  );
}

function CampaignEnding({
  state,
  onReturn,
  onAdvance,
}: {
  state: UiSave;
  onReturn: () => void;
  onAdvance: () => void;
}) {
  const ending = state.activeEndingId
    ? getEndingCondition(state.activeEndingId)
    : null;
  const narrative = state.activeEndingId
    ? getEndingNarrative(state.activeEndingId)
    : null;
  const index = Math.max(
    0,
    Math.min(state.endingSceneIndex, (narrative?.scenes.length ?? 1) - 1),
  );
  const scene = narrative?.scenes[index];
  const last = Boolean(narrative && index === narrative.scenes.length - 1);
  const image = narrative?.image ?? DEFAULT_FRONT_DESK_BACKGROUND.image;
  const imageAlt =
    narrative?.imageAlt ??
    `${ending?.name ?? 'JUJU HOTEL'} 최종 사건의 호텔 로비.`;
  return (
    <main className="cinematic-screen ending-cutscene">
      <GameGuide />
      <img src={image} alt={imageAlt} />
      <div className="cinematic-wash" />
      <p className="scene-index">
        DAY {state.day} · {narrative?.kicker ?? 'FINAL EVENT'} · {index + 1}/
        {narrative?.scenes.length ?? 1}
      </p>
      <section className="cutscene-copy">
        <span>{ending?.name ?? 'DESTINY'}</span>
        <h1>{scene?.title ?? '기록을 찾을 수 없습니다.'}</h1>
        <p>{scene?.body ?? ending?.description}</p>
        <blockquote>{scene?.quote ?? '“May I have a room?”'}</blockquote>
        <div className="ending-progress" aria-label="엔딩 장면 진행도">
          {narrative?.scenes.map((beat, beatIndex) => (
            <i key={beat.id} className={beatIndex <= index ? 'active' : ''} />
          ))}
        </div>
        <div className="assignment-actions">
          <Button variant="secondary" onClick={onReturn}>
            아침 장부로 돌아가기 · 진행 초기화
          </Button>
          <Button onClick={onAdvance}>
            {last ? '에필로그 기록 완료' : '다음 장면'} <ChevronRight />
          </Button>
        </div>
      </section>
    </main>
  );
}
