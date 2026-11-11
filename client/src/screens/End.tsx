import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { CARD_BY_ID } from '@shared/cards';
import type { RoomView, TeamId } from '@shared/types';
import { useCallback, useState } from 'react';
import { useGame } from '../store';
import { Avatar } from '../components/Avatar';
import { Replay } from '../components/Replay';
import { LangToggle, TEAM_COLOR, useTeamName, Wordmark } from '../components/ui';

export function End({ room }: { room: RoomView }) {
  const { t } = useTranslation();
  const teamName = useTeamName();
  const { playerId, toLobby, leaveRoom } = useGame();
  const isHost = room.hostId === playerId;
  const coop = room.settings.mode === 'coop';
  const { A, B } = room.scores;
  const winner: TeamId | null = A === B ? null : A > B ? 'A' : 'B';
  const cardLang = room.settings.lang;
  // The replay runs first; `null` means we're on the results.
  const [replayFrom, setReplayFrom] = useState<number | null>(room.history.length ? 0 : null);
  const done = useCallback(() => {
    setReplayFrom(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (replayFrom !== null) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-5 sm:px-8">
        <header className="flex items-center justify-between">
          <Wordmark />
          <LangToggle />
        </header>
        <div className="mt-6">
          <Replay key={replayFrom} room={room} startAt={replayFrom} onDone={done} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-5 sm:px-8">
      <header className="flex items-center justify-between">
        <Wordmark />
        <LangToggle />
      </header>

      <section className="mt-10 text-center">
        <div className="label">{t('end.title')}</div>
        <motion.h1
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 15 }}
          className="mt-2 text-5xl font-extrabold tracking-tight sm:text-6xl"
          style={{ color: !coop && winner ? TEAM_COLOR[winner] : undefined }}
        >
          {coop
            ? t('end.coopResult', { score: room.coopScore, max: room.history.length * 4 })
            : winner
              ? t('end.wins', { team: teamName(winner) })
              : t('end.tie')}
        </motion.h1>

        {!coop && (
          <div dir="ltr" className="mx-auto mt-6 flex max-w-sm overflow-hidden rounded-lg border-2 border-ink shadow-[0_4px_0_var(--color-ink)]">
            {(['A', 'B'] as TeamId[]).map((team) => (
              <div key={team} className="flex-1 py-3 text-glow" style={{ background: TEAM_COLOR[team] }}>
                <div className="font-bold">{teamName(team)}</div>
                <div className="font-mono text-4xl font-medium">{room.scores[team]}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-center gap-3">
          {isHost && (
            <button className="key key-signal px-6 py-3" onClick={toLobby}>
              {t('end.again')}
            </button>
          )}
          <button className="key px-6 py-3" onClick={leaveRoom}>
            {t('lobby.leave')}
          </button>
        </div>
        {room.history.length > 0 && (
          <button
            className="mt-5 text-sm font-semibold underline underline-offset-4"
            onClick={() => setReplayFrom(0)}
          >
            ▶ {t('end.watchAgain')}
          </button>
        )}
      </section>

      <section className="mt-12">
        <h2 className="label">{t('end.history')}</h2>
        <ol className="mt-3 divide-y-2 divide-ink/10 border-y-2 border-ink">
          {room.history.map((h, n) => {
            const card = CARD_BY_ID.get(h.cardId);
            const psychic = room.players.find((p) => p.id === h.psychicId);
            return (
              <li
                key={h.round}
                className="flex cursor-pointer items-center gap-3 py-2.5 transition-colors hover:bg-paper-2"
                onClick={() => setReplayFrom(n)}
                title={t('end.watchAgain')}
              >
                <span className="w-7 font-mono text-ink-3">{String(h.round).padStart(2, '0')}</span>
                {psychic && <Avatar id={psychic.avatar} size={28} ring={h.team ? TEAM_COLOR[h.team] : undefined} />}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold" dir="auto">
                    “{h.clue}”
                  </div>
                  {card && (
                    <div className="truncate text-sm text-ink-3" lang={cardLang}>
                      {card.left[cardLang]} ↔ {card.right[cardLang]}
                    </div>
                  )}
                </div>
                <MiniGauge target={h.target} needle={h.needle} />
                <span className="w-8 text-end font-mono text-xl font-medium">
                  {h.points}
                  {h.counterPoint ? <sup className="text-xs text-tide">+1</sup> : null}
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

/** Tiny linear readout of where the needle landed vs the target. */
function MiniGauge({ target, needle }: { target: number; needle: number }) {
  return (
    <svg width="72" height="14" viewBox="0 0 72 14" aria-hidden="true" className="flex-none">
      <rect x="0.5" y="4.5" width="71" height="5" rx="2.5" fill="var(--color-paper-3)" stroke="var(--color-ink)" />
      <rect x={target * 71 - 4} y="4.5" width="8" height="5" fill="var(--color-signal)" />
      <path d={`M${needle * 71 + 0.5} 1v12`} stroke="var(--color-ink)" strokeWidth="2" />
    </svg>
  );
}
