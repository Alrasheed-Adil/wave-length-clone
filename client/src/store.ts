import { create } from 'zustand';
import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  Lang,
  RoomSettings,
  RoomView,
  ServerToClientEvents,
  Side,
  TeamId,
} from '@shared/types';
import { applyLang, initialLang } from './i18n';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// ---------- persisted profile ----------
const K = { id: 'tuned-in:id', name: 'tuned-in:name', avatar: 'tuned-in:avatar', room: 'tuned-in:room' };
const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* storage blocked: the session still works, it just won't persist */
  }
};
function stableId(): string {
  let id = read(K.id);
  if (!id) {
    id = crypto.randomUUID?.() ?? `p-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    write(K.id, id);
  }
  return id;
}

export type Conn = 'connecting' | 'online' | 'offline';

interface State {
  playerId: string;
  name: string;
  avatar: number;
  lang: Lang;
  conn: Conn;
  room: RoomView | null;
  /** Needle as rendered locally (server value, or our own drag while dragging). */
  needle: number;
  needleBy: string | null;
  dragging: boolean;
  error: string | null;
  busy: boolean;

  setName(n: string): void;
  setAvatar(a: number): void;
  setLang(l: Lang): void;
  clearError(): void;
  createRoom(): Promise<void>;
  joinRoom(code: string): Promise<void>;
  leaveRoom(): void;
  updateSettings(s: Partial<RoomSettings>): void;
  setTeam(t: TeamId | null): void;
  setReady(r: boolean): void;
  startGame(): void;
  redraw(): void;
  sendClue(c: string): void;
  dragNeedle(v: number): void;
  setDragging(d: boolean): void;
  lockIn(): void;
  counter(side: Side): void;
  next(): void;
  toLobby(): void;
}

const socket: GameSocket = io({ autoConnect: true, transports: ['websocket', 'polling'] });

export const useGame = create<State>((set, get) => {
  const fail = (error?: string) => set({ error: error ?? 'default', busy: false });

  // Throttle needle emits to one per animation frame.
  let pendingNeedle: number | null = null;
  let raf = 0;
  const flushNeedle = () => {
    raf = 0;
    if (pendingNeedle !== null) socket.emit('game:needle', pendingNeedle);
    pendingNeedle = null;
  };

  socket.on('connect', () => {
    set({ conn: 'online' });
    // Rejoin after a refresh or a dropped connection.
    const code = get().room?.code ?? read(K.room);
    if (code) void get().joinRoom(code);
  });
  socket.on('disconnect', () => set({ conn: 'offline' }));
  socket.io.on('reconnect_attempt', () => set({ conn: 'connecting' }));

  socket.on('room:state', (room) => {
    const s = get();
    set({
      room,
      needle: s.dragging && room.phase === 'guess' ? s.needle : room.needle,
      needleBy: room.phase === 'guess' ? s.needleBy : null,
    });
  });
  socket.on('game:needle', ({ value, by }) => {
    if (get().dragging) return;
    set({ needle: value, needleBy: by });
  });
  socket.on('room:closed', (reason) => {
    write(K.room, null);
    set({ room: null, error: reason });
  });

  return {
    playerId: stableId(),
    name: read(K.name) ?? '',
    avatar: Number(read(K.avatar) ?? Math.floor(Math.random() * 12)) % 12,
    lang: initialLang(),
    conn: 'connecting',
    room: null,
    needle: 0.5,
    needleBy: null,
    dragging: false,
    error: null,
    busy: false,

    setName(name) {
      set({ name });
      write(K.name, name);
      if (get().room) socket.emit('player:profile', { name });
    },
    setAvatar(avatar) {
      set({ avatar });
      write(K.avatar, String(avatar));
      if (get().room) socket.emit('player:profile', { avatar });
    },
    setLang(lang) {
      set({ lang });
      applyLang(lang);
    },
    clearError: () => set({ error: null }),

    createRoom() {
      const { playerId, name, avatar, lang } = get();
      set({ busy: true, error: null });
      return new Promise((resolve) => {
        socket.emit('room:create', { playerId, name, avatar, lang }, (r) => {
          if (!r.ok || !r.data) fail(r.error);
          else {
            write(K.room, r.data.code);
            set({ busy: false });
            history.replaceState(null, '', `?room=${r.data.code}`);
          }
          resolve();
        });
      });
    },
    joinRoom(code) {
      const { playerId, name, avatar } = get();
      set({ busy: true, error: null });
      return new Promise((resolve) => {
        socket.emit('room:join', { playerId, name, avatar, code }, (r) => {
          if (!r.ok || !r.data) {
            write(K.room, null);
            set({ room: null });
            fail(r.error);
          } else {
            write(K.room, r.data.code);
            set({ busy: false });
            history.replaceState(null, '', `?room=${r.data.code}`);
          }
          resolve();
        });
      });
    },
    leaveRoom() {
      socket.emit('room:leave');
      write(K.room, null);
      history.replaceState(null, '', location.pathname);
      set({ room: null });
    },
    updateSettings: (s) => socket.emit('room:settings', s),
    setTeam: (t) => socket.emit('player:team', t),
    setReady: (r) => socket.emit('player:ready', r),
    startGame() {
      socket.emit('game:start', (r) => {
        if (!r.ok) fail(r.error);
      });
    },
    redraw: () => socket.emit('game:redraw'),
    sendClue: (c) => socket.emit('game:clue', c),
    dragNeedle(v) {
      set({ needle: v, needleBy: get().playerId });
      pendingNeedle = v;
      if (!raf) raf = requestAnimationFrame(flushNeedle);
    },
    setDragging(dragging) {
      set({ dragging });
      if (!dragging && pendingNeedle !== null) flushNeedle();
    },
    lockIn() {
      flushNeedle();
      socket.emit('game:lock');
    },
    counter: (side) => socket.emit('game:counter', side),
    next: () => socket.emit('game:next'),
    toLobby: () => socket.emit('game:lobby'),
  };
});

// ---------- derived helpers ----------
export function useMe() {
  const room = useGame((s) => s.room);
  const id = useGame((s) => s.playerId);
  return room?.players.find((p) => p.id === id) ?? null;
}

export function canGuess(room: RoomView, playerId: string): boolean {
  if (room.phase !== 'guess' || playerId === room.psychicId) return false;
  const p = room.players.find((x) => x.id === playerId);
  if (!p || p.team === null) return false;
  return room.settings.mode === 'coop' || p.team === room.activeTeam;
}

export function canCounter(room: RoomView, playerId: string): boolean {
  if (room.phase !== 'counter') return false;
  const p = room.players.find((x) => x.id === playerId);
  return !!p?.team && p.team !== room.activeTeam;
}
