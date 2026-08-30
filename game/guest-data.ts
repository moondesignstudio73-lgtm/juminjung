import type { AuraDefinition, Guest, Resources } from "./types.ts";

export const ELEANOR_ID = "eleanor";
type Seed = {
  id:string; name:string; age:number; gender:string; role:string; description:string; days:[number,number]; stay:number;
  traits:string[]; hidden:string[]; aura:AuraDefinition|null; relations?:Guest["relationships"];
  offer?:Partial<Resources>; items?:Guest["offeredItems"]; risk?:number; condition?:string; intro?:string; portrait?:string; arrivalConditions?:Guest["arrivalConditions"];
};

const aura = (id:string,name:string,metric:AuraDefinition["metric"],value:number,description:string,diseaseType?:AuraDefinition["diseaseType"]):AuraDefinition => ({ id,name,metric,value,description,diseaseType,operation:metric==="diseaseChance"?"SET":"ADD",radius:1,distance:"CHEBYSHEV" });
const stages:Guest["eventChain"] = ["ARRIVAL","LIFE_AT_HOTEL","CONFLICT","RESOLUTION"].map((stage) => ({ id:stage.toLowerCase(),stage:stage as Guest["eventChain"][number]["stage"],title:stage.replaceAll("_"," "),completed:false }));
const item=(id:string,type:Guest["offeredItems"][number]["type"],name:string,detail:string):Guest["offeredItems"][number]=>({id,type,name,short:detail,detail});

