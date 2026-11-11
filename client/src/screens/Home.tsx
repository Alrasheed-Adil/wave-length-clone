import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ROOM_CODE_LENGTH } from '@shared/types';
import { useGame } from '../store';
import { Avatar, AVATAR_COUNT } from '../components/Avatar';
import { LangToggle, Wordmark } from '../components/ui';

export function Home() {
  const { t } = useTranslation();
  const { name, avatar, busy, conn, setName, setAvatar, createRoom, joinRoom } = useGame();
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('room')?.toUpperCase() ?? '');
  const nameOk = name.trim().length > 0;
  const online = conn === 'online';
  const steps = t('home.howSteps', { returnObjects: true }) as string[];

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 pb-10 pt-5 sm:px-8">
      <header className="flex items-center justify-between">
        <span className="label">v0.1 · {online ? 'on air' : '…'}</span>
        <LangToggle />
      </header>

      <div className="mt-8 grid flex-1 items-start gap-10 md:mt-14 md:grid-cols-[1.1fr_1fr]">
        {/* Left: brand + how to play */}
        <section>
          <Wordmark size="lg" />
          <p className="mt-4 max-w-sm text-xl font-semibold text-ink-2">{t('app.tagline')}</p>

          <div className="perf mt-8 max-w-md" />
          <h2 className="label mt-5">{t('home.how')}</h2>
          <ol className="mt-3 max-w-md space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid size-7 flex-none place-items-center rounded-md border-2 border-ink bg-amber font-mono text-sm font-medium">
                  {i + 1}
                </span>
                <span className="pt-0.5 leading-snug text-ink-2">{s}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Right: the "ticket" */}
        <motion.section
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          className="sheet p-5 shadow-[0_6px_0_var(--color-ink)] sm:p-6"
        >
          <label className="label" htmlFor="name">
            {t('home.yourName')}
          </label>
          <input
            id="name"
            className="field mt-2 text-lg"
            maxLength={18}
            value={name}
            placeholder={t('home.namePlaceholder')}
            onChange={(e) => setName(e.target.value)}
            autoComplete="nickname"
          />

          <div className="label mt-5">{t('home.pickAvatar')}</div>
          <div className="mt-2 grid grid-cols-6 gap-2" role="radiogroup" aria-label={t('home.pickAvatar')}>
            {Array.from({ length: AVATAR_COUNT }, (_, i) => (
              <button
                key={i}
                role="radio"
                aria-checked={avatar === i}
                onClick={() => setAvatar(i)}
                className={`rounded-[14px] p-0.5 transition-transform ${
                  avatar === i ? '-translate-y-1 bg-ink' : 'hover:-translate-y-0.5'
                }`}
              >
                <Avatar id={i} fluid />
              </button>
            ))}
          </div>

          <button
            className="key key-signal mt-6 w-full py-3.5 text-lg"
            disabled={!nameOk || busy || !online}
            onClick={() => void createRoom()}
          >
            {t('home.create')}
          </button>

          <div className="my-5 flex items-center gap-3">
            <div className="perf flex-1" />
            <span className="label">{t('home.or')}</span>
            <div className="perf flex-1" />
          </div>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length === ROOM_CODE_LENGTH) void joinRoom(code);
            }}
          >
            <input
              dir="ltr"
              className="field flex-1 text-center font-mono text-xl tracking-[0.35em] uppercase"
              value={code}
              maxLength={ROOM_CODE_LENGTH}
              placeholder={t('home.codePlaceholder')}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              aria-label={t('home.codePlaceholder')}
              autoCapitalize="characters"
            />
            <button
              type="submit"
              className="key key-ink"
              disabled={!nameOk || code.length !== ROOM_CODE_LENGTH || busy || !online}
            >
              {t('home.join')}
            </button>
          </form>
        </motion.section>
      </div>
    </div>
  );
}
