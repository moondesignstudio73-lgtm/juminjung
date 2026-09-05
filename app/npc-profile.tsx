'use client';

import { useState } from 'react';
import { CircleHelp } from 'lucide-react';
import {
  getJobLabel,
  getNpcRank,
  getProfessionalStats,
  NPC_RANK_MEANING,
  type ProfessionalStat,
} from '@/game/npc-rank';
import type { Guest, Resources } from '@/game/types';
import { formatUpkeep, getNpcUpkeep } from '@/game/npc-upkeep';

const RESOURCE_LABELS: Record<keyof Resources, string> = {
  food: '식량',
  water: '물',
  fuel: '연료',
  medicine: '의약품',
  parts: '부품',
  security: '보안 물자',
};

const TRAIT_LABELS: Record<string, string> = {
  Kind: '다정함', HardWorker: '성실함', Calm: '침착함', Brave: '용감함',
  Resourceful: '임기응변', Loyal: '의리 있음', Clean: '깔끔함', Handy: '손재주',
  Careful: '신중함', CAREFUL: '꼼꼼함', FAST_WASTEFUL: '성급한 손길',
  STEADY: '차분함', Religious: '신앙심', Parent: '보호자', Lonely: '외로움',
  Insomniac: '불면', Child: '어린이', Quiet: '과묵함', Responsible: '책임감',
  Mechanic: '정비 경험', Doctor: '의료 경험', Nurse: '간호 경험',
  Authority: '권위적', FormerPolice: '전직 경찰', Trader: '상인',
  Talkative: '말이 많음', Comforting: '위로하는 사람', Persistent: '집요함',
  Just: '정의감', FormerSoldier: '군 경험', Cook: '조리 경험', Funny: '유머러스함',
  Executive: '경영 경험', Calculating: '계산적', Community: '공동체 우선',
  Agile: '민첩함', Streetwise: '거리 감각', Scientist: '연구자', Hunter: '사냥꾼',
  Observant: '관찰력', Engineer: '전력 기술', Tired: '만성 피로',
  Cautious: '조심스러움', Pregnant: '임신', Polite: '정중함', Unknown: '정체 불명',
  Thief: '절도 성향', Violent: '폭력 성향', Coward: '겁이 많음', Sickly: '허약함',
  Greedy: '탐욕적', Liar: '거짓말 성향', Alcoholic: '알코올 의존',
  Paranoid: '편집적', Noisy: '소란스러움',
  SmallEater: '소식가', BigEater: '대식가', Thirsty: '물을 많이 마심',
  Frugal: '절약형',
};

const NEGATIVE_TRAITS = new Set([
  'Thief', 'Violent', 'Coward', 'Sickly', 'Greedy', 'Liar', 'Alcoholic',
  'Paranoid', 'Noisy', 'Tired', 'Calculating', 'Unknown',
  'BigEater', 'Thirsty',
]);

function contributionLines(guest: Guest, negotiated = false) {
  return (Object.keys(RESOURCE_LABELS) as Array<keyof Resources>).flatMap(
    (resource) => {
      const base = Number(guest.offer[resource] ?? 0);
      const extra = negotiated ? Number(guest.negotiatedOffer[resource] ?? 0) : 0;
      return base + extra > 0
        ? [`${RESOURCE_LABELS[resource]} ${base + extra}${extra > 0 ? ' · 협상 포함' : ''}`]
        : [];
    },
  );
}

function visibleTraits(guest: Guest) {
  const raw = [
    ...(guest.professionalTraits ?? []),
    ...guest.baseTraits,
    ...guest.discoveredTraits,
  ];
  return [...new Set(raw)].slice(0, 3).map((trait) => ({
    id: trait,
    label: TRAIT_LABELS[trait] ?? trait,
    negative: NEGATIVE_TRAITS.has(trait),
  }));
}

export function NpcRankBadge({ guest }: { guest: Guest }) {
  const rank = getNpcRank(guest);
  return (
    <span
      className={`npc-rank rank-${rank.toLowerCase()}`}
      title={`${rank}등급 · ${NPC_RANK_MEANING[rank]}`}
      aria-label={`${rank}등급, ${NPC_RANK_MEANING[rank]}`}
    >
      {rank}
    </span>
  );
}

function StatRows({
  stats,
  onExplain,
}: {
  stats: ProfessionalStat[];
  onExplain: (stat: ProfessionalStat) => void;
}) {
  return (
    <dl className="npc-stat-list">
      {stats.map((stat) => (
        <div key={stat.id}>
          <dt>{stat.label}</dt>
          <dd>{stat.value}</dd>
          <button
            type="button"
            className="stat-help-button"
            aria-label={`${stat.label} 설명`}
            onClick={() => onExplain(stat)}
          >
            <CircleHelp aria-hidden="true" />
          </button>
        </div>
      ))}
    </dl>
  );
}

