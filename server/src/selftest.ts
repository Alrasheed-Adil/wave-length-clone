// End-to-end smoke test: boots against a running server (PORT, default 3001),
// plays one full teams round with four bots, and checks the hidden-target rule.
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, RoomView, ServerToClientEvents } from '../../shared/src/types';
import { scoreFor } from '../../shared/src/scoring';

type C = Socket<ServerToClientEvents, ClientToServerEvents>;
const URL = `http://localhost:${process.env.PORT ?? 3001}`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const assert = (c: unknown, msg: string) => {
  if (!c) throw new Error('FAIL: ' + msg);
  console.log('ok  ', msg);
};

async function bot(i: number) {
  const s: C = io(URL, { transports: ['websocket'] });
  const st = { view: null as RoomView | null, needle: null as number | null };
  s.on('room:state', (v) => (st.view = v));
  s.on('game:needle', (p) => (st.needle = p.value));
  await new Promise<void>((r) => s.on('connect', () => r()));
  return { s, st, id: `selftest-player-${i}` };
}

const bots = await Promise.all([0, 1, 2, 3].map(bot));
const [host, ...rest] = bots;
const code: string = await new Promise((r) =>
  host.s.emit('room:create', { playerId: host.id, name: 'Host', avatar: 0, lang: 'en' }, (a) => r(a.data!.code)),
);
assert(/^[A-Z2-9]{6}$/.test(code), `room created ${code}`);
for (const [i, b] of rest.entries())
  await new Promise((r) => b.s.emit('room:join', { playerId: b.id, name: `Bot${i}`, avatar: i + 1, code }, r));
await wait(150);
assert(host.st.view!.players.length === 4, 'four players in lobby');
const teams = host.st.view!.players.map((p) => p.team).sort().join('');
assert(teams === 'AABB', `auto-balanced teams (${teams})`);

const started: boolean = await new Promise((r) => host.s.emit('game:start', (a) => r(a.ok)));
assert(started, 'game started');
await wait(150);
const v = host.st.view!;
assert(v.phase === 'clue' && v.activeTeam === 'A', 'round 1: clue phase, team A');
const psychic = bots.find((b) => b.id === v.psychicId)!;
const others = bots.filter((b) => b !== psychic);
assert(psychic.st.view!.target !== null, 'psychic sees the target');
assert(others.every((b) => b.st.view!.target === null), 'nobody else sees the target');
const target = psychic.st.view!.target!;

psychic.s.emit('game:clue', 'lukewarm tea');
await wait(150);
assert(host.st.view!.phase === 'guess' && host.st.view!.clue === 'lukewarm tea', 'clue broadcast, guess phase');

const teamA = bots.filter((b) => host.st.view!.players.find((p) => p.id === b.id)!.team === 'A');
const guesser = teamA.find((b) => b !== psychic)!;
const opponent = bots.find((b) => host.st.view!.players.find((p) => p.id === b.id)!.team === 'B')!;

opponent.s.emit('game:needle', 0.01); // not their turn: must be ignored
await wait(100);
assert(guesser.st.needle !== 0.01, 'opposing team cannot move the needle');

const aim = target + 0.03; // inside the 3-point band
guesser.s.emit('game:needle', aim);
await wait(100);
assert(Math.abs((opponent.st.needle ?? -1) - aim) < 1e-9, 'needle relayed in real time');

guesser.s.emit('game:lock');
await wait(150);
assert(host.st.view!.phase === 'counter', 'counter phase for the other team');
opponent.s.emit('game:counter', 'left'); // target is left of the needle → correct
await wait(150);
const r = host.st.view!;
assert(r.phase === 'reveal' && r.target !== null, 'reveal shows target to all');
assert(r.lastResult!.points === scoreFor(aim, target) && r.lastResult!.points === 3, `scored ${r.lastResult!.points} pts`);
assert(r.scores.A === 3 && r.scores.B === 1, `scores A=${r.scores.A} B=${r.scores.B} (counter +1)`);

host.s.emit('game:next');
await wait(150);
assert(host.st.view!.round === 2 && host.st.view!.activeTeam === 'B', 'round 2 passes to team B');

bots.forEach((b) => b.s.close());
console.log('\nall good');
process.exit(0);
