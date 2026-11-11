// Shared contracts between the Socket.io server and the React client.
// Everything the server sends is a *projection*: the hidden target is only
// ever included for the Psychic (or for everyone once the round is revealed).

export type Lang = 'en' | 'ar';
export type TeamId = 'A' | 'B';
export type Mode = 'teams' | 'coop';
export type Side = 'left' | 'right';
export type Phase = 'lobby' | 'clue' | 'guess' | 'counter' | 'reveal' | 'end';

export const CATEGORY_IDS = [
  'general',
  'pop',
  'arab',
  'food',
  'tech',
  'ethics',
  'social',
  'work',
  'money',
  'travel',
  'sports',
  'nature',
  'style',
  'nostalgia',
  'gaming',
  'science',
  'abstract',
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface Bilingual {
  en: string;
  ar: string;
}

export interface SpectrumCard {
  id: string;
  category: CategoryId;
  left: Bilingual;
  right: Bilingual;
}

export interface Player {
  id: string; // stable id from the client's localStorage (survives reconnects)
  name: string;
  avatar: number; // index into the avatar set
  team: TeamId | null; // null = spectator
  ready: boolean;
  connected: boolean;
}

export interface RoomSettings {
  rounds: number;
  categories: CategoryId[];
  mode: Mode;
  lang: Lang; // language used for spectrum cards
}

export interface RoundResult {
  round: number;
  cardId: string;
  psychicId: string;
  team: TeamId | null; // null in co-op
  clue: string;
  target: number;
  needle: number;
  points: number;
  counter: Side | null;
  counterPoint: number;
}

export interface RoomView {
  code: string;
  hostId: string;
  players: Player[];
  settings: RoomSettings;
  phase: Phase;
  round: number; // 1-based, 0 in lobby
  psychicId: string | null;
  activeTeam: TeamId | null; // team whose turn it is (teams mode)
  card: SpectrumCard | null;
  clue: string | null;
  needle: number; // 0..1, 0 = left end of the dial
  lockVotes: string[]; // guessers who voted to lock the needle where it is
  target: number | null; // only present for the Psychic or after reveal
  counter: Side | null;
  scores: Record<TeamId, number>;
  coopScore: number;
  lastResult: RoundResult | null;
  history: RoundResult[];
}

export interface Ack<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

export interface JoinPayload {
  playerId: string;
  name: string;
  avatar: number;
}

// ---- Client -> Server ----
export interface ClientToServerEvents {
  'room:create': (p: JoinPayload & { lang: Lang }, ack: (r: Ack<{ code: string }>) => void) => void;
  'room:join': (p: JoinPayload & { code: string }, ack: (r: Ack<{ code: string }>) => void) => void;
  'room:leave': () => void;
  'room:settings': (s: Partial<RoomSettings>) => void;
  'player:team': (team: TeamId | null) => void;
  'player:ready': (ready: boolean) => void;
  'player:profile': (p: { name?: string; avatar?: number }) => void;
  'game:start': (ack: (r: Ack) => void) => void;
  'game:redraw': () => void;
  'game:clue': (clue: string) => void;
  'game:needle': (value: number) => void;
  /** Vote (true) or withdraw a vote (false) to lock the needle. Moving the needle clears all votes. */
  'game:vote': (on: boolean) => void;
  'game:counter': (side: Side) => void;
  'game:next': () => void;
  'game:lobby': () => void;
}

// ---- Server -> Client ----
export interface ServerToClientEvents {
  'room:state': (view: RoomView) => void;
  // High-frequency, kept out of room:state so dragging stays cheap.
  'game:needle': (p: { value: number; by: string }) => void;
  'room:closed': (reason: string) => void;
}

export const ROOM_CODE_LENGTH = 6;
export const MAX_PLAYERS = 16;