export function NpcProfileLedger({
  guest,
  negotiated = false,
  resident = false,
}: {
  guest: Guest;
  negotiated?: boolean;
  resident?: boolean;
}) {
  const [tab, setTab] = useState<'life' | 'skills' | 'traits'>('life');
  const [explained, setExplained] = useState<ProfessionalStat | null>(null);
  const contribution = contributionLines(guest, negotiated);
  const upkeep = getNpcUpkeep(guest);
  const stats = getProfessionalStats(guest);
  const traits = visibleTraits(guest);
  return (
    <section className="npc-profile-ledger">
      <nav aria-label="NPC 정보 분류">
        {([
          ['life', '물자·유지비'],
          ['skills', '전문 능력'],
          ['traits', '특성'],
        ] as const).map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-pressed={tab === id}
            onClick={() => {
              setTab(id);
              if (id !== 'skills') setExplained(null);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="npc-profile-page">
        {tab === 'life' && (
          <div className="npc-economy-grid">
            <section>
              <h4>{resident ? '입실 당시 기여' : '제공 가능 물자'}</h4>
              {contribution.length ? (
                contribution.map((line) => <p key={line}>{line}</p>)
              ) : (
                <p>제공 물자 없음</p>
              )}
              {guest.offeredItems.slice(0, 2).map((item) => (
                <small key={item.id}>{item.name}</small>
              ))}
            </section>
            <section>
              <h4>일일 유지비</h4>
              <p>식량 −{formatUpkeep(upkeep.food)}</p>
              <p>물 −{formatUpkeep(upkeep.water)}</p>
              <small>배급과 객실 효과에 따라 실제 소비가 달라집니다.</small>
            </section>
          </div>
        )}
        {tab === 'skills' && (
          <>
            <StatRows stats={stats} onExplain={setExplained} />
            <output className="stat-explanation" aria-live="polite">
              <strong>{explained?.label ?? '능력 설명'}</strong>
              <span>
                {explained?.help ?? 'ⓘ를 누르면 이 수치가 실제로 쓰이는 곳을 확인합니다.'}
              </span>
              {explained && (
                <button type="button" onClick={() => setExplained(null)}>
                  닫기
                </button>
              )}
            </output>
          </>
        )}
        {tab === 'traits' && (
          <section className="npc-traits">
            <h4>확인된 특성</h4>
            <div>
              {traits.length ? (
                traits.map((trait) => (
                  <span
                    key={trait.id}
                    className={trait.negative ? 'negative' : 'positive'}
                  >
                    {trait.negative ? '−' : '+'} {trait.label}
                  </span>
                ))
              ) : (
                <p>아직 확인된 특성이 없습니다.</p>
              )}
            </div>
            <small>숨겨진 특성은 조사와 사건을 통해 드러납니다.</small>
          </section>
        )}
      </div>
    </section>
  );
}

export function NpcCompactRecord({
  guest,
  negotiated = false,
  resident = false,
  onExplain,
}: {
  guest: Guest;
  negotiated?: boolean;
  resident?: boolean;
  onExplain: (owner: string, stat: ProfessionalStat) => void;
}) {
  const contribution = contributionLines(guest, negotiated);
  const upkeep = getNpcUpkeep(guest);
  const stats = getProfessionalStats(guest).slice(0, 2);
  const traits = visibleTraits(guest).slice(0, 2);
  return (
    <div className="npc-compact-record">
      <section>
        <h4>{resident ? '입실 당시 기여' : '보유 물자'}</h4>
        <p>{contribution.join(' · ') || '없음'}</p>
      </section>
      <section>
        <h4>일일 유지비</h4>
        <p>식량 −{formatUpkeep(upkeep.food)} · 물 −{formatUpkeep(upkeep.water)}</p>
      </section>
      <section>
        <h4>전문 능력</h4>
        {stats.map((stat) => (
          <p className="compact-stat" key={stat.id}>
            <span>{stat.label}</span><b>{stat.value}</b>
            <button
              type="button"
              aria-label={`${guest.name} ${stat.label} 설명`}
              onClick={() => onExplain(guest.name, stat)}
            >
              <CircleHelp aria-hidden="true" />
            </button>
          </p>
        ))}
      </section>
      <section>
        <h4>특성</h4>
        <p>{traits.map((trait) => `${trait.negative ? '−' : '+'} ${trait.label}`).join(' · ') || '확인 전'}</p>
      </section>
    </div>
  );
}

export function NpcIdentity({ guest }: { guest: Guest }) {
  return (
    <span className="npc-identity-line">
      <NpcRankBadge guest={guest} />
      <span>{getJobLabel(guest)}</span>
      {guest.specialization && <small>{guest.specialization}</small>}
    </span>
  );
}
