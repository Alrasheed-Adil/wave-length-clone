import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { CARD_BY_ID, CATEGORIES } from '@shared/cards';
import type { RoomView, RoundResult, TeamId } from '@shared/types';
import { useGame } from '../store';
import { Dial } from './Dial';
import { Avatar } from './Avatar';
import { TEAM_COLOR, useTeamName } from './ui';
import { EndPlate, Num } from '../screens/Game';

/*
  Round-by-round replay shown before the final results.

  Each round plays as a short sequence on the real dial:
    0 intro   – card, Psychic and clue drop in; needle parked at centre, shutter shut
    1 tune    – the needle swings to where the team locked it
    2 reveal  – the grille drops and the target appears
    3 score   – points stamp, counter-guess call, scoreboard rolls forward
  then the shutter closes and the next round begins.
*/

type Step = 0 | 1 | 2 | 3;
const STEP_MS: Record<Step, number> = { 0: 1400, 1: 1500, 2: 1000, 3: 2400 };

export function Replay({ room, onDone, startAt = 0 }: { room: RoomView; onDone: () => void; startAt?: number }) {
  const { t } = useTranslation();
  const teamName = useTeamName();
  const uiLang = useGame((s) => s.lang);
  const rounds = room.history;
  const coop = room.settings.mode === 'coop';
  const cardLang = room.settings.lang;

  const [i, setI] = useState(() => Math.min(startAt, Math.max(0, rounds.length - 1)));
  const [step, setStep] = useState<Step>(0);
  const [playing, setPlaying] = useState(true);

  // Running totals *after* each round, so the scoreboard can roll forward.
  const totals = useMemo(() => {
    let A = 0, B = 0, coopScore = 0;
    return rounds.map((r) => {
      if (r.team) {
        if (r.team === 'A') { A += r.points; B += r.counterPoint; }
        else { B += r.points; A += r.counterPoint; }
      } else coopScore += r.points;
      return { A, B, coop: coopScore };
    });
  }, [rounds]);

  // The timeline: advance step → step → next round → done.
  useEffect(() => {
    if (!playing || rounds.length === 0) return;
    const ms = STEP_MS[step] + (step === 3 && rounds[i]?.counter ? 700 : 0);
    const id = setTimeout(() => {
      if (step < 3) setStep((step + 1) as Step);
      else if (i < rounds.length - 1) {
        setI(i + 1);
        setStep(0);
      } else onDone();
    }, ms);
    return () => clearTimeout(id);
  }, [i, step, playing, rounds, onDone]);

  if (rounds.length === 0) return null;
  const r: RoundResult = rounds[i];
  const card = CARD_BY_ID.get(r.cardId);
  const category = card && CATEGORIES.find((c) => c.id === card.category);
  const psychic = room.players.find((p) => p.id === r.psychicId);
  const shown = step === 3 ? totals[i] : i > 0 ? totals[i - 1] : { A: 0, B: 0, coop: 0 };
  const otherTeam: TeamId | null = r.team ? (r.team === 'A' ? 'B' : 'A') : null;

  const jump = (n: number) => {
    setI(Math.max(0, Math.min(rounds.length - 1, n)));
    setStep(0);
  };

  return (
    <section aria-live="polite">
      {/* Title row + scoreboard */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label">{t('end.replay')}</div>
          <motion.h1
            key={i}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl"
          >
            {t('end.roundOf', { n: i + 1, total: rounds.length })}
          </motion.h1>
        </div>
        {coop ? (
          <div className="flex items-baseline gap-1.5">
            <span className="label">{t('game.coopScore')}</span>
            <Num value={shown.coop} />
          </div>
        ) : (
          <div className="flex overflow-hidden rounded-md border-2 border-ink" dir="ltr">
            {(['A', 'B'] as TeamId[]).map((team) => (
              <div
                key={team}
                className={`flex items-center gap-1.5 px-2.5 py-0.5 ${r.team === team ? 'text-glow' : ''}`}
                style={{ background: r.team === team ? TEAM_COLOR[team] : undefined }}
              >
                <span className="text-xs font-bold">{teamName(team)}</span>
                <Num value={shown[team]} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress pips — one per round, clickable */}
      <div className="mt-4 flex gap-1.5" dir="ltr">
        {rounds.map((x, n) => (
          <button
            key={n}
            onClick={() => jump(n)}
            aria-label={t('end.roundOf', { n: n + 1, total: rounds.length })}
            className="relative h-2.5 flex-1 overflow-hidden rounded-full border-2 border-ink bg-paper-3"
          >
            <motion.span
              className="absolute inset-y-0 left-0"
              style={{ background: x.team ? TEAM_COLOR[x.team] : 'var(--color-ink)' }}
              initial={false}
              animate={{ width: n < i ? '100%' : n > i ? '0%' : `${((step + 1) / 4) * 100}%` }}
              transition={{ duration: 0.35 }}
            />
          </button>
        ))}
      </div>

      {/* Who gave the clue */}
      <div className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-ink-2">
        {r.team && (
          <span className="rounded-md px-2 py-0.5 text-xs font-extrabold text-glow" style={{ background: TEAM_COLOR[r.team] }}>
            {teamName(r.team)}
          </span>
        )}
        {psychic && <Avatar id={psychic.avatar} size={22} />}
        {t('end.gave', { name: psychic?.name ?? '—' })}
      </div>

      {/* The dial, driven by the timeline */}
      <div className="mt-3">
        <Dial
          value={step >= 1 ? r.needle : 0.5}
          target={step >= 2 ? r.target : null}
          interactive={false}
          accent="var(--color-glow)"
          scored={step >= 3 ? r.points : null}
        />
        {card && (
          <div dir="ltr" className="mx-auto -mt-px flex max-w-[640px] items-stretch">
            <EndPlate text={card.left[cardLang]} lang={cardLang} side="left" />
            <div className="flex items-center bg-ink px-2">
              <span className="label !text-paper-3 whitespace-nowrap">{category?.name[uiLang]}</span>
            </div>
            <EndPlate text={card.right[cardLang]} lang={cardLang} side="right" />
          </div>
        )}
      </div>

      {/* Clue + outcome */}
      <div className="mt-5 flex min-h-36 flex-col items-center gap-3 text-center">
        <motion.div
          key={`clue-${i}`}
          initial={{ rotate: -4, y: -16, opacity: 0 }}
          animate={{ rotate: -1, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 }}
          className="max-w-md border-2 border-ink bg-glow px-5 py-2.5 shadow-[0_4px_0_var(--color-ink)]"
        >
          <div className="label">{t('game.clue')}</div>
          <div className="text-2xl font-extrabold leading-tight" dir="auto">
            “{r.clue}”
          </div>
        </motion.div>

        <AnimatePresence>
          {step === 3 && (
            <motion.div
              key={`stamp-${i}`}
              initial={{ scale: 1.7, rotate: -10, opacity: 0 }}
              animate={{ scale: 1, rotate: -3, opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 14 }}
              className="border-[3px] px-4 py-1 text-2xl font-extrabold uppercase"
              style={{
                borderColor: r.points ? 'var(--color-signal)' : 'var(--color-ink-3)',
                color: r.points ? 'var(--color-signal)' : 'var(--color-ink-3)',
              }}
            >
              {r.points === 4 ? t('game.bullseye') : t('game.points', { count: r.points })}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {step === 3 && r.counter && otherTeam && (
            <motion.p
              key={`counter-${i}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.6 }}
              className="font-semibold"
              style={{ color: TEAM_COLOR[otherTeam] }}
            >
              {t('end.called', {
                team: teamName(otherTeam),
                side: r.counter === 'left' ? t('game.left') : t('game.right'),
              })}{' '}
              {r.counterPoint ? '✓ +1' : '✗'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Transport controls (kept LTR: ◀ is always "back") */}
      <div className="mt-4 flex items-center justify-center gap-2" dir="ltr">
        <button className="key key-sm" onClick={() => jump(i - 1)} disabled={i === 0} aria-label={t('end.prev')}>
          ◀◀
        </button>
        <button
          className="key key-sm key-ink min-w-24"
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? t('end.pause') : t('end.play')}
        >
          {playing ? '❚❚' : '▶'} <span className="hidden sm:inline">{playing ? t('end.pause') : t('end.play')}</span>
        </button>
        <button
          className="key key-sm"
          onClick={() => (i < rounds.length - 1 ? jump(i + 1) : onDone())}
          aria-label={t('end.next')}
        >
          ▶▶
        </button>
      </div>
      <div className="mt-4 text-center">
        <button className="text-sm font-semibold text-ink-3 underline underline-offset-4" onClick={onDone}>
          {t('end.skipReplay')}
        </button>
      </div>
    </section>
  );
}
