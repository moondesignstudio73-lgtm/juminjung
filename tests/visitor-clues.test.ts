import test from "node:test";
import assert from "node:assert/strict";
import { createGuests } from "../game/guest-data.ts";
import { createInitialGameState, restoreGameState, serializeGameState } from "../game/save-manager.ts";
import { applyVisitorQuestionClue, getAvailableVisitorQuestions, getVisitorClueRule, VISITOR_CLUE_RULES } from "../game/visitor-clue-data.ts";

test("20명 전원의 단서 규칙은 실제 질문·물품·숨겨진 특성을 참조한다", () => {
  const guests = createGuests();
  assert.equal(VISITOR_CLUE_RULES.length, guests.length);
  assert.equal(new Set(VISITOR_CLUE_RULES.map((rule)=>rule.guestId)).size, guests.length);
  for (const rule of VISITOR_CLUE_RULES) {
    const guest = guests.find((candidate)=>candidate.id===rule.guestId)!;
    assert.ok(guest, rule.guestId);
    assert.ok(guest.questions.some((question)=>question.id===rule.questionId), `${rule.guestId} question`);
    assert.ok(guest.hiddenTraits.includes(rule.revealsTrait), `${rule.guestId} trait`);
    assert.ok(rule.traitLabel.length>=4, `${rule.guestId} trait label`);
    assert.ok(rule.finding.length>=20, `${rule.guestId} finding`);
    if (rule.itemId) assert.ok(guest.offeredItems.some((item)=>item.id===rule.itemId), `${rule.guestId} item`);
  }
});

test("Walter의 공구함 조사가 아버지 관련 전용 질문을 해금한다", () => {
  const walter = createGuests().find((guest)=>guest.id==="walter")!;
  assert.equal(getAvailableVisitorQuestions(walter,[]).some((question)=>question.id==="walter-father"),false);
  assert.equal(getVisitorClueRule("walter","ITEM","toolbox")?.unlocksQuestionId,"walter-father");
  assert.equal(getAvailableVisitorQuestions(walter,["toolbox"]).some((question)=>question.id==="walter-father"),true);
});

test("해금 질문의 답변은 숨겨진 특성과 위험도를 한 번만 갱신한다", () => {
  const guests = createGuests();
  const before = guests.find((guest)=>guest.id==="walter")!;
  const locked = applyVisitorQuestionClue(guests,"walter","walter-father",[]);
  assert.equal(locked.applied,false);
  assert.deepEqual(locked.guests,guests);
  const first = applyVisitorQuestionClue(guests,"walter","walter-father",["toolbox"]);
  const revealed = first.guests.find((guest)=>guest.id==="walter")!;
  assert.equal(first.applied,true);
  assert.ok(revealed.discoveredTraits.includes("FatherOldFriend"));
  assert.equal(revealed.riskLevel,before.riskLevel-5);
  const repeated = applyVisitorQuestionClue(first.guests,"walter","walter-father",["toolbox"]);
  assert.equal(repeated.applied,false);
  assert.equal(repeated.guests.find((guest)=>guest.id==="walter")!.riskLevel,revealed.riskLevel);
});

test("White의 반사 질문은 물품 없이 열리고 위험도를 100 이내로 제한한다", () => {
  const guests = createGuests();
  const white = guests.find((guest)=>guest.id==="white")!;
  assert.ok(getAvailableVisitorQuestions(white,[]).some((question)=>question.id==="white-reflection"));
  const result = applyVisitorQuestionClue(guests,"white","white-reflection");
  const revealed = result.guests.find((guest)=>guest.id==="white")!;
  assert.equal(revealed.riskLevel,100);
  assert.ok(revealed.discoveredTraits.includes("NonHumanPossible"));
});

test("심사에서 확인한 특성과 위험도는 저장 복원 뒤에도 유지된다", () => {
  const state = createInitialGameState();
  state.guests = applyVisitorQuestionClue(state.guests,"ruth","ruth-scratch",["bandage"]).guests;
  state.asked = ["ruth-scratch"];
  state.inspected = ["bandage"];
  const restored = restoreGameState(serializeGameState(state));
  const ruth = restored.guests.find((guest)=>guest.id==="ruth")!;
  assert.ok(ruth.discoveredTraits.includes("MonsterScratch"));
  assert.equal(ruth.riskLevel,55);
  assert.deepEqual(restored.asked,["ruth-scratch"]);
  assert.deepEqual(restored.inspected,["bandage"]);
});
