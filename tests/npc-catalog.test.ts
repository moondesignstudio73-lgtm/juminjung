import test from "node:test";
import assert from "node:assert/strict";
import { createGuests } from "../game/guest-data.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";
import { applyVisitorCheckInBenefits, applyVisitorReaction, collectVisitorOffer, discoverTrait, getEligibleVisitor, getNextRevisitDay, getVisitorReaction, getVisitorReactionById, markVisitorRefused, prepareGuestCheckIn, REVISIT_COOLDOWN_DAYS, REVISIT_REFUSAL_DELAY_DAYS } from "../game/visitor-manager.ts";

test("20명의 메인 NPC가 고유 ID와 완전한 기본 상태로 등록된다", () => {
  const guests = createGuests();
  assert.equal(guests.length, 20);
  assert.equal(new Set(guests.map((guest) => guest.id)).size, 20);
  for (const guest of guests) {
    assert.equal(guest.eventChain.length, 4);
    assert.equal(guest.expressions.length, 7);
    assert.ok(guest.arrivalDayRange[0] <= guest.arrivalDayRange[1]);
    assert.ok(guest.stayDuration > 0);
  }
});

test("20명 전원의 프런트 심문과 협상 대사는 NPC별 고유 데이터다", () => {
  const guests = createGuests();
  assert.equal(new Set(guests.map((guest) => guest.introDialogue)).size, guests.length);
  assert.equal(new Set(guests.map((guest) => guest.negotiationDialogue)).size, guests.length);
  for (const guest of guests) {
    assert.equal(guest.questions.length, 3);
    assert.equal(new Set(guest.questions.map((question) => question.id)).size, 3);
    assert.ok(guest.questions.every((question) => question.id.startsWith(`${guest.id}-`)));
    assert.ok(guest.questions.every((question) => question.label.length >= 6 && question.answer.length >= 12));
  }
  assert.equal(new Set(guests.flatMap((guest) => guest.questions.map((question) => question.id))).size, guests.length * 3);
});

test("협상은 모든 방문자에게 실제 추가 자원을 제공한다", () => {
  const guests = createGuests();
  for (const guest of guests) {
    const bonus = Object.values(guest.negotiatedOffer).reduce((sum, value) => sum + Number(value ?? 0), 0);
    assert.ok(bonus > 0, `${guest.id} negotiated offer`);
  }
});

test("구버전 저장의 공통 대사는 최신 NPC별 프런트 데이터로 복원된다", () => {
  const state = createInitialGameState();
  const walter = state.guests.find((guest) => guest.id === "walter")!;
  walter.introDialogue = "공통 소개";
  walter.negotiationDialogue = "공통 협상";
  walter.questions = [{ id:"origin",label:"어디서 왔습니까?",answer:"공통 답변" }];
  walter.negotiatedOffer = {};
  const restored = restoreGameState(serializeGameState(state)).guests.find((guest) => guest.id === "walter")!;
  assert.notEqual(restored.introDialogue, "공통 소개");
  assert.notEqual(restored.negotiationDialogue, "공통 협상");
  assert.equal(restored.questions.length, 3);
  assert.deepEqual(restored.negotiatedOffer, { parts:1 });
});

test("모든 NPC Aura는 이름·라벨·분류·아이콘·설명·범위·효과를 하나의 데이터로 제공한다", () => {
  const guests = createGuests();
  const auras = guests.map((guest) => guest.aura).filter((aura) => aura !== null);
  assert.equal(auras.length, 20);
  assert.equal(new Set(auras.map((aura) => aura.id)).size, auras.length);
  for (const aura of auras) {
    assert.ok(aura.name.length > 0);
    assert.ok(aura.shortLabel.length > 0);
    assert.ok(aura.category.length > 0);
    assert.ok(aura.icon.length > 0);
    assert.ok(aura.description.length > 0);
    assert.ok(aura.radius >= 0);
    assert.ok(Number.isFinite(aura.value));
  }
});

