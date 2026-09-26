import React from 'react';
import { Sun, Moon, History, Bookmark, Languages, HardDrive } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenHistory: () => void;
  onOpenFavorites: () => void;
  onOpenLanguagesGuide: () => void;
  onOpenGoogleDrive: () => void;
  user: User | null;
  historyCount: number;
  favoritesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  onOpenHistory,
  onOpenFavorites,
  onOpenLanguagesGuide,
  onOpenGoogleDrive,
  user,
  historyCount,
  favoritesCount,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-neutral-200 dark:border-neutral-800/80 bg-[#F8F6F1]/90 dark:bg-[#171619]/90 backdrop-blur-md transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-2">
          <a
            href="#"
            className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 flex items-center gap-2 group"
          >
            <span className="w-8 h-8 rounded-lg bg-[#6842E8] text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
              L
            </span>
            <span className="tracking-tight">LinguaAI</span>
          </a>
        </div>

        {/* Zone 2: Clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600 dark:text-neutral-300">
          <a
            href="#workspace"
            className="hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            Translator
          </a>
          <button
            onClick={onOpenLanguagesGuide}
            className="hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Languages className="w-4 h-4 text-[#6842E8]" />
            <span>10 Languages</span>
          </button>
          <a
            href="#ai-assist"
            className="hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            AI Assist
          </a>
          <button
            onClick={onOpenGoogleDrive}
            className="hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <HardDrive className="w-4 h-4 text-[#6842E8]" />
            <span>Drive</span>
          </button>
          <button
            onClick={onOpenHistory}
            className="hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>History</span>
            {historyCount > 0 && (
              <span className="text-xs font-mono font-semibold px-1.5 py-0.2 rounded bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                {historyCount}
              </span>
            )}
          </button>
          <button
            onClick={onOpenFavorites}
            className="hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>Saved</span>
            {favoritesCount > 0 && (
              <span className="text-xs font-mono font-semibold px-1.5 py-0.2 rounded bg-[#EEE9FF] dark:bg-[#6842E8]/20 text-[#6842E8] dark:text-[#A78BFA]">
                {favoritesCount}
              </span>
            )}
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-2">
          {/* Google Drive Connect / Profile Button */}
          <button
            type="button"
            onClick={onOpenGoogleDrive}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              user
                ? 'border-[#6842E8]/40 bg-[#EEE9FF]/50 dark:bg-[#6842E8]/15 text-[#6842E8] dark:text-[#A78BFA]'
                : 'border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 text-neutral-700 dark:text-neutral-200 hover:border-[#6842E8]'
            }`}
            title="Open Google Drive integration"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Google user'}
                className="w-4 h-4 rounded-full object-cover"
              />
            ) : (
              <HardDrive className="w-3.5 h-3.5 text-[#6842E8]" />
            )}
            <span className="hidden sm:inline">
              {user ? user.displayName?.split(' ')[0] || 'Drive' : 'Google Drive'}
            </span>
          </button>

          {/* Mobile shortcuts */}
          <button
            onClick={onOpenHistory}
            className="md:hidden p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 transition-colors"
            title="History"
            aria-label="View history"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenFavorites}
            className="md:hidden p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 transition-colors"
            title="Saved Translations"
            aria-label="View saved translations"
          >
            <Bookmark className="w-4 h-4" />
          </button>

          {/* Theme toggle */}
          <button
            type="button"
            id="theme-toggle"
            onClick={onToggleTheme}
            className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-200 bg-white/70 dark:bg-neutral-900/70 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6842E8] cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-neutral-700" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

