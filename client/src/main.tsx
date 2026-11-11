import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { motion } from 'framer-motion';
import './index.css';
import { applyLang } from './i18n';
import { useGame } from './store';
import { Home } from './screens/Home';
import { Lobby } from './screens/Lobby';
import { Game } from './screens/Game';
import { End } from './screens/End';
import { ConnBadge, ErrorToast } from './components/ui';

function App() {
  const room = useGame((s) => s.room);
  const lang = useGame((s) => s.lang);
  useEffect(() => {
    applyLang(lang);
  }, [lang]);

  const screen = !room ? 'home' : room.phase === 'lobby' ? 'lobby' : room.phase === 'end' ? 'end' : 'game';
  // Each new screen starts at the top (the game screen is often scrolled down).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  return (
    <>
      <ConnBadge />
      {/* Screens only fade *in*. The old exit animation (AnimatePresence mode="wait")
          could stall and leave the previous screen stuck at opacity 0, which was
          the blank screen after "See results". A keyed, enter-only fade can't stall. */}
      <motion.main
        key={screen}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {screen === 'home' && <Home />}
        {screen === 'lobby' && room && <Lobby room={room} />}
        {screen === 'game' && room && <Game room={room} />}
        {screen === 'end' && room && <End room={room} />}
      </motion.main>
      <ErrorToast />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
