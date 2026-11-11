import { useTranslation } from 'react-i18next';
import type { Player, TeamId } from '@shared/types';
import { useGame } from '../store';
import { Avatar } from './Avatar';

export const TEAM_COLOR: Record<TeamId, string> = { A: 'var(--color-ember)', B: 'var(--color-tide)' };

export function useTeamName() {
  const { t } = useTranslation();
  return (team: TeamId | null) => (team === 'A' ? t('lobby.teamA') : team === 'B' ? t('lobby.teamB') : '');
}

/** Small dial glyph + wordmark. */
export function Wordmark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const { t } = useTranslation();
  const big = size === 'lg';
  return (
    <div className="flex items-center gap-3">
      <svg width={big ? 54 : 34} height={big ? 34 : 22} viewBox="0 0 54 34" aria-hidden="true">
        <path d="M3 31a24 24 0 0 1 48 0Z" fill="var(--color-face)" stroke="var(--color-ink)" strokeWidth="2.5" />
        <path d="M27 31 37 12" stroke="var(--color-signal)" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="27" cy="31" r="4" fill="var(--color-amber)" stroke="var(--color-ink)" strokeWidth="2" />
      </svg>
      <span className={`font-extrabold tracking-tight leading-none ${big ? 'text-5xl sm:text-6xl' : 'text-2xl'}`}>
        {t('app.name')}
      </span>
    </div>
  );
}

export function LangToggle() {
  const { t } = useTranslation();
  const lang = useGame((s) => s.lang);
  const setLang = useGame((s) => s.setLang);
  return (
    <button
      className="key key-sm min-w-14"
      onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
      aria-label="Switch language"
      lang={lang === 'en' ? 'ar' : 'en'}
    >
      {t('lang.toggle')}
    </button>
  );
}

export function ConnBadge() {
  const conn = useGame((s) => s.conn);
  const { t } = useTranslation();
  if (conn === 'online') return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50 bg-ink py-1.5 text-center text-sm font-semibold text-glow">
      {t('errors.disconnected')}
    </div>
  );
}

export function PlayerChip({
  player,
  tag,
  dim,
  highlight,
}: {
  player: Player;
  tag?: string;
  dim?: boolean;
  highlight?: boolean;
}) {
  const me = useGame((s) => s.playerId);
  const { t } = useTranslation();
  return (
    <div
      className={`flex min-w-0 items-center gap-2.5 rounded-lg border-2 px-2 py-1.5 transition-colors ${
        highlight ? 'border-ink bg-glow' : 'border-transparent'
      } ${dim || !player.connected ? 'opacity-45' : ''}`}
    >
      <Avatar id={player.avatar} size={36} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold leading-tight">
          {player.name}
          {player.id === me && <span className="ms-1 font-normal text-ink-3">({t('game.you')})</span>}
        </div>
        {tag && <div className="label mt-0.5 !text-[0.65rem]">{tag}</div>}
      </div>
    </div>
  );
}

export function ErrorToast() {
  const error = useGame((s) => s.error);
  const clear = useGame((s) => s.clearError);
  const { t } = useTranslation();
  if (!error) return null;
  const key = `errors.${error}`;
  const msg = t(key) === key ? t('errors.default') : t(key);
  return (
    <div role="alert" className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-lg border-2 border-ink bg-signal px-4 py-3 font-semibold text-glow shadow-[0_4px_0_var(--color-ink)]">
      <span className="flex-1">{msg}</span>
      <button className="font-mono text-lg leading-none" onClick={clear} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}