const seeds:Seed[] = [
  {id:"eleanor",name:"엘리너 리드",age:31,gender:"여성",role:"응급의학과 의사",description:"침착하고 효율을 우선하는 의사.",days:[1,4],stay:2,traits:["Calm","Doctor"],hidden:["TriageGuilt"],aura:aura("medical-care-zone","Medical Care Zone","diseaseChance",0,"주변 NORMAL_DISEASE 확률을 0%로 낮춘다.","NORMAL_DISEASE"),portrait:"/juminjung/assets/portraits/eleanor/neutral-v1.png",relations:[{targetId:"ruth",type:"ALLY",value:40},{targetId:"claire",type:"PATIENT",value:30},{targetId:"victor",type:"ETHICAL_CONFLICT",value:-35}],offer:{food:3,fuel:8,medicine:3},items:[item("medicine","MEDICINE","의약품 ×3","밀봉된 응급 의약품."),item("bandage","MEDICINE","붕대 ×2","깨끗한 의료용 붕대."),item("medical-id","INFORMATION","의료인 신분증","세인트 머시 병원 신분증.")]},
  {id:"walter",name:"월터 브릭스",age:67,gender:"남성",role:"전직 정비공",description:"퉁명스럽지만 책임감이 강한 아버지의 옛 친구.",days:[2,6],stay:4,traits:["Responsible","Mechanic"],hidden:["FatherOldFriend"],aura:aura("maintenance-zone","Maintenance Zone","breakdownRisk",-25,"주변 객실과 시설의 고장 위험 감소."),portrait:"/juminjung/assets/portraits/walter/neutral-v1.png",relations:[{targetId:"father",type:"OLD_FRIEND",value:70}],offer:{parts:4,fuel:2},items:[item("parts","VALUABLE","부품 ×4","발전기에 맞는 정비 부품."),item("toolbox","VALUABLE","낡은 공구함","호텔 열쇠와 같은 문양이 있다.")]},
  {id:"mia",name:"미아 카터",age:9,gender:"여성",role:"어린이",description:"토끼 인형을 놓지 않는 말없는 아이.",days:[3,7],stay:5,traits:["Child","Quiet"],hidden:["InconsistentStory"],aura:aura("comfort-presence","Comfort Presence","stress",-8,"인접한 보호 성향 NPC의 Stress 감소."),portrait:"/juminjung/assets/portraits/mia/neutral-v1.png",relations:[{targetId:"daniel",type:"UNKNOWN_FAMILY",value:0}],offer:{food:1},items:[item("rabbit","VALUABLE","토끼 인형","한쪽 귀에 마른 피가 묻어 있다."),item("candy","FOOD","사탕 ×1","아이에게 남은 유일한 식량.")]},
  {id:"daniel",name:"다니엘 카터",age:38,gender:"남성",role:"실종자를 찾는 생존자",description:"미아의 아버지라고 주장하는 절박한 남자.",days:[6,12],stay:3,traits:["Persistent"],hidden:["UnverifiedFamily"],aura:aura("family-bond","Family Bond","stress",-12,"Mia 근처에서만 신뢰와 안정 증가."),portrait:"/juminjung/assets/portraits/daniel/neutral-v1.png",relations:[{targetId:"mia",type:"UNKNOWN_FAMILY",value:0}],offer:{fuel:3},items:[item("photo","INFORMATION","가족사진","미아와 닮은 아이가 있지만 얼굴이 긁혀 있다.")]},
  {id:"samuel",name:"새뮤얼 프라이스",age:44,gender:"남성",role:"전직 경찰",description:"규칙과 질서를 중시하는 전직 경찰.",days:[4,9],stay:4,traits:["Authority","FormerPolice"],hidden:["AbandonedRefugees"],aura:aura("security-presence","Security Presence","security",12,"주변 도난과 폭력 위험 감소."),portrait:"/juminjung/assets/portraits/samuel/neutral-v1.png",relations:[{targetId:"owen",type:"SUSPICION",value:-25}],offer:{security:5},items:[item("ammo","VALUABLE","탄약 ×6","사용 가능한 권총 탄약."),item("badge","INFORMATION","경찰 배지","재난 첫날의 긁힌 흔적이 있다.")]},
  {id:"ruth",name:"루스 벨",age:36,gender:"여성",role:"간호사",description:"상냥하고 희생적인 간호사.",days:[5,10],stay:5,traits:["Kind","Nurse"],hidden:["MonsterScratch"],aura:aura("nursing-care","Nursing Care","diseaseChance",8,"주변 Injury 회복 보조.","INJURY"),portrait:"/juminjung/assets/portraits/ruth/neutral-v1.png",relations:[{targetId:"eleanor",type:"ALLY",value:40}],offer:{medicine:2},items:[item("bandage","MEDICINE","붕대 꾸러미","일부는 이미 사용됐다.")]},
  {id:"jack",name:"잭 먼로",age:29,gender:"남성",role:"떠돌이 상인",description:"능글맞고 여러 세력과 거래하는 상인.",days:[6,13],stay:2,traits:["Trader","Talkative"],hidden:["DoubleDealer"],aura:aura("trade-network","Trade Network","trade",15,"호텔 거래 효율 증가."),portrait:"/juminjung/assets/portraits/jack/neutral-v1.png",relations:[{targetId:"victor",type:"BUSINESS",value:25}],offer:{food:4,parts:2},items:[item("crate","VALUABLE","봉인된 거래 상자","내용물 목록과 실제 무게가 다르다.")]},
  {id:"grace",name:"그레이스 할로웨이",age:52,gender:"여성",role:"종교인",description:"차분하게 사람을 위로하는 신앙인.",days:[7,14],stay:6,traits:["Comforting","Religious"],hidden:["CultLeader"],aura:aura("faith","Faith","stress",-10,"주변 Stress 감소, 과학자와 갈등 가능."),portrait:"/juminjung/assets/portraits/grace/neutral-v1.png",relations:[{targetId:"vale",type:"IDEOLOGICAL_CONFLICT",value:-40}],offer:{food:2},items:[item("scripture","INFORMATION","낡은 경전","괴물 출현 날짜가 예언처럼 덧쓰여 있다.")]},
  {id:"owen",name:"오웬 밀러",age:24,gender:"남성",role:"탈영병",description:"민간인 공격 명령을 거부한 예민한 탈영병.",days:[8,14],stay:5,traits:["Just","FormerSoldier"],hidden:["Deserter"],aura:aura("combat-readiness","Combat Readiness","security",15,"주변 객실 습격 피해 감소."),portrait:"/juminjung/assets/portraits/owen/neutral-v1.png",relations:[{targetId:"hayes",type:"ENEMY",value:-80},{targetId:"samuel",type:"SUSPICION",value:-25}],offer:{security:6},items:[item("rifle","VALUABLE","손상된 소총","격발 장치가 고장 났다.")]},
  {id:"hayes",name:"마커스 헤이스 대령",age:55,gender:"남성",role:"군 잔존세력 지휘관",description:"호텔 편입을 노리는 강압적인 지휘관.",days:[11,17],stay:4,traits:["Military","Authoritarian"],hidden:["HotelTakeover"],aura:aura("military-control","Military Control","security",20,"같은 층 Security 증가, 자유도 감소."),portrait:"/juminjung/assets/portraits/hayes/neutral-v1.png",relations:[{targetId:"owen",type:"ENEMY",value:-80}],offer:{food:8,fuel:6,security:8},items:[item("orders","INFORMATION","군 편입 명령서","호텔을 임시 군사시설로 지정한다.")]},
  {id:"lily",name:"릴리 포스터",age:27,gender:"여성",role:"기자",description:"괴물 최초 출현을 추적하는 집요한 기자.",days:[9,16],stay:5,traits:["Curious","Journalist"],hidden:["OriginDocuments"],aura:aura("information-network","Information Network","information",15,"숨겨진 이벤트 사전 경고 확률 증가."),portrait:"/juminjung/assets/portraits/lily/neutral-v1.png",relations:[{targetId:"vale",type:"INVESTIGATION",value:20}],offer:{parts:2},items:[item("files","INFORMATION","취재 파일","괴물 최초 출현 지역 문서.")]},
  {id:"noah",name:"노아 그랜트",age:33,gender:"남성",role:"요리사",description:"유머러스하지만 알코올 의존을 숨긴 요리사.",days:[10,17],stay:6,traits:["Cook","Funny"],hidden:["Alcoholic"],aura:aura("kitchen-efficiency","Kitchen Efficiency","foodUse",-15,"주변 거주자의 식량 소비 감소."),offer:{food:6},items:[item("spices","FOOD","조미료 상자","식량 효율을 높일 수 있다.")]},
  {id:"victor",name:"빅터 케인",age:41,gender:"남성",role:"전 기업 임원",description:"사람을 자원 가치로 판단하는 정중한 협상가.",days:[11,18],stay:4,traits:["Executive","Calculating"],hidden:["BunkerMonopoly"],aura:aura("resource-optimization","Resource Optimization","trade",20,"거래 수익과 일부 자원 효율 증가."),portrait:"/juminjung/assets/portraits/victor/neutral-v1.png",relations:[{targetId:"rosa",type:"CLASS_CONFLICT",value:-30},{targetId:"eleanor",type:"ETHICAL_CONFLICT",value:-35}],offer:{food:10,fuel:10},items:[item("valuables","VALUABLE","귀금속 ×5","이제는 쓸모가 불분명한 귀금속.")]},
  {id:"rosa",name:"로사 마르티네즈",age:40,gender:"여성",role:"두 아이의 어머니",description:"공동체를 우선하는 기초 간병 경험자.",days:[12,19],stay:7,traits:["Parent","Community"],hidden:["CareExperience"],aura:aura("community-care","Community Care","stress",-8,"아이와 노약자의 Stress 감소."),portrait:"/juminjung/assets/portraits/rosa/neutral-v1.png",relations:[{targetId:"victor",type:"CLASS_CONFLICT",value:-30}],offer:{food:3,water:4},items:[item("family-bag","FOOD","가족 비상식량","아이들과 나눌 마지막 식량.")]},
  {id:"eli",name:"엘리 터너",age:17,gender:"남성",role:"좀도둑",description:"지역 골목과 하수도를 아는 경계심 강한 소년.",days:[13,20],stay:4,traits:["Agile","Streetwise"],hidden:["Thief"],aura:aura("theft-risk","Theft Risk","theftRisk",18,"낮은 Trust에서 주변 도난 위험 증가."),offer:{parts:1},items:[item("map","INFORMATION","하수도 지도","호텔 아래 폐쇄 통로가 표시돼 있다.")]},
  {id:"vale",name:"에이드리언 베일 박사",age:48,gender:"남성",role:"생물학자",description:"괴물 출현 전 유사 생물을 연구한 생물학자.",days:[14,21],stay:6,traits:["Scientist","Calm"],hidden:["PreOutbreakResearch"],aura:aura("monster-analysis","Monster Analysis","information",20,"Monster Threat 이벤트 일부 예측."),portrait:"/juminjung/assets/portraits/vale/neutral-v1.png",relations:[{targetId:"lily",type:"INVESTIGATION",value:20},{targetId:"white",type:"UNKNOWN",value:0}],offer:{medicine:2},items:[item("sample","INFORMATION","조직 샘플","인간과 다른 조직이 든 밀봉관.")]},
  {id:"hazel",name:"헤이즐 퀸",age:34,gender:"여성",role:"사냥꾼",description:"괴물의 행동 패턴을 관찰하는 과묵한 사냥꾼.",days:[15,22],stay:5,traits:["Hunter","Observant"],hidden:["FamilyLost"],aura:aura("perimeter-watch","Perimeter Watch","monsterThreat",-12,"외곽 객실 배치 시 Monster Threat 감소."),portrait:"/juminjung/assets/portraits/hazel/neutral-v1.png",relations:[{targetId:"vale",type:"SUSPICION",value:-20},{targetId:"white",type:"SUSPICION",value:-60}],offer:{food:4,security:4},items:[item("traps","VALUABLE","사냥 덫 ×2","괴물 발자국과 맞지 않는 털이 끼어 있다.")]},
  {id:"thomas",name:"토머스 그레이",age:60,gender:"남성",role:"전력시설 기술자",description:"지역 전력망을 관리했던 지친 기술자.",days:[16,23],stay:5,traits:["Engineer","Tired"],hidden:["GridController"],aura:aura("power-optimization","Power Optimization","breakdownRisk",-20,"발전기 연료 소비와 고장 확률 감소."),offer:{parts:5},items:[item("grid-key","VALUABLE","전력망 제어 키","지역 변전소 접근 키.")]},
  {id:"claire",name:"클레어 노박",age:26,gender:"여성",role:"임신한 생존자",description:"위험 세력과 연결된 아이의 아버지를 숨긴다.",days:[17,24],stay:8,traits:["Cautious","Pregnant"],hidden:["DangerousFather"],aura:aura("protective-instinct","Protective Instinct","trust",8,"보호 성향 NPC의 Trust 상승."),portrait:"/juminjung/assets/portraits/claire/neutral-v1.png",relations:[{targetId:"eleanor",type:"PATIENT",value:30}],offer:{medicine:1},items:[item("ultrasound","INFORMATION","초음파 사진","뒷면에 군부대 좌표가 적혀 있다.")]},
  {id:"white",name:"미스터 화이트",age:0,gender:"불명",role:"불명",description:"먼지 하나 없는 흰 셔츠를 입은 정중한 남자.",days:[18,26],stay:3,traits:["Polite","Unknown"],hidden:["MonsterRelated","NonHumanPossible"],aura:aura("unknown-presence","Unknown Presence","stress",12,"주변 사건과 Stress를 비정상적으로 변화시킨다."),portrait:"/juminjung/assets/portraits/white/neutral-v1.png",relations:[{targetId:"vale",type:"UNKNOWN",value:0},{targetId:"hazel",type:"FEAR",value:-50}],offer:{},items:[],risk:85,condition:"상처 없음 · 비정상"},
];

