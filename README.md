# Tuned In · توليف

A real-time, bilingual (English / Arabic) party game about reading minds on a dial.
One player — the **Psychic** — secretly sees where a target sits between two
extremes (*Red flag ↔ Green flag*), gives a single clue, and everyone else turns
the dial together to find it.

## Run it

```bash
npm install          # root (concurrently)
npm run install:all  # server + client
npm run dev          # server on :3001, client on :5173 (also exposed on your LAN)
```

Open http://localhost:5173 — phones on the same Wi-Fi can join through the
"Network" URL Vite prints.

**Production:** `npm run build && npm start` — the server then serves the built
client on :3001.

## Deploy free on Render

The repo ships a `render.yaml` Blueprint: one free web service serves both
the client and the Socket.io server from a single URL.

1. Sign in at https://dashboard.render.com with GitHub.
2. **New → Blueprint**, pick this repository, and click **Apply**.
3. Wait for the first build (~3–4 min); your link is `https://tuned-in-xxxx.onrender.com`.

Every push to `main` redeploys automatically. Free-tier notes:

- The service sleeps after 15 minutes with no visitors. The first visit after
  that takes ~50 s to wake up, so open the link a minute before game night.
- Rooms live in memory, so a sleep or redeploy ends any game in progress.

**Testing helpers** (with the server running):

```bash
cd server
npx tsx src/selftest.ts         # 4 bots play a full round and assert the rules
npx tsx src/bots.ts ROOMCODE 3  # fill your room with 3 bots that play along
```

## Layout

```
shared/src/        contracts used by both sides
  types.ts         RoomView, Player, socket event maps (typed both directions)
  cards.ts         63 bilingual spectrum cards across 6 decks
  scoring.ts       band geometry + scoreFor(needle, target) → 4 / 3 / 2 / 0
server/src/
  rooms.ts         authoritative game state machine (pure, no sockets)
  index.ts         Socket.io wiring; per-player projections so the target never
                   reaches guessers before the reveal
client/src/
  store.ts         Zustand store: socket lifecycle, auto-rejoin, rAF-throttled needle
  i18n.ts          react-i18next resources (en / ar), sets <html dir>
  components/Dial  SVG tuning dial: pointer + keyboard control, spring needle,
                   grille shutter that drops away on reveal; always rendered LTR
  components/Avatar  12 hand-built SVG avatars
  screens/         Home → Lobby → Game → End
```

## Rules as implemented

- **Teams** (default): teams alternate turns; the Psychic rotates within each team.
  After the guessing team locks in, the other team calls **left / right** of the
  needle — a correct call scores +1 unless the guess was a bullseye.
- **Co-op**: everyone guesses together; the score is out of `rounds × 4`.
- Target = five bands (2·3·4·3·2), each 4.2 % of the arc.
- The host can skip a stuck round; the Psychic or host advances after a reveal.
- Refreshing or dropping connection rejoins the same seat (stable id in localStorage).
