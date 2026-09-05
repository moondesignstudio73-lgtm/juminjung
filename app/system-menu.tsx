'use client';
import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Download,
  LogOut,
  Menu,
  Save,
  Settings,
  Volume2,
  VolumeX,
  Check,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  getManualSaveSummaries,
  loadManualGame,
  saveManualGame,
  loadBrowserGame,
  type ManualSaveSummary,
} from '@/game/save-manager';
import { canUseShortcut, saveOverview } from '@/game/ui-guidance';
import { emitUiCue } from '@/game/ui-cues';
import type { GameState } from '@/game/types';
const HELP = [
  [
    '호텔의 하루',
    '아침 보고를 읽고 프론트에서 손님을 받습니다. 주민과 배급을 살핀 뒤 밤에는 호텔 지도로 필요한 공간을 찾아갑니다. 모든 일을 할 필요는 없습니다.',
  ],
  [
    '객실 배치와 확장',
    '중앙 객실은 주변을 돕는 능력에, 끝 객실은 접촉을 줄일 때 유리합니다. 추천은 강제가 아닙니다. 잠긴 방을 선택하면 파손 이유와 복구 비용이 보입니다. 야간 객실 구역에서 복구하세요.',
  ],
  [
    '주민과 직업',
    '주민은 자동 퇴실하지 않고 매일 식량·물을 소비합니다. 직업에 맞는 객실 복구를 부탁하면 기본 시간·부품이 줄어듭니다. 부상·질병·탈진 중에는 일을 맡길 수 없습니다. 퇴실은 확인을 거칩니다.',
  ],
  [
    '시설과 자동화',
    '발전기 수치는 내구도입니다. DAY 4부터 점검, DAY 5부터 주민 업무를 확인할 수 있습니다. 정비 담당과 장치를 이용하면 일상 관리가 줄지만 대형 고장은 직접 수리해야 합니다.',
  ],
  [
    '야간과 자원',
    '화면을 읽는 동안 시간은 멈춥니다. 이동·작업에만 야간 시간이 들고, 식량·물의 실제 소비는 밤이 끝날 때 정산합니다. 체크인 순간에 일일 유지비를 미리 빼지는 않습니다.',
  ],
  [
    '조작과 저장',
    'ESC 메뉴 · S 저장 메뉴 · J 호텔 장부. 프론트에서는 1 손님, 2 객실, 3 주민. 야간 시설 안에서는 4 호텔 지도로 돌아갑니다. 입력 칸과 Ctrl/Alt 조합에서는 단축키를 실행하지 않습니다.',
  ],
];
export function SystemMenu({
  state,
  blocked = false,
  muted,
  onMutedChange,
  onLoad,
  onTitle,
}: {
  state: GameState;
  blocked?: boolean;
  muted: boolean;
  onMutedChange: (value: boolean) => void;
  onLoad: (state: GameState) => void;
  onTitle: () => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false),
    [view, setView] = useState('main'),
    [slots, setSlots] = useState<ManualSaveSummary[]>([]),
    [notice, setNotice] = useState(''),
    [failed, setFailed] = useState(false),
    [pending, setPending] = useState<number | null>(null);
  const [uiScale, setUiScale] = useState<'compact' | 'normal' | 'large'>('normal'),
    [quietMotion, setQuietMotion] = useState(false),
    [preferencesReady, setPreferencesReady] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    if (open) emitUiCue('navigation', muted);
  }, [open, muted]);
  useEffect(() => {
    if (notice && !failed) emitUiCue('save', muted);
  }, [notice, failed, muted]);
  const openView = (next: string) => {
    try {
      setSlots(getManualSaveSummaries());
    } catch {
      setNotice(
        '저장 공간에 접근할 수 없습니다. 브라우저 저장 권한을 확인하세요.',
      );
      setFailed(true);
    }
    setPending(null);
    setView(next);
    setOpen(true);
  };
  useEffect(() => {
    try {
      const savedScale = localStorage.getItem('juju-ui-scale');
      setUiScale(
        savedScale === 'compact' || savedScale === 'large' || savedScale === 'normal'
          ? savedScale
          : localStorage.getItem('juju-large-text') === 'true'
            ? 'large'
            : 'normal',
      );
      setQuietMotion(localStorage.getItem('juju-quiet-motion') === 'true');
    } catch {}
    setPreferencesReady(true);
  }, []);
  useEffect(() => {
    if (!preferencesReady) return;
    document.body.dataset.uiScale = uiScale;
    delete document.body.dataset.largeText;
    document.body.dataset.quietMotion = String(quietMotion);
    try {
      localStorage.setItem('juju-ui-scale', uiScale);
      localStorage.removeItem('juju-large-text');
      localStorage.setItem('juju-quiet-motion', String(quietMotion));
    } catch {}
  }, [preferencesReady, uiScale, quietMotion]);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !open && !blocked) {
        event.preventDefault();
        setView('main');
        setOpen(true);
      } else if (
        event.key.toLowerCase() === 's' &&
        canUseShortcut(
          event,
          event.target as Element,
          !!document.querySelector('[role="dialog"]'),
        )
      ) {
        event.preventDefault();
        openView('save');
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, blocked]);
  useEffect(() => {
    const saved = (event: Event) => {
      const ok = (event as CustomEvent<{ ok: boolean }>).detail.ok;
      setFailed(!ok);
      setNotice(
        ok
          ? '저장됨'
          : '저장하지 못했습니다. 브라우저 저장 공간·권한을 확인하세요.',
      );
    };
    window.addEventListener('juju:save-result', saved);
    return () => window.removeEventListener('juju:save-result', saved);
  }, []);
  useEffect(() => {
    if (!notice || failed) return;
    const timer = setTimeout(() => setNotice(''), 2200);
    return () => clearTimeout(timer);
  }, [notice, failed]);
  const act = (slot: number) => {
    if (busy.current) return;
    busy.current = true;
    try {
      if (view === 'save') {
        const ok = saveManualGame(slot, state);
        setFailed(!ok);
        setNotice(
          ok
            ? '슬롯 ' + slot + ' 저장됨'
            : '저장하지 못했습니다. 저장 공간·권한을 확인하세요.',
        );
        if (ok) setSlots(getManualSaveSummaries());
      } else {
        const loaded = slot === 0 ? loadBrowserGame() : loadManualGame(slot);
        if (!loaded) {
          setFailed(true);
          setNotice('이 저장은 불러올 수 없습니다. 다른 슬롯을 선택하세요.');
          return;
        }
        onLoad(loaded);
        setOpen(false);
        setFailed(false);
        setNotice('저장한 시점으로 돌아왔습니다.');
      }
      setPending(null);
    } catch {
      setFailed(true);
      setNotice('저장 공간을 사용할 수 없습니다. 브라우저 설정을 확인하세요.');
    } finally {
      setTimeout(() => {
        busy.current = false;
      }, 250);
    }
  };
  const overview = saveOverview(state);
  return (
    <>
      <Button
        className="system-menu-trigger"
        variant="outline"
        onClick={() => {
          setView('main');
          setOpen(true);
        }}
      >
        <Menu />
        메뉴 <kbd>ESC</kbd>
      </Button>
      {notice && (
        <output
          className={'save-notice ' + (failed ? 'save-failed' : '')}
          role={failed ? 'alert' : 'status'}
        >
          {failed ? <TriangleAlert /> : <Check />}
          {notice}
        </output>
      )}
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setPending(null);
        }}
      >
        <DialogContent
          className="pause-menu game-system-dialog"
          showCloseButton={false}
        >
          <header>
            <span>JUJU HOTEL</span>
            <DialogTitle>
              {
                (
                  {
                    main: '일시정지',
                    save: '저장하기',
                    load: '불러오기',
                    settings: '설정',
                    help: '호텔 운영 안내',
                  } as Record<string, string>
                )[view]
              }
            </DialogTitle>
            <DialogDescription>
              DAY {state.day} · 메뉴를 보는 동안 게임은 진행되지 않습니다.
            </DialogDescription>
          </header>
          {view === 'main' ? (
            <nav>
              <Button className="resume" onClick={() => setOpen(false)}>
                계속하기
              </Button>
              <Button variant="outline" onClick={() => openView('save')}>
                <Save />
                저장하기 <kbd>S</kbd>
              </Button>
              <Button variant="outline" onClick={() => openView('load')}>
                <Download />
                불러오기
              </Button>
              <Button variant="outline" onClick={() => setView('settings')}>
                <Settings />
                설정
              </Button>
              <Button variant="outline" onClick={() => setView('help')}>
                <BookOpen />
                도움말
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  onTitle();
                }}
              >
                <LogOut />
                타이틀 화면으로
              </Button>
            </nav>
          ) : (
            <div className="pause-subview">
              <Button
                variant="ghost"
                onClick={() => {
                  setView('main');
                  setPending(null);
                }}
              >
                메뉴로
              </Button>
              {(view === 'save' || view === 'load') && (
                <>
                  <article className="autosave-slot">
                    <strong>자동 저장 · DAY {state.day}</strong>
                    <small>
                      주민 {overview.residents} · 객실 {overview.occupied}/
                      {overview.open}
                    </small>
                    {view === 'load' && (
                      <Button variant="outline" onClick={() => setPending(0)}>
                        자동 저장 불러오기
                      </Button>
                    )}
                  </article>
                  <div className="manual-slots">
                    {slots.map((slot) => (
                      <Button
                        key={slot.slot}
                        variant="outline"
                        disabled={view === 'load' && slot.day === null}
                        onClick={() => {
                          if (view === 'save' && slot.day === null)
                            act(slot.slot);
                          else setPending(slot.slot);
                        }}
                      >
                        <span>슬롯 {slot.slot}</span>
                        <strong>
                          {slot.day === null ? '비어 있음' : 'DAY ' + slot.day}
                        </strong>
                        {slot.day !== null && (
                          <span className="slot-context">
                            주민 {slot.residents ?? 0} · 객실{' '}
                            {slot.occupied ?? 0}/{slot.open ?? 0}
                            <br />
                            {slot.event}
                          </span>
                        )}
                        <small>
                          {slot.savedAt
                            ? new Date(slot.savedAt).toLocaleString('ko-KR', {
                                month: 'numeric',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '저장 기록 없음'}
                        </small>
                      </Button>
                    ))}
                  </div>
                  {pending !== null && (
                    <section
                      className="slot-confirm"
                      role="group"
                      aria-label="저장 작업 확인"
                    >
                      <p>
                        {view === 'save'
                          ? '이 슬롯의 이전 기록을 덮어쓸까요?'
                          : '현재 화면을 떠나 저장한 시점으로 돌아갈까요?'}
                      </p>
                      <Button
                        variant="secondary"
                        onClick={() => setPending(null)}
                      >
                        취소
                      </Button>{' '}
                      <Button onClick={() => act(pending)}>
                        {view === 'save' ? '덮어쓰기' : '불러오기 확정'}
                      </Button>
                    </section>
                  )}
                </>
              )}
              {view === 'settings' && (
                <div className="settings-list">
                  <Button
                    variant="outline"
                    aria-pressed={!muted}
                    onClick={() => onMutedChange(!muted)}
                  >
                    {muted ? <VolumeX /> : <Volume2 />}음향 사용{' '}
                    {muted ? '끔' : '켬'}
                  </Button>
                  <small>
                    효과음 연결 지점을 준비했습니다. 새 임시 음원은 넣지
                    않았습니다.
                  </small>
                  <section className="ui-scale-setting" aria-labelledby="ui-scale-title">
                    <strong id="ui-scale-title">UI 크기</strong>
                    <small>브라우저 확대 없이 게임 화면의 글자와 조작 크기를 바꿉니다.</small>
                    <div role="group" aria-label="UI 크기 선택">
                      {([
                        ['compact', '작게'],
                        ['normal', '보통'],
                        ['large', '크게'],
                      ] as const).map(([value, label]) => (
                        <Button
                          key={value}
                          variant="outline"
                          aria-pressed={uiScale === value}
                          onClick={() => setUiScale(value)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </section>
                  <Button
                    variant="outline"
                    aria-pressed={quietMotion}
                    onClick={() => setQuietMotion(!quietMotion)}
                  >
                    움직임 줄이기 {quietMotion ? '켬' : '끔'}
                  </Button>
                </div>
              )}
              {view === 'help' && (
                <div className="game-help">
                  {HELP.map(([title, text]) => (
                    <details key={title}>
                      <summary>{title}</summary>
                      <p>{text}</p>
                    </details>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
