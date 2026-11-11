import { CARDS, CARD_BY_ID } from '../../shared/src/cards';
import { randomTarget, scoreFor, targetSide, clamp01 } from '../../shared/src/scoring';
import {
  CATEGORY_IDS,
  MAX_PLAYERS,
  ROOM_CODE_LENGTH,
  type CategoryId,
  type JoinPayload,
  type Lang,
  type Player,
  type Phase,
  type RoomSettings,
  type RoomView,
  type RoundResult,
  type Side,
  type SpectrumCard,
  type TeamId,
} from '../../shared/src/types';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const ALL_CATEGORIES: CategoryId[] = [...CATEGORY_IDS];

export class GameError extends Error {}

export interface Room {
  code: string;
  /** Who currently holds host controls (may be a stand-in while the owner is offline). */
  hostId: string;
  /** Who host belongs to. Survives refreshes; changes only when the owner leaves on purpose. */
  ownerId: string;
  players: Map<string, Player>;
  settings: RoomSettings;
  phase: Phase;
  round: number;
  psychicId: string | null;
  activeTeam: TeamId | null;
  card: SpectrumCard | null;
  target: number;
  clue: string | null;
  needle: number;
  counter: Side | null;
  scores: Record<TeamId, number>;
  coopScore: number;
  lastResult: RoundResult | null;
  history: RoundResult[];
  deck: string[];
  /** Cards this room has already seen, across games, so replays don't repeat until the pool runs dry. */
  seen: Set<string>;
  /** Guessers who have voted to lock the current needle position. */
  votes: Set<string>;
  psychicCursor: Record<TeamId | 'coop', number>;
  emptySince: number | null;
}

export const rooms = new Map<string, Room>();

