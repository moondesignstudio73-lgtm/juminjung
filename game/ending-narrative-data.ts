import type { EndingNarrative } from "./types.ts";

export const ENDING_NARRATIVES: EndingNarrative[] = [
  { endingId: "SAFE_HAVEN", kicker: "FINAL EVENT · 살아 있는 호텔", image: "/juminjung/assets/cutscenes/ending-safe-haven-v1.png", imageAlt: "JUJU HOTEL 표지가 걸린 로비에서 주민들이 공동 장부와 역할별 열쇠표를 정리하고, 아이가 물통을 나르는 사이 열린 바리케이드 너머의 여행자들에게 새벽빛이 비치는 장면.", scenes: [
    { id: "assembly", title: "열린 로비", body: "새벽이 오자 로비 입구의 바리케이드가 걷힌다. 주민들은 객실 번호 대신 맡을 일을 적고, 정수 시설의 첫 물통을 아이들 앞으로 밀어 놓는다.", quote: "‘오늘부터 여긴 숨는 곳이 아니라, 살아가는 곳이에요.’" },
    { id: "charter", title: "JUJU HOTEL 헌장", body: "당신은 프런트 장부의 빈 페이지에 배급, 경계, 치료의 규칙을 쓴다. 누구도 방 하나를 독점하지 않고, 누구도 문밖의 목소리를 혼자 판단하지 않는다.", quote: "열쇠는 방을 잠그는 물건이 아니라 서로의 책임을 여는 증표가 되었다." },
    { id: "epilogue", title: "SAFE HAVEN", body: "몇 계절 뒤, 낡은 간판 아래에는 밤마다 따뜻한 등이 켜진다. 여행자들은 폐허의 지도에 JUJU HOTEL을 집을 뜻하는 작은 원으로 표시한다.", quote: "MAY I HAVE A ROOM? — 네. 함께 지킬 방이 있습니다." },
  ] },
  { endingId: "THE_TRUTH", kicker: "FINAL EVENT · 기록 보관실", image: "/juminjung/assets/cutscenes/ending-the-truth-v1.png", imageAlt: "Lily와 Vale가 호텔 지하 기록실에서 아버지의 테이프, 생체 샘플, 음성 파형과 도시 지도를 대조하며 괴물의 기원을 밝혀내는 장면.", scenes: [
    { id: "archive", title: "아버지의 마지막 테이프", body: "Lily의 문서와 Vale의 연구를 겹치자 지하 보관실 번호가 드러난다. 테이프 속 아버지는 재난이 감염이 아니라, 사람의 기억을 흉내 내는 실험에서 시작됐다고 고백한다.", quote: "‘내가 문을 닫은 건 널 가두기 위해서가 아니라, 저것이 네 목소리를 배우지 못하게 하려던 거다.’" },
    { id: "broadcast", title: "진실의 주파수", body: "호텔 안테나가 도시 전역으로 연구 기록과 대응법을 송출한다. 방송이 이어질수록 어둠 속에서 가족의 목소리를 흉내 내던 것들이 하나씩 침묵한다.", quote: "진실은 세상을 되돌리지 못했지만, 거짓 목소리와 싸울 이름을 주었다." },
    { id: "epilogue", title: "THE TRUTH", body: "당신은 아버지를 용서하지도, 완전히 미워하지도 못한다. 대신 모든 기록을 공개 보관하고 다음 세대가 같은 문을 만들지 못하게 지킨다.", quote: "괴물의 이름을 알게 된 날, 우리는 처음으로 그것을 두려움 밖에서 바라보았다." },
  ] },
  { endingId: "FORTRESS", kicker: "FINAL EVENT · 철문 위의 깃발", image: "/juminjung/assets/cutscenes/ending-fortress-v1.png", imageAlt: "동틀 무렵 버텨 낸 호텔 철문과 위험한 계단참을 지키는 방위대 뒤로 정체 모를 형체들이 새벽빛 속으로 멀어지고, 생존자들이 명부를 확인하는 로비에 빈 탄약 상자와 구조 신호 라디오, 나란히 걸린 두 황동 열쇠가 보이는 장면.", scenes: [
    { id: "siege", title: "세 번의 경보", body: "외벽 센서가 동시에 울리고 호텔 방위대가 층별 사격 위치로 이동한다. 당신은 가장 두꺼운 철문 뒤가 아니라 가장 위험한 계단참에 선다.", quote: "‘이 선을 넘는 건 손님이 아니다.’" },
    { id: "victory", title: "무너지지 않은 밤", body: "동이 틀 무렵 마지막 그림자가 골목으로 물러난다. 탄약 상자는 비었지만 객실 문은 하나도 뚫리지 않았다. 생존자들은 승리보다 살아남은 사람의 이름을 먼저 센다.", quote: "요새는 벽의 두께가 아니라, 끝까지 자리를 지킨 사람들의 수로 완성되었다." },
    { id: "epilogue", title: "FORTRESS", body: "JUJU HOTEL은 폐허의 방패가 된다. 그러나 당신은 매일 무기고 열쇠와 로비 열쇠를 나란히 걸어 두며, 방패가 감옥이 되지 않도록 감시한다.", quote: "문은 닫혀 있었지만, 도움을 청하는 신호까지 막지는 않았다." },
  ] },
  { endingId: "HOME", kicker: "FINAL EVENT · 긴 식탁", scenes: [
    { id: "return", title: "돌아온 사람들", body: "Ruth가 식탁 끝에 약병을 내려놓고, Rosa와 Mia가 서로 다른 냄비를 한 화구에 올린다. 체크아웃했던 손님들까지 작은 물건 하나씩 들고 로비로 돌아온다.", quote: "‘방을 빌린 줄 알았는데, 돌아올 곳을 얻었네요.’" },
    { id: "names", title: "객실 이름표", body: "당신은 번호만 남아 있던 황동 열쇠표 뒤에 사람들의 이름을 새긴다. 떠난 이들의 이름도 지우지 않는다. 기억할 자리가 있는 한 그들은 공동체 밖으로 밀려나지 않는다.", quote: "호텔은 사람을 머물게 했고, 사람들은 호텔을 집으로 만들었다." },
    { id: "epilogue", title: "HOME", body: "해마다 첫 비가 오는 날이면 모두가 프런트 앞에 모인다. 누군가 문을 두드리면 가장 어린 아이가 당신에게 배운 질문을 건넨다.", quote: "‘혼자 오셨어요? 그래도 혼자 계실 필요는 없어요.’" },
  ] },
  { endingId: "KING_OF_THE_RUINS", kicker: "FINAL EVENT · 폐허의 시장", scenes: [
    { id: "auction", title: "모든 길의 가격", body: "교역 차량들이 호텔 앞 세 블록을 채운다. 연료, 약, 탄약, 정보가 황동 열쇠표 아래에서 거래되고 각 세력의 대표가 당신의 결정을 기다린다.", quote: "‘오늘 시세는 당신이 정합니다, 지배인.’" },
    { id: "crown", title: "카운터 위의 왕관", body: "당신은 가장 비싼 제안을 거절하지 않는다. 대신 모든 거래에 호텔의 몫을 붙인다. 굶주린 이도 값을 치러야 하고, 힘 있는 이도 줄을 서야 한다.", quote: "왕관은 없었다. 프런트 계산기와 잠긴 창고가 같은 일을 했다." },
    { id: "epilogue", title: "KING OF THE RUINS", body: "JUJU HOTEL은 도시를 움직이는 심장이 되지만 누구도 이곳을 자비롭다고 부르지 않는다. 당신의 장부는 정확했고, 그 정확함이 새로운 질서가 된다.", quote: "방은 있습니다. 값을 치를 수 있다면." },
  ] },
  { endingId: "MILITARY_OCCUPATION", kicker: "FINAL EVENT · 인계 명령", scenes: [
    { id: "arrival", title: "새벽의 군용차", body: "군용차가 골목을 봉쇄하고 Hayes가 서명된 인계 명령서를 카운터에 놓는다. 무전기에서는 이미 객실을 막사 번호로 바꾸라는 지시가 흘러나온다.", quote: "‘질서는 선택이 아니다. 오늘부터 이 호텔은 군의 자산이다.’" },
    { id: "handover", title: "빼앗긴 마스터키", body: "저항할 사람도 남아 있지만 첫 총성이 누구를 향할지 당신은 안다. 마스터키를 내려놓는 순간 병사들이 로비의 이름표를 떼고 통행 등급표를 붙인다.", quote: "호텔은 살아남았다. 다만 누구를 위한 생존인지 묻는 사람은 사라졌다." },
    { id: "epilogue", title: "MILITARY OCCUPATION", body: "당신은 계속 프런트에 앉아 있지만 방을 내줄 권한은 없다. 밤마다 문밖에서 노크가 들리고, 승인 목록에 없는 이름들이 비에 젖어 지워진다.", quote: "May I have a room? — 허가 번호를 제시하십시오." },
  ] },
  { endingId: "THE_DOOR", kicker: "HIDDEN FINAL EVENT · 0호실", image: "/juminjung/assets/cutscenes/ending-the-door-v2.png", imageAlt: "존재하지 않는 지하 복도의 0호실 앞에서 한 생존자가 문에 손을 뻗고, 동시에 열린 객실 문들 사이 바닥에는 평범한 사람과 길고 마른 비인간적 형체의 그림자가 겹쳐 드리운 장면.", scenes: [
    { id: "knock", title: "안쪽에서 들린 노크", body: "존재하지 않던 지하 복도 끝에 0호실 문이 서 있다. 세 번의 노크 뒤, 문 안쪽에서 오래전 사라진 아버지가 당신의 어린 시절 별명을 부른다.", quote: "똑. 똑. 똑. — ‘문을 열어다오.’" },
    { id: "question", title: "마지막 손님", body: "Mr. White의 그림자와 아버지의 목소리가 문틈에서 겹친다. 그것은 방을 요구하지 않는다. 대신 당신이 지금까지 들인 모든 사람이 정말 인간이었는지 묻는다.", quote: "‘네가 지킨 건 사람인가, 끝까지 인간답게 대하려던 규칙인가?’" },
    { id: "epilogue", title: "THE DOOR", body: "당신이 손잡이를 돌리자 호텔의 모든 객실 문이 동시에 열린다. 아침 장부에는 단 한 줄만 남고, 그날 이후 누구도 0호실의 위치를 같은 곳에서 찾지 못한다.", quote: "마지막 체크인: JUJU HOTEL 자체." },
  ] },
];