test("Eleanor·Walter·Samuel·Noah·Hazel의 객실 범위 표시는 각 Aura 데이터와 일치한다", () => {
  const guests = createGuests();
  const presentation = Object.fromEntries(guests.map((guest) => [guest.id, guest.aura && { name:guest.aura.name, shortLabel:guest.aura.shortLabel, category:guest.aura.category, icon:guest.aura.icon }]));
  assert.deepEqual(presentation.eleanor, { name:"Medical Care Zone", shortLabel:"의료", category:"MEDICAL", icon:"heart-pulse" });
  assert.deepEqual(presentation.walter, { name:"Maintenance Zone", shortLabel:"정비", category:"MAINTENANCE", icon:"wrench" });
  assert.deepEqual(presentation.samuel, { name:"Security Presence", shortLabel:"보안", category:"SECURITY", icon:"shield" });
  assert.deepEqual(presentation.noah, { name:"Kitchen Efficiency", shortLabel:"식량", category:"FOOD", icon:"utensils" });
  assert.deepEqual(presentation.hazel, { name:"Perimeter Watch", shortLabel:"경계", category:"SECURITY", icon:"shield" });
});

test("구버전 저장의 Aura 표시값은 최신 NPC Aura 단일 데이터로 복원된다", () => {
  const state = createInitialGameState();
  const walter = state.guests.find((guest) => guest.id === "walter")!;
  walter.aura = { ...walter.aura!, shortLabel:"의료", category:"MEDICAL", icon:"heart-pulse" };
  const restored = restoreGameState(JSON.stringify(state));
  assert.deepEqual(restored.guests.find((guest) => guest.id === "walter")?.aura && {
    shortLabel:restored.guests.find((guest) => guest.id === "walter")!.aura!.shortLabel,
    category:restored.guests.find((guest) => guest.id === "walter")!.aura!.category,
    icon:restored.guests.find((guest) => guest.id === "walter")!.aura!.icon,
  }, { shortLabel:"정비", category:"MAINTENANCE", icon:"wrench" });
});

test("방문 일정은 DAY 범위와 WAITING 상태로 다음 손님을 선택한다", () => {
  const guests = createGuests();
  assert.equal(getEligibleVisitor(guests, 1)?.id, "eleanor");
  const refused = markVisitorRefused(guests, "eleanor");
  assert.equal(getEligibleVisitor(refused, 2)?.id, "walter");
});

test("최초 방문자는 재방문 가능한 체크아웃 손님보다 항상 우선한다", () => {
  const guests = createGuests().map((guest) => guest.id === "eleanor"
    ? { ...guest, status: "CHECKED_OUT" as const, checkedInDay: 1 }
    : guest.id === "walter" ? guest : { ...guest, status: "REFUSED" as const });
  assert.equal(getEligibleVisitor(guests, 20)?.id, "walter");
});

test("체크아웃 생존자는 숙박 종료와 5일 도로 대기 뒤 재방문한다", () => {
  const guests = createGuests().map((guest) => guest.id === "eleanor" ? { ...guest, status: "CHECKED_OUT" as const, checkedInDay: 1 } : { ...guest, status: "REFUSED" as const });
  const readyDay = 1 + guests[0].stayDuration + REVISIT_COOLDOWN_DAYS;
  assert.equal(getEligibleVisitor(guests, readyDay - 1), null);
  assert.equal(getEligibleVisitor(guests, readyDay)?.id, "eleanor");
});

test("재체크인은 날짜와 숙박기간만 새로 시작하고 기존 스토리·관계·상태를 보존한다", () => {
  const guests = createGuests().map((guest) => guest.id === "eleanor" ? { ...guest, status: "CHECKED_OUT" as const, checkedInDay: 1, health: 72, trust: 83, discoveredTraits: ["TriageGuilt"], eventChain: guest.eventChain.map((event) => ({ ...event, completed: true })), storyFlags: { ...guest.storyFlags, visit_count: 1 } } : { ...guest, status: "REFUSED" as const });
  const before = guests[0];
  const prepared = prepareGuestCheckIn(guests, "eleanor", 305, 28)[0];
  assert.equal(prepared.status, "STAYING");
  assert.equal(prepared.currentRoomNumber, 305);
  assert.equal(prepared.checkedInDay, 28);
  assert.equal(prepared.remainingNights, prepared.stayDuration);
  assert.equal(prepared.storyFlags.visit_count, 2);
  assert.equal(prepared.health, before.health);
  assert.equal(prepared.trust, before.trust);
  assert.deepEqual(prepared.discoveredTraits, before.discoveredTraits);
  assert.deepEqual(prepared.eventChain, before.eventChain);
  assert.deepEqual(prepared.relationships, before.relationships);
  assert.deepEqual(prepared.aura, before.aura);
});

