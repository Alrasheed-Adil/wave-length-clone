import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence, motion } from 'framer-motion';
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
  useEffect(() => applyLang(lang), [lang]);

  const screen = !room ? 'home' : room.phase === 'lobby' ? 'lobby' : room.phase === 'end' ? 'end' : 'game';

  return (
    <>
      <ConnBadge />
      <AnimatePresence mode="wait">
        <motion.main
          key={screen}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {screen === 'home' && <Home />}
          {screen === 'lobby' && room && <Lobby room={room} />}
          {screen === 'game' && room && <Game room={room} />}
          {screen === 'end' && room && <End room={room} />}
        </motion.main>
      </AnimatePresence>
      <ErrorToast />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
