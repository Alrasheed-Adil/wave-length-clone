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

guesser.s.emit('game:vote', true); // the only guesser on the team: their vote locks it
await wait(150);
assert(host.st.view!.phase === 'counter', 'solo guesser locks with one vote → counter phase');
opponent.s.emit('game:counter', 'left'); // target is left of the needle → correct
await wait(150);
const r = host.st.view!;
assert(r.phase === 'reveal' && r.target !== null, 'reveal shows target to all');
assert(r.lastResult!.points === scoreFor(aim, target) && r.lastResult!.points === 3, `scored ${r.lastResult!.points} pts`);
assert(r.scores.A === 3 && r.scores.B === 1, `scores A=${r.scores.A} B=${r.scores.B} (counter +1)`);

host.s.emit('game:next');
await wait(150);
assert(host.st.view!.round === 2 && host.st.view!.activeTeam === 'B', 'round 2 passes to team B');

// Host refreshes mid-game: a stand-in holds host, then the owner gets it back.
host.s.close();
await wait(200);
const standIn = rest[0].st.view!.hostId;
assert(standIn !== host.id, 'host dropped: a stand-in takes over');
const back = await bot(0);
await new Promise((r) => back.s.emit('room:join', { playerId: host.id, name: 'Host', avatar: 0, code }, r));
await wait(150);
assert(back.st.view!.hostId === host.id, 'host refreshes and gets host back');
assert(back.st.view!.round === 2, 'rejoined into the same game');

// Host presses Leave: host is handed over for good and does not come back on rejoin.
back.s.emit('room:leave');
await wait(150);
const heir = rest[0].st.view!.hostId;
assert(heir !== host.id, 'host leaves on purpose: host handed over');
await new Promise((r) => back.s.emit('room:join', { playerId: host.id, name: 'Host', avatar: 0, code }, r));
await wait(150);
assert(back.st.view!.hostId === heir, 'old host rejoins as a regular player');

[...bots, back].forEach((b) => b.s.close());

// ---- Co-op room: collective lock voting + no repeated cards -----------------
console.log('\nco-op voting');
const crew = await Promise.all([10, 11, 12, 13].map(bot));
const [c0, ...cRest] = crew;
const code2: string = await new Promise((r) =>
  c0.s.emit('room:create', { playerId: c0.id, name: 'C0', avatar: 0, lang: 'en' }, (a) => r(a.data!.code)),
);
c0.s.emit('room:settings', { mode: 'coop', categories: ['science'] });
for (const [i, b] of cRest.entries())
  await new Promise((r) => b.s.emit('room:join', { playerId: b.id, name: `C${i + 1}`, avatar: i, code: code2 }, r));
await wait(150);
await new Promise((r) => c0.s.emit('game:start', r));
await wait(150);
const v2 = c0.st.view!;
const seer = crew.find((b) => b.id === v2.psychicId)!;
const [g1, g2, g3] = crew.filter((b) => b !== seer);

// No repeats: redrawing walks through every science card once before recycling.
const seenCards = new Set([seer.st.view!.card!.id]);
for (let k = 0; k < 19; k++) {
  seer.s.emit('game:redraw');
  await wait(40);
  seenCards.add(seer.st.view!.card!.id);
}
assert(seenCards.size === 20, `20 draws gave 20 different cards (${seenCards.size})`);

seer.s.emit('game:clue', 'black hole');
await wait(150);
g1.s.emit('game:vote', true);
await wait(120);
assert(c0.st.view!.phase === 'guess' && c0.st.view!.lockVotes.length === 1, '1 of 3 votes: still guessing');
g2.s.emit('game:needle', 0.8);
await wait(150);
assert(c0.st.view!.lockVotes.length === 0, 'moving the needle resets all votes');
g1.s.emit('game:vote', true);
g2.s.emit('game:vote', true);
await wait(150);
assert(c0.st.view!.phase === 'guess' && c0.st.view!.lockVotes.length === 2, '2 of 3 votes: still guessing');
g2.s.emit('game:vote', false);
await wait(120);
assert(c0.st.view!.lockVotes.length === 1, 'a vote can be withdrawn');
g2.s.emit('game:vote', true);
await wait(120);
g3.s.emit('game:vote', true);
await wait(150);
assert(c0.st.view!.phase === 'reveal', 'everyone voted → locked and revealed (co-op has no counter)');
assert(Math.abs(c0.st.view!.lastResult!.needle - 0.8) < 1e-9, 'the locked needle is the voted position');

// A holdout dropping out completes the vote for the rest.
c0.s.emit('game:next');
await wait(150);
const v3 = c0.st.view!;
const seer3 = crew.find((b) => b.id === v3.psychicId)!;
seer3.s.emit('game:clue', 'quasar');
await wait(150);
const gs = crew.filter((b) => b !== seer3 && b !== c0);
const holdout = gs.pop()!;
for (const b of [c0, ...gs].filter((b) => b !== seer3)) b.s.emit('game:vote', true);
await wait(150);
assert(c0.st.view!.phase === 'guess', 'waiting on the last voter');
holdout.s.close();
await wait(200);
assert(c0.st.view!.phase === 'reveal', 'last voter disconnects → lock completes');

crew.forEach((b) => b.s.close());
console.log('\nall good');
process.exit(0);