test("방문 제안은 방문 횟수마다 한 번만 지급되고 날짜 변경으로 중복 수령할 수 없다", () => {
  const state = createInitialGameState();
  state.guests = state.guests.map((guest) => guest.id === "eleanor" ? guest : { ...guest, status: "REFUSED" as const });
  const firstStay = prepareGuestCheckIn(state.guests, "eleanor", 301, 1);
  const first = applyVisitorCheckInBenefits(state.resources, firstStay, "eleanor", false, null);
  const duplicate = applyVisitorCheckInBenefits(first.resources, first.guests.map((guest) => guest.id === "eleanor" ? { ...guest, checkedInDay: 27 } : guest), "eleanor", false, null);
  const checkedOut = duplicate.guests.map((guest) => guest.id === "eleanor" ? { ...guest, status: "CHECKED_OUT" as const, currentRoomNumber: null, storyFlags: { ...guest.storyFlags, next_revisit_day: 28 } } : guest);
  const secondStay = prepareGuestCheckIn(checkedOut, "eleanor", 305, 28);
  const revisit = applyVisitorCheckInBenefits(duplicate.resources, secondStay, "eleanor", false, null);
  assert.equal(first.applied, true);
  assert.equal(duplicate.applied, false);
  assert.equal(revisit.applied, true);
  assert.equal(revisit.resources.food, first.resources.food + Number(state.guests[0].offer.food));
  assert.equal(revisit.resources.fuel, first.resources.fuel + Number(state.guests[0].offer.fuel));
  assert.equal(revisit.resources.medicine, first.resources.medicine + Number(state.guests[0].offer.medicine));
});

test("재방문 거절은 영구 추방 대신 3일 뒤 다시 요청할 수 있게 한다", () => {
  const guests = createGuests().map((guest) => guest.id === "eleanor" ? { ...guest, status: "CHECKED_OUT" as const, checkedInDay: 1 } : { ...guest, status: "REFUSED" as const });
  const refused = markVisitorRefused(guests, "eleanor", 28);
  assert.equal(refused[0].status, "CHECKED_OUT");
  assert.equal(refused[0].storyFlags.revisit_refused_until, 28 + REVISIT_REFUSAL_DELAY_DAYS + 1);
  assert.equal(getEligibleVisitor(refused, 31), null);
  assert.equal(getEligibleVisitor(refused, 32)?.id, "eleanor");
});

test("재방문 횟수와 보상·거절 날짜는 저장 복원 후에도 유지된다", () => {
  const state = createInitialGameState();
  state.day = 28;
  state.guests = state.guests.map((guest) => guest.id === "eleanor" ? guest : { ...guest, status: "REFUSED" as const });
  const staying = prepareGuestCheckIn(state.guests, "eleanor", 305, 1);
  state.guests = applyVisitorCheckInBenefits(state.resources, staying, "eleanor", false, null).guests.map((guest) => guest.id === "eleanor" ? { ...guest, status: "CHECKED_OUT" as const, currentRoomNumber: null, storyFlags: { ...guest.storyFlags, last_checked_out_day: 28, next_revisit_day: getNextRevisitDay(28), revisit_refused_until: 31 } } : guest);
  const restored = restoreGameState(serializeGameState(state));
  const eleanor = restored.guests.find((guest) => guest.id === "eleanor")!;
  assert.equal(eleanor.storyFlags.visit_count, 1);
  assert.equal(eleanor.storyFlags.checkin_benefits_visit_count, 1);
  assert.equal(eleanor.storyFlags.revisit_refused_until, 31);
  assert.equal(eleanor.storyFlags.next_revisit_day, 34);
  assert.equal(getEligibleVisitor(restored.guests, 33), null);
  assert.equal(getEligibleVisitor(restored.guests, 34)?.id, "eleanor");
});

test("체크인 준비는 현재 선택된 생존 방문자만 허용하고 쿨다운 우회를 거부한다", () => {
  const guests = createGuests().map((guest) => guest.id === "eleanor" ? { ...guest, status: "CHECKED_OUT" as const, checkedInDay: 1, storyFlags: { ...guest.storyFlags, next_revisit_day: 20 } } : guest.id === "walter" ? guest : { ...guest, status: "REFUSED" as const });
  assert.throws(() => prepareGuestCheckIn(guests, "eleanor", 301, 10), /현재 체크인할 수 없는/);
  assert.throws(() => prepareGuestCheckIn(guests, "eleanor", 301, 20), /현재 체크인할 수 없는/);
  assert.equal(prepareGuestCheckIn(guests, "walter", 301, 20).find((guest) => guest.id === "walter")?.status, "STAYING");
});