function newCode(): string {
  for (;;) {
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    if (!rooms.has(code)) return code;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const cleanName = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, 18) || 'Player';
const cleanAvatar = (n: unknown) => (Number.isInteger(n) && (n as number) >= 0 && (n as number) < 12 ? (n as number) : 0);

// ---------------------------------------------------------------- lobby

export function createRoom(p: JoinPayload & { lang: Lang }): Room {
  const code = newCode();
  const room: Room = {
    code,
    hostId: p.playerId,
    ownerId: p.playerId,
    players: new Map(),
    settings: { rounds: 8, categories: [...ALL_CATEGORIES], mode: 'teams', lang: p.lang === 'ar' ? 'ar' : 'en' },
    phase: 'lobby',
    round: 0,
    psychicId: null,
    activeTeam: null,
    card: null,
    target: 0.5,
    clue: null,
    needle: 0.5,
    counter: null,
    scores: { A: 0, B: 0 },
    coopScore: 0,
    lastResult: null,
    history: [],
    deck: [],
    seen: new Set(),
    votes: new Set(),
    psychicCursor: { A: 0, B: 0, coop: 0 },
    emptySince: null,
  };
  rooms.set(code, room);
  joinRoom(room, p);
  return room;
}

export function joinRoom(room: Room, p: JoinPayload): Player {
  const existing = room.players.get(p.playerId);
  if (existing) {
    existing.connected = true;
    existing.name = cleanName(p.name);
    existing.avatar = cleanAvatar(p.avatar);
    room.emptySince = null;
    // The owner coming back (e.g. after a refresh) takes host back from the stand-in.
    if (existing.id === room.ownerId) room.hostId = existing.id;
    return existing;
  }
  if (room.players.size >= MAX_PLAYERS) throw new GameError('room_full');
  // New players auto-balance into the smaller team; mid-game joiners spectate.
  let team: TeamId | null = null;
  if (room.phase === 'lobby') {
    const a = members(room, 'A').length;
    const b = members(room, 'B').length;
    team = room.settings.mode === 'coop' || a <= b ? 'A' : 'B';
  }
  const player: Player = {
    id: p.playerId,
    name: cleanName(p.name),
    avatar: cleanAvatar(p.avatar),
    team,
    ready: false,
    connected: true,
  };
  room.players.set(p.playerId, player);
  room.emptySince = null;
  return player;
}

/** Marks a player gone. Returns true if the room should be deleted now. */
export function leaveRoom(room: Room, playerId: string, hard: boolean): boolean {
  const pl = room.players.get(playerId);
  if (!pl) return false;
  if (hard && room.phase === 'lobby') room.players.delete(playerId);
  else pl.connected = false;

  // A guesser dropping out mid-vote: the rest may now all have voted.
  room.votes.delete(playerId);
  checkVotes(room);

  const connected = [...room.players.values()].filter((x) => x.connected);
  if (connected.length === 0) {
    if (room.players.size === 0) return true;
    room.emptySince = Date.now();
    return false;
  }
  if (room.hostId === playerId) {
    // A dropped connection hands host to a stand-in until the owner returns;
    // pressing Leave hands it over for good.
    room.hostId = connected[0].id;
    if (hard) room.ownerId = room.hostId;
  }
  return false;
}

export function updateSettings(room: Room, by: string, s: Partial<RoomSettings>) {
  assertHost(room, by);
  if (room.phase !== 'lobby') throw new GameError('not_in_lobby');
  if (s.rounds !== undefined) room.settings.rounds = Math.min(20, Math.max(2, Math.round(Number(s.rounds) || 8)));
  if (s.mode === 'teams' || s.mode === 'coop') {
    room.settings.mode = s.mode;
    if (s.mode === 'coop') for (const p of room.players.values()) if (p.team === 'B') p.team = 'A';
    if (s.mode === 'teams') rebalance(room);
  }
  if (s.lang === 'en' || s.lang === 'ar') room.settings.lang = s.lang;
  if (Array.isArray(s.categories)) {
    const cats = s.categories.filter((c): c is CategoryId => ALL_CATEGORIES.includes(c));
    if (cats.length) room.settings.categories = [...new Set(cats)];
  }
}

function rebalance(room: Room) {
  const playing = [...room.players.values()].filter((p) => p.team !== null);
  playing.forEach((p, i) => (p.team = i % 2 === 0 ? 'A' : 'B'));
}

export function setTeam(room: Room, by: string, team: TeamId | null) {
  if (room.phase !== 'lobby') throw new GameError('not_in_lobby');
  const p = mustPlayer(room, by);
  if (team !== null && team !== 'A' && team !== 'B') return;
  p.team = room.settings.mode === 'coop' && team === 'B' ? 'A' : team;
  p.ready = false;
}

export function setReady(room: Room, by: string, ready: boolean) {
  mustPlayer(room, by).ready = !!ready;
}

export function setProfile(room: Room, by: string, prof: { name?: string; avatar?: number }) {
  const p = mustPlayer(room, by);
  if (prof.name !== undefined) p.name = cleanName(prof.name);
  if (prof.avatar !== undefined) p.avatar = cleanAvatar(prof.avatar);
}

// ---------------------------------------------------------------- game loop

export function startGame(room: Room, by: string) {
  assertHost(room, by);
  if (room.phase !== 'lobby' && room.phase !== 'end') throw new GameError('already_started');
  if (room.settings.mode === 'teams') {
    if (members(room, 'A').length < 2 || members(room, 'B').length < 2) throw new GameError('need_two_per_team');
  } else if (members(room, 'A').length < 2) {
    throw new GameError('need_two_players');
  }
  room.scores = { A: 0, B: 0 };
  room.coopScore = 0;
  room.history = [];
  room.lastResult = null;
  room.round = 0;
  room.psychicCursor = { A: 0, B: 0, coop: 0 };
  room.deck = buildDeck(room);
  for (const p of room.players.values()) p.ready = false;
  nextRound(room);
}

/** Shuffled deck of cards from the chosen decks that this room hasn't seen yet. */
function buildDeck(room: Room): string[] {
  const pool = CARDS.filter((c) => room.settings.categories.includes(c.category)).map((c) => c.id);
  let fresh = pool.filter((id) => !room.seen.has(id));
  if (fresh.length === 0) {
    // Every card in these decks has been played: start the cycle over.
    for (const id of pool) room.seen.delete(id);
    fresh = pool;
  }
  return shuffle(fresh);
}

function drawCard(room: Room): SpectrumCard {
  if (room.deck.length === 0) room.deck = buildDeck(room);
  const id = room.deck.pop()!;
  room.seen.add(id);
  return CARD_BY_ID.get(id)!;
}

function nextRound(room: Room) {
  room.round += 1;
  if (room.settings.mode === 'teams') {
    room.activeTeam = room.round % 2 === 1 ? 'A' : 'B';
    const team = members(room, room.activeTeam).filter((p) => p.connected);
    const pool = team.length ? team : members(room, room.activeTeam);
    room.psychicId = pool[room.psychicCursor[room.activeTeam]++ % pool.length].id;
  } else {
    room.activeTeam = null;
    const all = members(room, 'A').filter((p) => p.connected);
    const pool = all.length ? all : members(room, 'A');
    room.psychicId = pool[room.psychicCursor.coop++ % pool.length].id;
  }
  room.card = drawCard(room);
  room.target = randomTarget();
  room.clue = null;
  room.needle = 0.5;
  room.counter = null;
  room.votes.clear();
  room.phase = 'clue';
}

export function redraw(room: Room, by: string) {
  if (room.phase !== 'clue' || by !== room.psychicId) throw new GameError('not_allowed');
  room.card = drawCard(room);
  room.target = randomTarget();
}

export function giveClue(room: Room, by: string, clue: string) {
  if (room.phase !== 'clue' || by !== room.psychicId) throw new GameError('not_allowed');
  const c = String(clue ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!c) throw new GameError('empty_clue');
  room.clue = c;
  room.phase = 'guess';
}

export function canGuess(room: Room, playerId: string): boolean {
  if (room.phase !== 'guess' || playerId === room.psychicId) return false;
  const p = room.players.get(playerId);
  if (!p || p.team === null) return false;
  return room.settings.mode === 'coop' || p.team === room.activeTeam;
}

/** Connected players who are guessing this round; all of them must vote to lock. */
export function voters(room: Room): Player[] {
  return [...room.players.values()].filter((p) => p.connected && canGuess(room, p.id));
}

/**
 * Moves the needle. Returns 'reset' when the move cancelled existing lock votes
 * (callers should then broadcast full state), 'moved' otherwise, 'ignored' if not allowed.
 */
export function moveNeedle(room: Room, by: string, value: number): 'ignored' | 'moved' | 'reset' {
  if (!canGuess(room, by)) return 'ignored';
  const v = clamp01(Number(value));
  const changed = Math.abs(v - room.needle) > 0.0005;
  room.needle = v;
  if (changed && room.votes.size > 0) {
    room.votes.clear();
    return 'reset';
  }
  return 'moved';
}

/** A guesser votes (or un-votes) to lock the needle where it is. Locks once everyone has voted. */
export function voteLock(room: Room, by: string, on: boolean) {
  if (!canGuess(room, by)) throw new GameError('not_allowed');
  if (on) room.votes.add(by);
  else room.votes.delete(by);
  checkVotes(room);
}

function checkVotes(room: Room) {
  if (room.phase !== 'guess') return;
  const v = voters(room);
  if (v.length > 0 && v.every((p) => room.votes.has(p.id))) lockGuess(room);
}

function lockGuess(room: Room) {
  room.votes.clear();
  const otherTeam = room.activeTeam === 'A' ? 'B' : 'A';
  const hasCounter =
    room.settings.mode === 'teams' && members(room, otherTeam).some((p) => p.connected);
  if (hasCounter) room.phase = 'counter';
  else reveal(room);
}

export function counterGuess(room: Room, by: string, side: Side) {
  if (room.phase !== 'counter') throw new GameError('not_allowed');
  const p = mustPlayer(room, by);
  if (!p.team || p.team === room.activeTeam) throw new GameError('not_allowed');
  if (side !== 'left' && side !== 'right') return;
  room.counter = side;
  reveal(room);
}

function reveal(room: Room) {
  const points = scoreFor(room.needle, room.target);
  let counterPoint = 0;
  if (room.settings.mode === 'teams' && room.activeTeam) {
    room.scores[room.activeTeam] += points;
    if (room.counter && points < 4 && room.counter === targetSide(room.needle, room.target)) {
      counterPoint = 1;
      room.scores[room.activeTeam === 'A' ? 'B' : 'A'] += 1;
    }
  } else {
    room.coopScore += points;
  }
  room.lastResult = {
    round: room.round,
    cardId: room.card!.id,
    psychicId: room.psychicId!,
    team: room.activeTeam,
    clue: room.clue ?? '',
    target: room.target,
    needle: room.needle,
    points,
    counter: room.counter,
    counterPoint,
  };
  room.history.push(room.lastResult);
  room.phase = 'reveal';
}

export function advance(room: Room, by: string) {
  const isHost = by === room.hostId;
  if (room.phase === 'reveal') {
    if (!isHost && by !== room.psychicId) throw new GameError('not_allowed');
    if (room.round >= room.settings.rounds) room.phase = 'end';
    else nextRound(room);
    return;
  }
  // Host escape hatch: skip a stuck round (e.g. Psychic dropped) without scoring.
  if ((room.phase === 'clue' || room.phase === 'guess') && isHost) {
    room.round -= 1; // nextRound re-increments, so the same team keeps its turn
    nextRound(room);
    return;
  }
  throw new GameError('not_allowed');
}

export function backToLobby(room: Room, by: string) {
  assertHost(room, by);
  room.phase = 'lobby';
  room.round = 0;
  room.psychicId = null;
  room.activeTeam = null;
  room.card = null;
  room.clue = null;
  room.counter = null;
  room.lastResult = null;
  room.history = [];
  room.scores = { A: 0, B: 0 };
  room.coopScore = 0;
  for (const p of [...room.players.values()]) {
    p.ready = false;
    if (!p.connected) room.players.delete(p.id);
  }
}

// ---------------------------------------------------------------- views

export function viewFor(room: Room, viewerId: string): RoomView {
  const showTarget = room.phase === 'reveal' || (room.phase !== 'lobby' && room.phase !== 'end' && viewerId === room.psychicId);
  return {
    code: room.code,
    hostId: room.hostId,
    players: [...room.players.values()].map((p) => ({ ...p })),
    settings: { ...room.settings, categories: [...room.settings.categories] },
    phase: room.phase,
    round: room.round,
    psychicId: room.psychicId,
    activeTeam: room.activeTeam,
    card: room.card,
    clue: room.clue,
    needle: room.needle,
    lockVotes: [...room.votes],
    target: showTarget ? room.target : null,
    counter: room.counter,
    scores: { ...room.scores },
    coopScore: room.coopScore,
    lastResult: room.lastResult,
    history: room.history,
  };
}

// ---------------------------------------------------------------- helpers

export function members(room: Room, team: TeamId): Player[] {
  return [...room.players.values()].filter((p) => p.team === team);
}

function mustPlayer(room: Room, id: string): Player {
  const p = room.players.get(id);
  if (!p) throw new GameError('not_in_room');
  return p;
}

function assertHost(room: Room, id: string) {
  if (room.hostId !== id) throw new GameError('host_only');
}

/** Drop rooms nobody has been connected to for a while. */
export function sweepRooms(maxIdleMs = 10 * 60_000) {
  const now = Date.now();
  for (const [code, room] of rooms) if (room.emptySince && now - room.emptySince > maxIdleMs) rooms.delete(code);
}
