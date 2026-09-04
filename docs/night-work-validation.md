# 낮의 접객 → 밤의 작업: 최소 플레이 루프

> 이전 작업의 기록입니다. 야간 3회 행동 제한과 일회성 NPC 수리는 폐기되었습니다. 현재 규칙과 검증은 [발전기 자동화 검증](generator-automation-validation.md)을 참조하세요.

## 현재 구조 분석

- 기존: desk → story(있을 때) → night 사건 → resolveDay → report. 프론트 운영은 이미 drawer/overlay로 통합되어 있다.
- 기존 시설은 facilities의 건설 레벨과 FACILITIES의 비용/생산/유지비로 계산된다. 발전기 내구도는 없었으며 generator_failure는 연료 10 이하 사건이었다.
- 직업은 Guest.role/baseTraits/skills와 Aura로 표현되어 있다. 기존 정비공·전기기사·월터·토머스를 전문 수리 판정에서 재사용한다.
- staff-operation은 담당자별 야간 보너스를 계산한다. 직접 작업을 마친 사람은 그날 상시 근무 정산에서 제외하여 중복 노동을 막는다. 객실 Aura는 별도의 공간 효과로 보존한다.
- 호텔 보수/공동체 대화/경계 순찰은 기존 hotel-action-manager를 호출한다. 소비·회복·Aura·시설 생산·스토리·조사·야간 준비·세이브 계산을 대체하지 않는다.

## 새 핵심 루프

낮 프론트 응대/배정 → 프론트 마감 → night_management → 공간 선택/직접 작업 또는 투숙객 지시 → 기존 스토리/야간 사건 → 기존 일괄 정산 → 다음 낮.

이동·열람은 무료. 야간 행동 3회는 낮 AP와 별개이며 수리/대화/보수/순찰이 같은 예산을 쓴다. 행동이 남아도 밤을 넘길 수 있다.

## 발전기·직업

- 직접/비전문 수리: 부품 3, 야간 행동 1, 내구도 +20.
- 정비공/엔지니어/전기기사 전문 수리: 부품 1, 야간 행동 1, 내구도 +40.
- 모두 확정 효과, 최대 100. 가짜 성공률이나 미구현 고장 확률 감소를 표시하지 않는다.
- 첫 도입은 내구도 42. 이후 밤마다 -10 마모, 같은 밤 재진입·불러오기에는 재차 차감하지 않는다. DAY 4에 미수리하면 DAY 5에 32가 된다.
- 내구도 35 이하에서 마감하면 발전기 정전 사건이 우선 발생한다. 기존 독립 마이크로그리드는 이를 방지한다. 연료 부족 사건은 별도로 유지한다.
- 정전 사건: 모든 전력 회로 중단, 스트레스 +10. 기존 전력 정산을 통해 안전도 -4, 위협 +3, 진료 중단 피해와 추가 식량 수요가 발생한다. 연료 유지비가 있는 생산 시설은 그날 생산/유지비 모두 정지한다. 비전력 시설은 계속 작동한다.
- NPC는 하룻밤 1회. 건강 35 미만, 스트레스 90 이상, 질병/감염 의심/감염, 비투숙 상태는 배정 불가. 신뢰도/보상 협상은 이번 범위 아님.
- DAY 5 첫 신규 큐 슬롯에 에단 브룩스(기존 정비공 프로필)를 배치한다. 이미 생성된 DAY 5 큐는 변경하지 않는다. 에단을 거절해도 직접 수리가 가능하다.

## 데이터 구조

- GameState.phase에 night_management 추가: 작업 중 저장/복원 가능.
- facilityState.generator: condition/maxCondition/lastWearDay. 향후 시설별 내구도 확장용 별도 필드이며 기존 시설 레벨과 충돌하지 않는다.
- getGeneratorFacilityView: status/risk/assignedWorker/activeProblem/production/consumption을 현재 전력 계산에서 파생한다. 파생 수치를 별도로 저장하지 않는다.
- nightShift: day/actions/completed/tasks/lastWork. tasks는 actionId/workerId/location을 기록하며 직업별 행동을 확장할 수 있다.
- REPAIR_JOB: 직업 매칭과 직접/전문 작업 비용/효과 정의.

## UI 및 단계적 노출

DAY 1 프론트·객실 → DAY 2 주방/배급 → DAY 3 창고 → DAY 4 발전기/직접 수리 → DAY 5 투숙객 작업 → DAY 6 의무실 상태 → DAY 7 정문/기존 순찰.