test("방문 제안은 실제 체크인이 끝나기 전에는 지급되지 않는다", () => {
  const state = createInitialGameState();
  assert.throws(() => applyVisitorCheckInBenefits(state.resources, state.guests, "eleanor", false, null), /체크인 완료 전/);
});

test("Daniel과 Hayes는 선행 NPC가 실제로 등장한 뒤에만 방문 가능하다", () => {
  const guests = createGuests().map((guest) => guest.id !== "daniel" && guest.id !== "mia" ? { ...guest, status: "REFUSED" as const } : guest);
  assert.notEqual(getEligibleVisitor(guests, 20)?.id, "daniel");
  const miaAppeared = markVisitorRefused(guests, "mia");
  assert.equal(getEligibleVisitor(miaAppeared, 20)?.id, "daniel");
});

test("숨겨진 특성은 발견 전 비공개이며 발견 상태만 별도로 저장된다", () => {
  const guests = createGuests();
  assert.equal(guests[0].discoveredTraits.length, 0);
  const discovered = discoverTrait(guests, "eleanor", "TriageGuilt");
  assert.deepEqual(discovered[0].discoveredTraits, ["TriageGuilt"]);
});

test("구버전처럼 Eleanor만 있는 저장도 복원 시 20명 카탈로그를 병합한다", () => {
  const state = createInitialGameState();
  state.guests = [state.guests[0]];
  const restored = restoreGameState(serializeGameState(state));
  assert.equal(restored.guests.length, 20);
  assert.equal(restored.guests.find((guest) => guest.id === "white")?.status, "WAITING");
});

test("저장 복원은 새 이벤트 단계 기본값과 기존 진행 상태를 ID 기준으로 병합한다", () => {
  const state = createInitialGameState();
  state.guests[0].eventChain = [{ ...state.guests[0].eventChain[0], completed: true }];
  const restored = restoreGameState(serializeGameState(state));
  assert.equal(restored.guests[0].eventChain.length, 4);
  assert.equal(restored.guests[0].eventChain[0].completed, true);
});

test("FLAG 방문 조건은 실제 월드 플래그가 충족될 때만 열린다", () => {
  const guests = createGuests().map((guest) => guest.id === "eleanor" ? { ...guest, arrivalConditions: [{ type: "FLAG" as const, key: "clinic_open" }] } : { ...guest, status: "REFUSED" as const });
  assert.equal(getEligibleVisitor(guests, 20), null);
  assert.equal(getEligibleVisitor(guests, 20, { clinic_open: true })?.id, "eleanor");
});

test("피난민을 보호한 기록은 Rosa의 전용 대사·신뢰·추가 제안을 만든다", () => {
  const state = createInitialGameState();
  state.flags.refugees_sheltered = true;
  const rosa = state.guests.find((guest) => guest.id === "rosa")!;
  const reaction = getVisitorReaction(state, rosa)!;
  assert.equal(reaction.id, "rosa-refugees-sheltered");
  assert.ok(reaction.dialogue.includes("아이들을 로비로"));
  const reacted = applyVisitorReaction(state.guests, "rosa", reaction).find((guest) => guest.id === "rosa")!;
  assert.equal(reacted.trust, rosa.trust + 12);
  assert.equal(reacted.riskLevel, rosa.riskLevel - 5);
  assert.equal(reacted.storyFlags.visitor_reaction, reaction.id);
  const reward = collectVisitorOffer(state.resources, rosa, false, reaction);
  assert.equal(reward.food, state.resources.food + Number(rosa.offer.food) + 2);
  assert.equal(reward.water, state.resources.water + Number(rosa.offer.water) + 2);
});

test("난민 거절 후속 반응은 일반 난민 평판 반응보다 우선한다", () => {
  const state = createInitialGameState();
  state.flags.refugees_denied = true;
  state.reputations.refugee = 80;
  const rosa = state.guests.find((guest) => guest.id === "rosa")!;
  const reaction = getVisitorReaction(state, rosa)!;
  assert.equal(reaction.id, "rosa-refugees-denied");
  assert.equal(reaction.trustDelta, -12);
});

