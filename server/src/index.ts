import express from 'express';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Server, type Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, Ack } from '../../shared/src/types';
import * as R from './rooms';

type SocketData = { playerId?: string; code?: string };
type IO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type S = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

const PORT = Number(process.env.PORT ?? 3001);
const app = express();
const http = createServer(app);
const io: IO = new Server(http, { cors: { origin: true } });

// Health check for the host (Render pings this to know the service is up).
app.get('/healthz', (_req, res) => res.json({ ok: true, rooms: R.rooms.size }));

// Serve the built client in production (npm run build && npm start).
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

/** Every socket gets its own projection, so the target never leaks to guessers. */
async function broadcast(room: R.Room) {
  const sockets = await io.in(room.code).fetchSockets();
  for (const s of sockets) if (s.data.playerId) s.emit('room:state', R.viewFor(room, s.data.playerId));
}

function roomOf(socket: S): R.Room | undefined {
  return socket.data.code ? R.rooms.get(socket.data.code) : undefined;
}

/** Wraps a mutating handler: run it, swallow rule errors, then sync everyone. */
function act(socket: S, fn: (room: R.Room, pid: string) => void, ack?: (r: Ack) => void) {
  const room = roomOf(socket);
  const pid = socket.data.playerId;
  if (!room || !pid) return ack?.({ ok: false, error: 'not_in_room' });
  try {
    fn(room, pid);
    ack?.({ ok: true });
    void broadcast(room);
  } catch (e) {
    const error = e instanceof R.GameError ? e.message : 'server_error';
    if (!(e instanceof R.GameError)) console.error(e);
    ack?.({ ok: false, error });
  }
}

function attach(socket: S, room: R.Room, playerId: string) {
  // One live socket per player: kick an older tab of the same player.
  for (const [, other] of io.sockets.sockets) {
    if (other.id !== socket.id && other.data.playerId === playerId && other.data.code === room.code) {
      other.data.code = undefined;
      other.leave(room.code);
      other.emit('room:closed', 'opened_elsewhere');
    }
  }
  socket.data.playerId = playerId;
  socket.data.code = room.code;
  void socket.join(room.code);
}

function detach(socket: S, hard: boolean) {
  const room = roomOf(socket);
  const pid = socket.data.playerId;
  if (!room || !pid) return;
  socket.data.code = undefined;
  void socket.leave(room.code);
  if (R.leaveRoom(room, pid, hard)) R.rooms.delete(room.code);
  else void broadcast(room);
}

const validId = (id: unknown) => typeof id === 'string' && /^[\w-]{8,64}$/.test(id);

io.on('connection', (socket: S) => {
  socket.on('room:create', (p, ack) => {
    if (!validId(p?.playerId)) return ack({ ok: false, error: 'bad_request' });
    detach(socket, true);
    const room = R.createRoom(p);
    attach(socket, room, p.playerId);
    ack({ ok: true, data: { code: room.code } });
    void broadcast(room);
  });

  socket.on('room:join', (p, ack) => {
    if (!validId(p?.playerId)) return ack({ ok: false, error: 'bad_request' });
    const code = String(p.code ?? '').toUpperCase().trim();
    const room = R.rooms.get(code);
    if (!room) return ack({ ok: false, error: 'room_not_found' });
    try {
      if (socket.data.code !== code) detach(socket, true);
      R.joinRoom(room, p);
      attach(socket, room, p.playerId);
      ack({ ok: true, data: { code } });
      void broadcast(room);
    } catch (e) {
      ack({ ok: false, error: e instanceof R.GameError ? e.message : 'server_error' });
    }
  });

  socket.on('room:leave', () => detach(socket, true));
  socket.on('disconnect', () => detach(socket, false));

  socket.on('room:settings', (s) => act(socket, (r, pid) => R.updateSettings(r, pid, s ?? {})));
  socket.on('player:team', (t) => act(socket, (r, pid) => R.setTeam(r, pid, t)));
  socket.on('player:ready', (v) => act(socket, (r, pid) => R.setReady(r, pid, v)));
  socket.on('player:profile', (p) => act(socket, (r, pid) => R.setProfile(r, pid, p ?? {})));

  socket.on('game:start', (ack) => act(socket, (r, pid) => R.startGame(r, pid), ack));
  socket.on('game:redraw', () => act(socket, (r, pid) => R.redraw(r, pid)));
  socket.on('game:clue', (c) => act(socket, (r, pid) => R.giveClue(r, pid, c)));
  socket.on('game:lock', () => act(socket, (r, pid) => R.lockGuess(r, pid)));
  socket.on('game:counter', (side) => act(socket, (r, pid) => R.counterGuess(r, pid, side)));
  socket.on('game:next', () => act(socket, (r, pid) => R.advance(r, pid)));
  socket.on('game:lobby', () => act(socket, (r, pid) => R.backToLobby(r, pid)));

  // Hot path: no full-state broadcast, just relay the value to everyone else.
  socket.on('game:needle', (value) => {
    const room = roomOf(socket);
    const pid = socket.data.playerId;
    if (!room || !pid) return;
    if (R.moveNeedle(room, pid, value)) socket.to(room.code).emit('game:needle', { value: room.needle, by: pid });
  });
});

setInterval(() => R.sweepRooms(), 60_000).unref();

http.listen(PORT, () => console.log(`Tuned In server on http://localhost:${PORT}`));
