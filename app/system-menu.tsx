'use client';

import { useEffect, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  Download,
  LogOut,
  Menu,
  RotateCcw,
  Save,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getManualSaveSummaries,
  loadManualGame,
  saveManualGame,
  type ManualSaveSummary,
} from '@/game/save-manager';
import type { GameState } from '@/game/types';

type MenuView = 'main' | 'save' | 'load' | 'settings' | 'controls';

export function SystemMenu({
  state,
  muted,
  onMutedChange,
  onLoad,
  onTitle,
  onReset,
}: {
  state: GameState;
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
  onLoad: (state: GameState) => void;
  onTitle: () => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<MenuView>('main');
  const [confirmReset, setConfirmReset] = useState(false);
  const [slots, setSlots] = useState<ManualSaveSummary[]>([]);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (confirmReset) setConfirmReset(false);
      else {
        setOpen((current) => !current);
        setView('main');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmReset]);

  useEffect(() => {
    if (state.phase !== 'desk' || state.dailyVisitorIndex !== 0) return;
    setNotice('자동 저장 완료');
    const timer = window.setTimeout(() => setNotice(''), 1800);
    return () => window.clearTimeout(timer);
  }, [state.day, state.phase, state.dailyVisitorIndex]);

  const openView = (next: MenuView) => {
    setSlots(getManualSaveSummaries());
    setView(next);
  };
  const saveSlot = (slot: number) => {
    saveManualGame(slot, state);
    setSlots(getManualSaveSummaries());
    setNotice(`슬롯 ${slot}에 저장했습니다`);
  };
  const loadSlot = (slot: number) => {
    const loaded = loadManualGame(slot);
    if (!loaded) return;
    onLoad(loaded);
    setOpen(false);
    setView('main');
    setNotice(`슬롯 ${slot}을 불러왔습니다`);
  };

  return (
    <>
      <button
        className="system-menu-trigger"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Menu /> 메뉴 <kbd>ESC</kbd>
      </button>
      {notice && <output className="save-notice">{notice}</output>}
      {open && (
        <div
          className="pause-layer"
          role="dialog"
          aria-modal="true"
          aria-label="일시정지 메뉴"
        >
          <section className="pause-menu">
            <header>
              <span>JUJU HOTEL</span>
              <strong>
                {view === 'main'
                  ? '일시정지'
                  : view === 'save'
                    ? '저장하기'
                    : view === 'load'
                      ? '불러오기'
                      : view === 'settings'
                        ? '설정'
                        : '조작법'}
              </strong>
              <small>
                DAY {Math.max(1, state.day)} · 현재 진행은 자동 저장됩니다
              </small>
            </header>
            {view === 'main' ? (
              <nav>
                <Button className="resume" onClick={() => setOpen(false)}>
                  계속하기
                </Button>
                <button onClick={() => openView('save')}>
                  <Save /> 저장하기
                </button>
                <button onClick={() => openView('load')}>
                  <Download /> 불러오기
                </button>
                <button onClick={() => openView('settings')}>
                  <Settings /> 설정
                </button>
                <button onClick={() => openView('controls')}>
                  <BookOpen /> 조작법
                </button>
                <button onClick={onTitle}>
                  <LogOut /> 타이틀 화면으로
                </button>
                <button
                  className="danger-link"
                  onClick={() => setConfirmReset(true)}
                >
                  <RotateCcw /> 새 게임
                </button>
              </nav>
            ) : (
              <div className="pause-subview">
                <button className="back" onClick={() => setView('main')}>
                  <ChevronLeft /> 메뉴로
                </button>
                {(view === 'save' || view === 'load') && (
                  <>
                    <article className="autosave-slot">
                      <span>AUTO SAVE</span>
                      <strong>DAY {Math.max(1, state.day)}</strong>
                      <small>장면이 바뀔 때 자동 저장</small>
                    </article>
                    <div className="manual-slots">
                      {slots.map((slot) => (
                        <button
                          key={slot.slot}
                          disabled={view === 'load' && slot.day === null}
                          onClick={() =>
                            view === 'save'
                              ? saveSlot(slot.slot)
                              : loadSlot(slot.slot)
                          }
                        >
                          <span>슬롯 {slot.slot}</span>
                          <strong>
                            {slot.day === null
                              ? '비어 있음'
                              : `DAY ${slot.day}`}
                          </strong>
                          <small>
                            {slot.savedAt
                              ? new Date(slot.savedAt).toLocaleTimeString(
                                  'ko-KR',
                                  { hour: '2-digit', minute: '2-digit' },
                                )
                              : view === 'save'
                                ? '현재 진행 저장'
                                : '저장 데이터 없음'}
                          </small>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {view === 'settings' && (
                  <button
                    className="sound-setting"
                    onClick={() => onMutedChange(!muted)}
                  >
                    {muted ? <VolumeX /> : <Volume2 />}
                    <span>
                      <strong>소리</strong>
                      <small>{muted ? '꺼짐' : '켜짐'}</small>
                    </span>
                  </button>
                )}
                {view === 'controls' && (
                  <dl className="controls-list">
                    <div>
                      <dt>ESC</dt>
                      <dd>메뉴 열기·닫기</dd>
                    </div>
                    <div>
                      <dt>클릭</dt>
                      <dd>대화, 선택, 객실 배정</dd>
                    </div>
                    <div>
                      <dt>오늘의 목표</dt>
                      <dd>막혔을 때 가장 먼저 확인</dd>
                    </div>
                    <div>
                      <dt>빨간 큰 버튼</dt>
                      <dd>현재 장면의 다음 행동</dd>
                    </div>
                  </dl>
                )}
              </div>
            )}
          </section>
          {confirmReset && (
            <section
              className="reset-confirm"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="reset-title"
            >
              <TriangleAlertIcon />
              <h2 id="reset-title">현재 진행 상황이 삭제됩니다.</h2>
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
                    setOpen(false);
                    setConfirmReset(false);
                  }}
                >
                  새 게임 시작
                </Button>
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}

function TriangleAlertIcon() {
  return (
    <span className="reset-warning" aria-hidden="true">
      !
    </span>
  );
}