const conditionalArrivals:Record<string,Guest["arrivalConditions"]> = {
  daniel:[{type:"GUEST_APPEARED",key:"mia"}],
  hayes:[{type:"GUEST_APPEARED",key:"owen"}],
};
const featuredTitles:Record<string,string[]> = {
  eleanor:["호텔 문 앞의 의사","첫 환자","두 사람 중 한 사람","의사의 기준"],
  walter:["낡은 공구함","발전기 아래의 이름","아버지의 거짓말","남겨진 열쇠"],
  mia:["토끼 인형","밤에 부르는 이름","Daniel의 방문","가족이라는 증거"],
  daniel:["문 앞의 낡은 사진","잠들지 못한 이름","찢긴 가족사진","기억보다 안전한 곳"],
  samuel:["반납하지 않은 배지","복도의 순찰자","봉쇄선의 명단","다시 세운 검문선"],
  ruth:["피 묻은 붕대 가방","쉬지 않는 간호사","붕대 아래의 긁힌 자국","병실이 아닌 집"],
  jack:["웃는 상인","계산이 다른 상자","두 장의 거래 장부","폐허의 시장"],
  grace:["꺼지지 않는 촛불","밤의 기도회","촛불 아래의 계시","믿음의 문턱"],
  owen:["무기를 내려놓은 병사","거부한 명령","Hayes의 요구","복종 또는 탈출"],
  hayes:["로비에 선 군인들","명령서의 객실 번호","호텔 접수 명령","누가 호텔을 지키는가"],
  lily:["젖은 취재 파일","지도에서 지워진 구역","검게 칠한 문장","누가 진실을 소유하는가"],
  noah:["향신료 상자","오랜만의 따뜻한 냄새","비어 가는 저장고","다시 차린 저녁"],
  victor:["값을 매기는 손님","잠긴 서류 가방","지하 벙커 계약서","폐허의 왕좌"],
  rosa:["가족 비상식량","복도 끝의 식탁","아이들의 몫","호텔의 가족"],
  eli:["하수도에서 온 소년","열쇠 소리","사라진 황동 열쇠","맡겨진 열쇠고리"],
  vale:["밀봉된 조직 샘플","살아 있는 세포","연구 윤리의 경계","괴물의 이름"],
  hazel:["덫에 걸린 털","창가의 불침번","창밖의 표적","밤을 보는 사람"],
  thomas:["변전소의 열쇠","깜박이는 복도","발전기의 마지막 회로","호텔의 전력망"],
  claire:["젖은 초음파 사진","닫힌 커튼 뒤","문밖의 남편","태어날 아이의 방"],
  white:["깨끗한 흰 셔츠","서로 다른 기억","잠기지 않은 문","흔적 없는 손님"],
};

