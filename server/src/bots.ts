// Dev helper: fill a room with bots that play along.
//   npx tsx src/bots.ts <ROOM_CODE> [count=3]
// Bots join, mark ready, give clues when they are the Psychic, wiggle the
// needle and lock in when guessing, and call left/right on the counter.
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, RoomView, ServerToClientEvents } from '../../shared/src/types';

type C = Socket<ServerToClientEvents, ClientToServerEvents>;
const [code, countArg] = process.argv.slice(2);
if (!code) {
  console.error('usage: tsx src/bots.ts <ROOM_CODE> [count]');
  process.exit(1);
}
const URL = `http://localhost:${process.env.PORT ?? 3001}`;
const NAMES = ['Noura', 'Faisal', 'Lama', 'Omar', 'Reem', 'Saad'];
const CLUES = ['Lukewarm tea', 'A Tuesday', 'Airport food', 'Grandpa’s phone', 'Majlis on Friday', 'Dial-up internet'];
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

for (let i = 0; i < Number(countArg ?? 3); i++) {
  const id = `bot-${code}-${i}`;
  const s: C = io(URL, { transports: ['websocket'] });
  let busy = false;
  let lastKey = '';

  s.on('connect', () =>
    s.emit('room:join', { playerId: id, name: NAMES[i % NAMES.length], avatar: (i * 5 + 3) % 12, code }, (r) => {
      if (!r.ok) console.error(id, r.error);
      else s.emit('player:ready', true);
    }),
  );

  // Lock voting: a bot votes once the needle has been still for a few seconds,
  // and votes again if someone's move wiped the votes.
  let voteTimer: ReturnType<typeof setTimeout> | null = null;
  let guessingNow = false;
  const scheduleVote = (ms = 3500) => {
    if (voteTimer) clearTimeout(voteTimer);
    voteTimer = setTimeout(() => {
      voteTimer = null;
      if (guessingNow && !busy) s.emit('game:vote', true);
    }, ms);
  };
  s.on('game:needle', () => {
    if (guessingNow) scheduleVote();
  });

  s.on('room:state', async (v: RoomView) => {
    const me = v.players.find((p) => p.id === id);
    if (!me) return;
    const guessing =
      v.phase === 'guess' && v.psychicId !== id && me.team && (v.settings.mode === 'coop' || me.team === v.activeTeam);
    guessingNow = !!guessing;
    if (guessing && !v.lockVotes.includes(id) && !voteTimer) scheduleVote(busy ? 9000 : 3500);
    if (!guessing && voteTimer) {
      clearTimeout(voteTimer);
      voteTimer = null;
    }
    const key = `${v.phase}:${v.round}`;
    if (busy || key === lastKey) return;
    const countering = v.phase === 'counter' && me.team && me.team !== v.activeTeam;

    if (v.phase === 'clue' && v.psychicId === id) {
      lastKey = key;
      busy = true;
      await delay(2500);
      s.emit('game:clue', CLUES[v.round % CLUES.length]);
      busy = false;
    } else if (
      guessing &&
      // Only the first eligible bot tunes, so humans get to drag too.
      v.players.find(
        (p) =>
          p.id.startsWith('bot-') &&
          p.id !== v.psychicId &&
          p.team &&
          (v.settings.mode === 'coop' || p.team === v.activeTeam),
      )?.id === id
    ) {
      // Only one bot per team tunes, so humans get a turn too.
      lastKey = key;
      busy = true;
      let x = 0.5;
      for (let k = 0; k < 40; k++) {
        x = Math.min(1, Math.max(0, x + Math.sin(k / 6) * 0.02));
        s.emit('game:needle', x);
        await delay(60);
      }
      busy = false;
      scheduleVote(4000);
    } else if (countering) {
      lastKey = key;
      await delay(1800);
      s.emit('game:counter', Math.random() < 0.5 ? 'left' : 'right');
    }
  });
}
console.log(`bots joining ${code} at ${URL}`);