야간 지도와 한 개 공간 상세를 함께 표시한다. 작업 뒤 자원/내구도/AP의 실제 차이 토스트와 최근 작업 결과를 보여준다. 낮 직업 카드에는 구현된 발전기 수리만 소개한다. CSS는 night-hotel-map으로 분리해 기존 30실 배정 지도와의 충돌을 제거했다. 기존 검정/녹색/금색 테마와 타이포그래피를 유지했다.

## 테스트 결과 (2026-09-04)

| 항목 | 자동 테스트 | 브라우저 실제 플레이 |
|---|---|---|
| A 엔지니어 없이 직접 수리 | PASS | DAY 4 부품 6→3, 내구도 42→62, AP 3→2 |
| B 엔지니어 전문 수리 | PASS | DAY 5 에단 입실 후 부품 9→8, 내구도 32→72 |
| C 중복 업무 불가 | PASS | 작업 완료/재배정 불가 표시, 버튼 비활성 |
| D 행동 0 차단 | PASS | 수리+대화로 0, 객실 보수/수리 모두 비활성 |
| E 방치 정전 | PASS | 수리 전 슬롯 복원 후 마감 경고, 22:41 정전 사건, DAY 6 프론트 피해 안내 |
| F 수리 후 정전 방지 | PASS | 수리 경로에서는 조용한 밤으로 연결 |
| G 저장/불러오기 | PASS | 수리 전/후 수동 슬롯과 새로고침 복원, 내구도72/부품8/AP2/에단 작업 완료 유지 |
| H 기존 낮/객실/진행 | PASS | DAY 1 리암 205호 배정, DAY 2~5 접객, 에단 배정, DAY 6 프론트 진입 |

- 자동 테스트 총 524 PASS, 타입 검사 PASS, Pages 빌드 PASS.
- 1366×768 및 390×844 검증. 초기 지도 가로 넘침을 수정했으며 최종 확인에서 가로 넘침 없음. 모바일은 세로 스크롤로 순회한다.
- 테스트 탭 Console error/warning 0. 기존 사용자 공개 사이트 저장은 변경하지 않았다.
- 빌드의 JS 청크 500kB 초과 경고는 남아 있다. 린트 전체 무결점이나 장기 밸런스 검증을 주장하지 않는다.

## 변경 파일

- 신규: app/night-management.tsx, app/night-management.css, game/night-work-manager.ts, tests/night-work.test.ts, docs/night-work-validation.md.
- 연결/확장: app/page.tsx, game/types.ts, game/game-phase.ts, game/save-manager.ts, game/normal-visitor-data.ts, game/visitor-queue-manager.ts, game/onboarding-manager.ts, game/staff-operation-manager.ts, game/hotel-action-manager.ts, game/daily-survival-manager.ts, game/day-manager.ts, game/night-event-manager.ts, game/night-presentation.ts, game/action-feedback.ts.

## 기존 세이브 호환

v15의 선택적 필드로 확장한다. 필드 없는 저장은 다음 프론트 마감부터 야간 순회에 진입한다. 기존 night/report의 사건·정산을 재실행하지 않는다. manual 3슬롯/AUTO 체계 유지. DAY 5가 이미 생성된 저장에서는 에단을 소급 삽입하지 않는다. 이전 소프트웨어로의 역방향 저장 호환은 보장하지 않는다.

## 남은 범위

- 의사·경비·요리사 등의 신규 능동 직업 작업은 아직 없다. 기존 패시브 담당 업무와 시설 계산은 유지한다.
- 의무실은 기존 환자/회로 상태 열람, 정문은 기존 경계 순찰을 재사용한다. 시설 전부에 별도 내구도와 고유 사건을 새로 만든 것은 아니다.
- 대규모 투숙객 명단과 장기 부품 경제, 새 직업별 사건은 후속 플레이 평가가 필요하다.
- 현재 공개 GitHub Pages와 manifest의 오래된 비공개 Sites는 다른 배포 대상이다. 이 작업에서는 두 배포를 임의 동기화하지 않았다. 변경은 로컬 검증본이며 공개 버전은 그대로다.

## 다음 추천

먼저 DAY 5~10의 부품 수급/수리 주기를 플레이 평가한 뒤, 같은 Job Action 구조로 의사의 야간 응급 처치를 한 종류만 연결한다.
