import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { CATEGORIES } from '@shared/cards';
import type { RoomView, TeamId } from '@shared/types';
import { canCounter, canGuess, useGame } from '../store';
import { Dial } from '../components/Dial';
import { Avatar } from '../components/Avatar';
import { LangToggle, TEAM_COLOR, useTeamName, Wordmark } from '../components/ui';

export function Game({ room }: { room: RoomView }) {
  const { t } = useTranslation();
  const teamName = useTeamName();
  const g = useGame();
  const me = g.playerId;
  const isHost = room.hostId === me;
  const isPsychic = room.psychicId === me;
  const psychic = room.players.find((p) => p.id === room.psychicId);
  const coop = room.settings.mode === 'coop';
  const guessing = canGuess(room, me);
  const card = room.card!;
  const cardLang = room.settings.lang;
  const other: TeamId = room.activeTeam === 'A' ? 'B' : 'A';
  const tuner = room.players.find((p) => p.id === g.needleBy);
  const res = room.phase === 'reveal' ? room.lastResult : null;
  const category = CATEGORIES.find((c) => c.id === card.category);

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-3 pb-8 pt-4 sm:px-8">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-2">
        <div className="hidden sm:block">
          <Wordmark />
        </div>
        <div className="flex items-baseline gap-1.5 font-mono" dir="ltr">
          <span className="label !text-ink-2">{t('game.round')}</span>
          <span className="text-2xl font-medium">{String(room.round).padStart(2, '0')}</span>
          <span className="text-ink-3">/{String(room.settings.rounds).padStart(2, '0')}</span>
        </div>
        <Scoreboard room={room} />
        <LangToggle />
      </header>

      {/* Turn banner */}
      <div className="mt-4 flex items-center justify-center gap-2 text-center">
        {!coop && room.activeTeam && (
          <span
            className="rounded-md px-2.5 py-0.5 text-sm font-extrabold text-glow"
            style={{ background: TEAM_COLOR[room.activeTeam] }}
          >
            {t('game.turn', { team: teamName(room.activeTeam) })}
          </span>
        )}
        {psychic && (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-2">
            <Avatar id={psychic.avatar} size={22} />
            {t('game.psychic')}: {psychic.name}
          </span>
        )}
      </div>

      {/* Dial + card */}
      <section className="mt-3">
        <Dial
          value={g.needle}
          target={room.target}
          interactive={guessing}
          onChange={g.dragNeedle}
          onDragChange={g.setDragging}
          accent="var(--color-glow)"
          scored={res?.points ?? null}
          ariaLabel={`${card.left[cardLang]} — ${card.right[cardLang]}`}
        />
        <div dir="ltr" className="mx-auto -mt-px flex max-w-[640px] items-stretch">
          <EndPlate text={card.left[cardLang]} lang={cardLang} side="left" />
          <div className="flex items-center bg-ink px-2">
            <span className="label !text-paper-3 whitespace-nowrap" lang={g.lang}>
              {category?.name[g.lang]}
            </span>
          </div>
          <EndPlate text={card.right[cardLang]} lang={cardLang} side="right" />
        </div>
      </section>

      {/* Clue */}
      <AnimatePresence>
        {room.clue && (
          <motion.div
            key={room.clue + room.round}
            initial={{ rotate: -3, y: 12, opacity: 0 }}
            animate={{ rotate: -1, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="mx-auto mt-5 max-w-md border-2 border-ink bg-glow px-5 py-3 text-center shadow-[0_4px_0_var(--color-ink)]"
          >
            <div className="label">{t('game.clue')}</div>
            <div className="mt-0.5 text-2xl font-extrabold leading-tight sm:text-3xl" dir="auto">
              “{room.clue}”
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase controls */}
      <section className="mx-auto mt-5 w-full max-w-md text-center">
        {room.phase === 'clue' &&
          (isPsychic ? (
            <ClueForm />
          ) : (
            <Status>{t('game.waitingClue', { name: psychic?.name ?? '' })}</Status>
          ))}

        {room.phase === 'guess' &&
          (guessing ? (
            <div>
              <p className="text-ink-2">{t('game.tune')}</p>
              <p className="mt-1 h-5 text-sm text-ink-3">
                {tuner && tuner.id !== me ? `↻ ${tuner.name}` : ''}
              </p>
              <button className="key key-signal mt-2 w-full py-3.5 text-lg" onClick={g.lockIn}>
                {t('game.lockIn')}
              </button>
            </div>
          ) : (
            <Status>
              {isPsychic
                ? t('game.psychicWatch')
                : coop
                  ? t('game.tune')
                  : t('game.watchingGuess', { team: teamName(room.activeTeam) })}
            </Status>
          ))}

        {room.phase === 'counter' &&
          (canCounter(room, me) ? (
            <div>
              <p className="font-bold">{t('game.counterTitle')}</p>
              <div dir="ltr" className="mt-3 grid grid-cols-2 gap-3">
                <button className="key key-tide py-3 text-lg" onClick={() => g.counter('left')}>
                  ← {t('game.left')}
                </button>
                <button className="key key-tide py-3 text-lg" onClick={() => g.counter('right')}>
                  {t('game.right')} →
                </button>
              </div>
            </div>
          ) : (
            <Status>{t('game.counterWait', { team: teamName(other) })}</Status>
          ))}

        {res && (
          <div>
            <motion.div
              initial={{ scale: 1.6, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: -3, opacity: 1 }}
              transition={{ delay: 0.55, type: 'spring', stiffness: 380, damping: 14 }}
              className="mx-auto inline-block border-[3px] px-4 py-1.5 text-3xl font-extrabold uppercase"
              style={{
                borderColor: res.points ? 'var(--color-signal)' : 'var(--color-ink-3)',
                color: res.points ? 'var(--color-signal)' : 'var(--color-ink-3)',
              }}
            >
              {res.points === 4 ? t('game.bullseye') : t('game.points', { count: res.points })}
            </motion.div>
            {!coop && res.counter && (
              <p className="mt-3 font-semibold text-ink-2">
                {res.counterPoint
                  ? t('game.counterHit', { team: teamName(other) })
                  : t('game.counterMiss', { team: teamName(other) })}
              </p>
            )}
            {isHost || isPsychic ? (
              <button className="key key-ink mt-5 w-full py-3" onClick={g.next}>
                {room.round >= room.settings.rounds ? t('game.finish') : t('game.next')}
              </button>
            ) : (
              <Status>{t('game.waitingNext')}</Status>
            )}
          </div>
        )}

        {isHost && (room.phase === 'clue' || room.phase === 'guess') && !isPsychic && (
          <button className="mt-6 text-sm font-semibold text-ink-3 underline underline-offset-4" onClick={g.next}>
            {t('game.skip')}
          </button>
        )}
      </section>

      <Roster room={room} />
    </div>
  );
}

function EndPlate({ text, lang, side }: { text: string; lang: string; side: 'left' | 'right' }) {
  return (
    // The plate stays physically LTR so each label hugs the end of the dial it names,
    // while the words inside keep their own direction.
    <div
      dir="ltr"
      className={`flex flex-1 items-center gap-1.5 bg-ink px-3 py-2.5 text-[0.95rem] font-bold leading-tight text-glow sm:text-lg ${
        side === 'left' ? 'justify-start rounded-bl-lg' : 'justify-end rounded-br-lg'
      }`}
    >
      {side === 'left' && <span className="text-amber" aria-hidden="true">◂</span>}
      <span lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {text}
      </span>
      {side === 'right' && <span className="text-amber" aria-hidden="true">▸</span>}
    </div>
  );
}

function Status({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center justify-center gap-2 py-3 font-semibold text-ink-2">
      <span className="inline-flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-ink-2"
            animate={{ opacity: [0.25, 1, 0.25] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </span>
      {children}
    </p>
  );
}

function ClueForm() {
  const { t } = useTranslation();
  const sendClue = useGame((s) => s.sendClue);
  const redraw = useGame((s) => s.redraw);
  const [clue, setClue] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (clue.trim()) sendClue(clue);
      }}
    >
      <p className="font-extrabold">{t('game.youArePsychic')}</p>
      <p className="mt-1 text-sm text-ink-2">{t('game.psychicHint')}</p>
      <input
        autoFocus
        dir="auto"
        className="field mt-3 text-center text-lg"
        maxLength={60}
        value={clue}
        onChange={(e) => setClue(e.target.value)}
        placeholder={t('game.cluePlaceholder')}
      />
      <div className="mt-3 flex gap-2">
        <button type="button" className="key key-sm" onClick={redraw}>
          ↻ {t('game.newCard')}
        </button>
        <button type="submit" className="key key-signal flex-1" disabled={!clue.trim()}>
          {t('game.sendClue')}
        </button>
      </div>
    </form>
  );
}

function Scoreboard({ room }: { room: RoomView }) {
  const { t } = useTranslation();
  const teamName = useTeamName();
  if (room.settings.mode === 'coop') {
    return (
      <div className="flex items-baseline gap-1.5">
        <span className="label">{t('game.coopScore')}</span>
        <Num value={room.coopScore} />
      </div>
    );
  }
  return (
    <div className="flex items-stretch overflow-hidden rounded-md border-2 border-ink" dir="ltr">
      {(['A', 'B'] as TeamId[]).map((team) => (
        <div
          key={team}
          className={`flex items-center gap-1.5 px-2.5 py-0.5 ${room.activeTeam === team ? 'text-glow' : ''}`}
          style={{ background: room.activeTeam === team ? TEAM_COLOR[team] : undefined }}
        >
          <span className="text-xs font-bold" lang={undefined}>
            {teamName(team)}
          </span>
          <Num value={room.scores[team]} />
        </div>
      ))}
    </div>
  );
}

/** Odometer-style number that rolls when it changes. */
function Num({ value }: { value: number }) {
  return (
    <span className="relative inline-block h-7 min-w-[1.6ch] overflow-hidden text-center font-mono text-xl font-medium leading-7">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          className="block"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '-100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Roster({ room }: { room: RoomView }) {
  const { t } = useTranslation();
  const me = useGame((s) => s.playerId);
  const needleBy = useGame((s) => s.needleBy);
  const players = [...room.players].sort((a, b) => (a.team ?? 'Z').localeCompare(b.team ?? 'Z'));
  return (
    <footer className="mt-auto pt-8">
      <div className="perf" />
      <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {players.map((p) => {
          const active =
            room.settings.mode === 'coop' ? p.team !== null : p.team === room.activeTeam;
          const tuning = room.phase === 'guess' && needleBy === p.id;
          return (
            <li
              key={p.id}
              className={`flex items-center gap-1.5 text-sm ${!p.connected ? 'opacity-40' : ''} ${
                !active && room.phase !== 'reveal' ? 'opacity-60' : ''
              }`}
            >
              <span className="relative">
                <Avatar id={p.avatar} size={30} ring={p.team ? TEAM_COLOR[p.team] : undefined} />
                {tuning && (
                  <motion.span
                    layoutId="tuning"
                    className="absolute -end-1 -top-1 size-3 rounded-full border-2 border-ink bg-signal"
                  />
                )}
              </span>
              <span className={`font-semibold ${p.id === me ? 'underline decoration-2 underline-offset-2' : ''}`}>
                {p.name}
              </span>
              {p.id === room.psychicId && <span className="label !text-[0.6rem]">· {t('game.psychic')}</span>}
            </li>
          );
        })}
      </ul>
    </footer>
  );
}
