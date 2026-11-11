import type { RoomView, RoundResult, TeamId } from '@shared/types';

/*
  End-of-game analysis. Everything is relative to what was *possible*
  (4 points per round), so the verdict scales with any number of rounds or
  players: 3 points out of 4 rounds reads the same as 15 out of 20.
*/

export type Tier = 0 | 1 | 2 | 3 | 4;

export interface Perf {
  points: number;
  max: number;
  ratio: number;
  tier: Tier;
}

export function tierFor(ratio: number): Tier {
  if (ratio >= 0.8) return 4;
  if (ratio >= 0.6) return 3;
  if (ratio >= 0.4) return 2;
  if (ratio >= 0.2) return 1;
  return 0;
}

function perf(rounds: RoundResult[]): Perf {
  const points = rounds.reduce((n, r) => n + r.points, 0);
  const max = rounds.length * 4;
  const ratio = max ? points / max : 0;
  return { points, max, ratio, tier: tierFor(ratio) };
}

export interface Analysis {
  /** The headline verdict: the whole group in co-op, the winner (or both, on a tie) in teams. */
  overall: Perf;
  teams: Record<TeamId, Perf> | null;
  winner: TeamId | null;
  bullseyes: number;
  bestClue: RoundResult | null;
  wildestMiss: RoundResult | null;
  sharpest: { playerId: string; avg: number; rounds: number } | null;
  counterHits: Record<TeamId, number>;
  players: number;
}

const distance = (r: RoundResult) => Math.abs(r.needle - r.target);

export function analyze(room: RoomView): Analysis {
  const h = room.history;
  const coop = room.settings.mode === 'coop';
  const teams = coop
    ? null
    : {
        A: perf(h.filter((r) => r.team === 'A')),
        B: perf(h.filter((r) => r.team === 'B')),
      };
  const { A, B } = room.scores;
  const winner: TeamId | null = coop || A === B ? null : A > B ? 'A' : 'B';
  const overall = coop || !teams ? perf(h) : winner ? teams[winner] : perf(h);

  // Best clue: most points, then the closest needle.
  const bestClue =
    [...h].filter((r) => r.points > 0).sort((a, b) => b.points - a.points || distance(a) - distance(b))[0] ?? null;
  // Wildest miss: the furthest needle on a zero-point round.
  const wildestMiss = [...h].filter((r) => r.points === 0).sort((a, b) => distance(b) - distance(a))[0] ?? null;

  // Sharpest Psychic: best average, only meaningful with 2+ different Psychics.
  const byPsychic = new Map<string, number[]>();
  for (const r of h) byPsychic.set(r.psychicId, [...(byPsychic.get(r.psychicId) ?? []), r.points]);
  let sharpest: Analysis['sharpest'] = null;
  if (byPsychic.size >= 2) {
    for (const [playerId, pts] of byPsychic) {
      const avg = pts.reduce((a, b) => a + b, 0) / pts.length;
      if (!sharpest || avg > sharpest.avg || (avg === sharpest.avg && pts.length > sharpest.rounds))
        sharpest = { playerId, avg, rounds: pts.length };
    }
    if (sharpest && sharpest.avg === 0) sharpest = null;
  }

  const counterHits = { A: 0, B: 0 };
  for (const r of h) if (r.counterPoint && r.team) counterHits[r.team === 'A' ? 'B' : 'A'] += r.counterPoint;

  return {
    overall,
    teams,
    winner,
    bullseyes: h.filter((r) => r.points === 4).length,
    bestClue,
    wildestMiss,
    sharpest,
    counterHits,
    players: room.players.filter((p) => p.team !== null).length,
  };
}
