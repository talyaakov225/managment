import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { he } from '../i18n/he';
import { en } from '../i18n/en';

export type Lang = 'he' | 'en';
type Translations = typeof he;

interface LangContextType {
  lang: Lang;
  t: Translations;
  setLang: (lang: Lang) => void;
  isRTL: boolean;
  dateLocale: string;
}

const translations: Record<Lang, Translations> = { he, en };

const LangContext = createContext<LangContextType | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('lang') as Lang) || 'he';
  });

  const isRTL = lang === 'he';
  const t = translations[lang];
  const dateLocale = lang === 'he' ? 'he-IL' : 'en-US';

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    root.setAttribute('lang', lang);
    localStorage.setItem('lang', lang);
  }, [lang, isRTL]);

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
  }, []);

  return (
    <LangContext.Provider value={{ lang, t, setLang, isRTL, dateLocale }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextType {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