test("높은 상인 평판은 Jack의 추가 거래 제안을 연다", () => {
  const state = createInitialGameState();
  const jack = state.guests.find((guest) => guest.id === "jack")!;
  assert.equal(getVisitorReaction(state, jack), null);
  state.reputations.merchant = 30;
  const reaction = getVisitorReaction(state, jack)!;
  assert.equal(reaction.id, "jack-merchant-reputation");
  assert.deepEqual(reaction.offerBonus, { food: 2, parts: 1 });
});

test("207호 조사 단서는 Vale의 후속 방문 대사와 연구 물자를 연다", () => {
  const state = createInitialGameState();
  const vale = state.guests.find((guest) => guest.id === "vale")!;
  assert.equal(getVisitorReaction(state, vale), null);
  state.flags.monster_room_entry_clue = true;
  const reaction = getVisitorReaction(state, vale)!;
  assert.equal(reaction.id, "vale-room-207-evidence");
  assert.ok(reaction.dialogue.includes("207호"));
  assert.deepEqual(reaction.offerBonus, { medicine: 1 });
});

test("군사 저항 기록은 높은 군 평판보다 Hayes의 적대 반응을 우선한다", () => {
  const state = createInitialGameState();
  state.reputations.military = 90;
  state.flags.military_resistance_started = true;
  const hayes = state.guests.find((guest) => guest.id === "hayes")!;
  assert.equal(getVisitorReaction(state, hayes)?.id, "hayes-resistance");
});

test("객실 선택 중에는 표시된 방문 반응 ID가 월드 상태 변화와 무관하게 유지된다", () => {
  const state = createInitialGameState();
  state.flags.refugees_sheltered = true;
  const rosa = state.guests.find((guest) => guest.id === "rosa")!;
  const displayed = getVisitorReaction(state, rosa)!;
  state.flags.refugees_sheltered = false;
  state.flags.refugees_denied = true;
  assert.equal(getVisitorReaction(state, rosa)?.id, "rosa-refugees-denied");
  assert.equal(getVisitorReactionById(rosa, displayed.id)?.id, "rosa-refugees-sheltered");
});

test("체크인 보상과 세력 반응은 같은 손님에게 한 번만 적용된다", () => {
  const state = createInitialGameState();
  state.flags.refugees_sheltered = true;
  const rosa = state.guests.find((guest) => guest.id === "rosa")!;
  const reaction = getVisitorReaction(state, rosa)!;
  const stayingGuests = state.guests.map((guest) => guest.id === rosa.id ? { ...guest, status: "STAYING" as const, currentRoomNumber: 301, checkedInDay: 1, storyFlags: { ...guest.storyFlags, visit_count: 1 } } : guest);
  const first = applyVisitorCheckInBenefits(state.resources, stayingGuests, rosa.id, false, reaction);
  const second = applyVisitorCheckInBenefits(first.resources, first.guests, rosa.id, false, reaction);
  assert.equal(first.applied, true);
  assert.equal(second.applied, false);
  assert.deepEqual(second.resources, first.resources);
  assert.deepEqual(second.guests, first.guests);
});

test("방문 반응의 신뢰와 위험 변화는 0에서 100 범위를 넘지 않는다", () => {
  const state = createInitialGameState();
  state.flags.refugees_sheltered = true;
  state.guests = state.guests.map((guest) => guest.id === "rosa" ? { ...guest, trust: 95, riskLevel: 2 } : guest);
  const rosa = state.guests.find((guest) => guest.id === "rosa")!;
  const reacted = applyVisitorReaction(state.guests, rosa.id, getVisitorReaction(state, rosa)).find((guest) => guest.id === rosa.id)!;
  assert.equal(reacted.trust, 100);
  assert.equal(reacted.riskLevel, 0);
});

test("Save v9은 객실 선택 중 고정된 방문 반응 ID를 복원한다", () => {
  const state = createInitialGameState();
  state.pendingVisitorReactionId = "rosa-refugees-sheltered";
  const restored = restoreGameState(serializeGameState(state));
  assert.equal(restored.pendingVisitorReactionId, "rosa-refugees-sheltered");
});