export function createGuests():Guest[] {
  return seeds.map((s) => ({
    id:s.id,name:s.name,age:s.age,gender:s.gender,role:s.role,description:s.description,portrait:s.portrait??"",expressions:["neutral","happy","sad","angry","afraid","suspicious","injured"],
    arrivalDay:s.days[0],arrivalDayRange:s.days,arrivalConditions:s.arrivalConditions??conditionalArrivals[s.id]??[],conditionLabel:s.condition??"피로 · 안정",introDialogue:s.intro??`${s.name}입니다. 오늘 밤 머물 방을 부탁합니다.`,negotiationDialogue:"제가 가진 것을 조금 더 내놓겠습니다. 안전한 방을 부탁합니다.",
    questions:[{id:"origin",label:"어디서 왔습니까?",answer:s.description},{id:"purpose",label:"왜 이 호텔입니까?",answer:"불이 켜진 곳이 여기뿐이었습니다."}],offeredItems:s.items??[],offer:s.offer??{},negotiatedOffer:{},
    baseTraits:s.traits,hiddenTraits:s.hidden,discoveredTraits:[],health:80,stress:45,trust:25,riskLevel:s.risk??35,relationships:s.relations??[],storyFlags:{},eventChain:stages.map((e,index)=>({...e,id:`${s.id}-${e.id}`,title:featuredTitles[s.id]?.[index]??e.title})),infectionState:"HEALTHY",alive:true,endingState:null,
    currentRoomNumber:null,stayDuration:s.stay,remainingNights:s.stay,checkedInDay:null,status:"WAITING",aura:s.aura,
  }));
}
