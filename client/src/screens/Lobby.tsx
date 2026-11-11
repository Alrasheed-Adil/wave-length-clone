import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { CATEGORIES } from '@shared/cards';
import type { Player, RoomView, TeamId } from '@shared/types';
import { useGame, useMe } from '../store';
import { LangToggle, PlayerChip, TEAM_COLOR, Wordmark } from '../components/ui';

export function Lobby({ room }: { room: RoomView }) {
  const { t } = useTranslation();
  const me = useMe();
  const { playerId, leaveRoom, setTeam, setReady, startGame } = useGame();
  const isHost = room.hostId === playerId;
  const coop = room.settings.mode === 'coop';
  const [copied, setCopied] = useState(false);

  const byTeam = (team: TeamId | null) => room.players.filter((p) => p.team === team);
  const a = byTeam('A');
  const b = byTeam('B');
  const watchers = byTeam(null);
  const canStart = coop ? a.length >= 2 : a.length >= 2 && b.length >= 2;

  const copy = async () => {
    const url = `${location.origin}${location.pathname}?room=${room.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked; the code is visible anyway */
    }
  };

  const tagFor = (p: Player) =>
    [p.id === room.hostId ? t('lobby.host') : null, p.ready ? t('lobby.ready') : null].filter(Boolean).join(' · ');

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-5 sm:px-8">
      <header className="flex items-center justify-between gap-3">
        <Wordmark />
        <div className="flex items-center gap-2">
          <LangToggle />
          <button className="key key-sm" onClick={leaveRoom}>
            {t('lobby.leave')}
          </button>
        </div>
      </header>

      {/* Room code ticket */}
      <section className="mt-6 flex flex-wrap items-end justify-between gap-4 border-y-2 border-ink py-4">
        <div>
          <div className="label">{t('lobby.room')}</div>
          <div dir="ltr" className="mt-1 font-mono text-5xl font-medium tracking-[0.2em] sm:text-6xl">
            {room.code}
          </div>
        </div>
        <button className="key key-sm" onClick={() => void copy()}>
          {copied ? t('lobby.copied') : t('lobby.copy')}
        </button>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Teams */}
        <section className={`grid gap-4 ${coop ? '' : 'sm:grid-cols-2'}`}>
          {(coop ? (['A'] as TeamId[]) : (['A', 'B'] as TeamId[])).map((team) => {
            const list = team === 'A' ? a : b;
            const mine = me?.team === team;
            return (
              <div key={team} className="sheet overflow-hidden">
                <div
                  className="flex items-center justify-between px-4 py-2.5 text-glow"
                  style={{ background: coop ? 'var(--color-ink)' : TEAM_COLOR[team] }}
                >
                  <h2 className="text-lg font-extrabold">
                    {coop ? t('lobby.players') : team === 'A' ? t('lobby.teamA') : t('lobby.teamB')}
                  </h2>
                  <span className="font-mono text-sm">{list.length}</span>
                </div>
                <ul className="min-h-24 space-y-1 p-2">
                  <AnimatePresence initial={false}>
                    {list.map((p) => (
                      <motion.li
                        key={p.id}
                        layout
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <PlayerChip player={p} tag={tagFor(p)} highlight={p.id === playerId} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                  {list.length === 0 && <li className="px-2 py-6 text-center text-ink-3">{t('lobby.empty')}</li>}
                </ul>
                {!mine && (
                  <div className="border-t-2 border-ink/15 p-2">
                    <button className="key key-sm w-full" onClick={() => setTeam(team)}>
                      {coop ? t('lobby.play') : t('lobby.joinTeam')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          <div className={coop ? '' : 'sm:col-span-2'}>
            <div className="flex items-center justify-between">
              <span className="label">
                {t('lobby.spectators')} · {watchers.length}
              </span>
              {me?.team !== null && (
                <button className="text-sm font-semibold underline underline-offset-4" onClick={() => setTeam(null)}>
                  {t('lobby.watch')}
                </button>
              )}
            </div>
            {watchers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {watchers.map((p) => (
                  <PlayerChip key={p.id} player={p} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Settings + start */}
        <aside className="space-y-4">
          <Settings room={room} isHost={isHost} />

          {me && me.team !== null && (
            <button
              className={`key w-full ${me.ready ? 'key-ink' : ''}`}
              onClick={() => setReady(!me.ready)}
              aria-pressed={me.ready}
            >
              {me.ready ? `✓ ${t('lobby.ready')}` : t('lobby.imReady')}
            </button>
          )}

          {isHost ? (
            <div>
              <button className="key key-signal w-full py-3.5 text-lg" disabled={!canStart} onClick={startGame}>
                {t('lobby.start')}
              </button>
              {!canStart && (
                <p className="mt-2 text-center text-sm text-ink-3">
                  {coop ? t('lobby.needTwo') : t('lobby.needTwoPerTeam')}
                </p>
              )}
            </div>
          ) : (
            <p className="py-2 text-center font-semibold text-ink-2">{t('lobby.waitingHost')}</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function Settings({ room, isHost }: { room: RoomView; isHost: boolean }) {
  const { t } = useTranslation();
  const update = useGame((s) => s.updateSettings);
  const uiLang = useGame((s) => s.lang);
  const s = room.settings;

  const Seg = <T extends string>({
    value,
    options,
    onPick,
  }: {
    value: T;
    options: { v: T; label: string }[];
    onPick: (v: T) => void;
  }) => (
    <div className="mt-1.5 flex rounded-md border-2 border-ink p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          disabled={!isHost}
          onClick={() => onPick(o.v)}
          className={`flex-1 rounded px-2 py-1.5 text-sm font-bold transition-colors ${
            value === o.v ? 'bg-ink text-glow' : 'text-ink-2 enabled:hover:bg-paper-3'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="sheet p-4">
      <h2 className="label">{t('lobby.settings')}</h2>

      <div className="mt-3">
        <div className="text-sm font-bold">{t('lobby.mode')}</div>
        <Seg
          value={s.mode}
          options={[
            { v: 'teams', label: t('lobby.teams') },
            { v: 'coop', label: t('lobby.coop') },
          ]}
          onPick={(mode) => update({ mode })}
        />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm font-bold">{t('lobby.rounds')}</div>
        <div className="flex items-center gap-2" dir="ltr">
          <button className="key key-sm !px-2.5" disabled={!isHost || s.rounds <= 2} onClick={() => update({ rounds: s.rounds - 1 })}>
            −
          </button>
          <span className="w-8 text-center font-mono text-xl">{s.rounds}</span>
          <button className="key key-sm !px-2.5" disabled={!isHost || s.rounds >= 20} onClick={() => update({ rounds: s.rounds + 1 })}>
            +
          </button>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-sm font-bold">{t('lobby.cardLang')}</div>
        <Seg
          value={s.lang}
          options={[
            { v: 'en', label: 'English' },
            { v: 'ar', label: 'العربية' },
          ]}
          onPick={(lang) => update({ lang })}
        />
      </div>

      <div className="mt-3">
        <div className="text-sm font-bold">{t('lobby.categories')}</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => {
            const on = s.categories.includes(c.id);
            return (
              <button
                key={c.id}
                disabled={!isHost}
                aria-pressed={on}
                onClick={() =>
                  update({ categories: on ? s.categories.filter((x) => x !== c.id) : [...s.categories, c.id] })
                }
                className={`rounded-md border-2 border-ink px-2.5 py-1 text-sm font-semibold transition-colors ${
                  on ? 'bg-amber' : 'bg-transparent text-ink-3 line-through decoration-2'
                }`}
              >
                {c.name[uiLang]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
