import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { CARD_BY_ID } from '@shared/cards';
import type { RoomView, RoundResult, TeamId } from '@shared/types';
import { useCallback, useMemo, useState } from 'react';
import { useGame } from '../store';
import { Avatar } from '../components/Avatar';
import { Replay } from '../components/Replay';
import { Confetti, SignalMeter, TIER_COLOR } from '../components/Celebration';
import { analyze, type Analysis } from '../results';
import { LangToggle, TEAM_COLOR, useTeamName, Wordmark } from '../components/ui';

export function End({ room }: { room: RoomView }) {
  const { t } = useTranslation();
  const teamName = useTeamName();
  const { playerId, toLobby, leaveRoom } = useGame();
  const isHost = room.hostId === playerId;
  const coop = room.settings.mode === 'coop';
  const a = useMemo(() => analyze(room), [room]);
  const winner = a.winner;
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

      <Confetti amount={a.overall.tier >= 3 ? 90 : a.overall.tier === 2 ? 36 : 0} />

      <section className="mt-8 text-center">
        <div className="label">{t('end.title')}</div>

        {/* The verdict: signal strength + a line that matches how well you read each other */}
        <div className="mt-4 flex flex-col items-center">
          <SignalMeter tier={a.overall.tier} size={1.2} />
          <motion.h1
            initial={{ scale: 0.6, opacity: 0, rotate: -4 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ delay: 0.9, type: 'spring', stiffness: 240, damping: 13 }}
            className="mt-4 text-5xl font-extrabold tracking-tight sm:text-6xl"
            style={{ color: TIER_COLOR[a.overall.tier] }}
          >
            {t(`end.tiers.${a.overall.tier}.title`)}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="mt-2 max-w-md text-lg font-semibold text-ink-2"
          >
            {t(`end.tiers.${a.overall.tier}.line`)}
          </motion.p>
          {coop && a.players > 1 && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="mt-1 text-ink-3">
              {a.overall.tier >= 2
                ? t('end.coopTogether', { count: a.players })
                : t('end.coopApart', { count: a.players })}
            </motion.p>
          )}
        </div>

        {/* Score */}
        {coop ? (
          <div className="mt-6 font-mono text-ink-2" dir="ltr">
            <span className="text-5xl font-medium text-ink">{room.coopScore}</span>
            <span className="text-2xl"> / {a.overall.max}</span>
          </div>
        ) : (
          <>
            <p className="mt-6 text-2xl font-extrabold" style={{ color: winner ? TEAM_COLOR[winner] : undefined }}>
              {winner ? t('end.wins', { team: teamName(winner) }) : t('end.tie')}
            </p>
            <div dir="ltr" className="mx-auto mt-3 flex max-w-sm overflow-hidden rounded-lg border-2 border-ink shadow-[0_4px_0_var(--color-ink)]">
              {(['A', 'B'] as TeamId[]).map((team) => (
                <div key={team} className="flex-1 py-3 text-glow" style={{ background: TEAM_COLOR[team] }}>
                  <div className="font-bold">
                    {winner === team && '★ '}
                    {teamName(team)}
                  </div>
                  <div className="font-mono text-4xl font-medium">{room.scores[team]}</div>
                  {a.teams && (
                    <div className="mt-1 text-xs font-semibold opacity-90" lang={undefined}>
                      {t(`end.tiers.${a.teams[team].tier}.title`)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Stat strip */}
        <p className="mt-4 text-sm text-ink-3">
          {t('end.stats', { rounds: room.history.length, players: a.players })} ·{' '}
          {t('end.bullseyes', { count: a.bullseyes })}
        </p>

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

      <Awards room={room} a={a} />

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

/** Little "awards ceremony": the night's best clue, wildest miss, sharpest Psychic, counter-call champs. */
function Awards({ room, a }: { room: RoomView; a: Analysis }) {
  const { t } = useTranslation();
  const teamName = useTeamName();
  const name = (id: string) => room.players.find((p) => p.id === id);

  const cards: { key: string; title: string; body: React.ReactNode; accent: string }[] = [];
  const clueLine = (r: RoundResult) => {
    const p = name(r.psychicId);
    return (
      <>
        <span className="block text-xl font-extrabold leading-tight" dir="auto">
          “{r.clue}”
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-sm text-ink-2">
          {p && <Avatar id={p.avatar} size={20} />}
          {p?.name ?? '—'}
        </span>
      </>
    );
  };

  if (a.bestClue)
    cards.push({
      key: 'best',
      title: t('end.awards.best'),
      accent: 'var(--color-signal)',
      body: (
        <>
          {clueLine(a.bestClue)}
          <span className="mt-1 block font-mono text-sm">{t('game.points', { count: a.bestClue.points })}</span>
        </>
      ),
    });
  if (a.sharpest) {
    const p = name(a.sharpest.playerId);
    cards.push({
      key: 'sharp',
      title: t('end.awards.sharpest'),
      accent: 'var(--color-amber)',
      body: (
        <span className="flex items-center gap-2">
          {p && <Avatar id={p.avatar} size={36} />}
          <span>
            <span className="block text-xl font-extrabold">{p?.name ?? '—'}</span>
            <span className="font-mono text-sm text-ink-2">
              {t('end.awards.avg', { avg: a.sharpest.avg.toFixed(1) })}
            </span>
          </span>
        </span>
      ),
    });
  }
  if (a.wildestMiss)
    cards.push({
      key: 'miss',
      title: t('end.awards.miss'),
      accent: 'var(--color-tide)',
      body: (
        <>
          {clueLine(a.wildestMiss)}
          <span className="mt-1 block font-mono text-sm">
            {t('end.awards.missBy', {
              n: Math.round(Math.abs(a.wildestMiss.needle - a.wildestMiss.target) * 100),
            })}
          </span>
        </>
      ),
    });
  if (room.settings.mode === 'teams' && (a.counterHits.A || a.counterHits.B)) {
    const best: TeamId = a.counterHits.A >= a.counterHits.B ? 'A' : 'B';
    cards.push({
      key: 'counter',
      title: t('end.awards.counter'),
      accent: TEAM_COLOR[best],
      body: (
        <>
          <span className="block text-xl font-extrabold" style={{ color: TEAM_COLOR[best] }}>
            {teamName(best)}
          </span>
          <span className="font-mono text-sm text-ink-2">
            {t('end.awards.calls', { count: a.counterHits[best] })}
          </span>
        </>
      ),
    });
  }
  if (!cards.length) return null;

  return (
    <section className="mt-12">
      <h2 className="label">{t('end.awards.title')}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {cards.map((c, i) => (
          <motion.div
            key={c.key}
            initial={{ opacity: 0, y: 14, rotate: i % 2 ? 1.5 : -1.5 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ delay: 1.4 + i * 0.15, type: 'spring', stiffness: 260, damping: 20 }}
            className="sheet relative overflow-hidden p-4 ps-5"
          >
            <span className="absolute inset-y-0 start-0 w-1.5" style={{ background: c.accent }} />
            <div className="label">{c.title}</div>
            <div className="mt-2">{c.body}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
