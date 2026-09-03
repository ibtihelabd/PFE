/**
 * theme.js — Système de thème Dark / Light pour TransportDakar
 * Usage : const { theme, toggle, isDark, t } = useTheme();
 * t.bg, t.panel, t.border, t.text, t.muted, t.accent …
 */
import { createContext, useContext, useState, useEffect } from 'react';

/* ── Palettes ─────────────────────────────────────────────────── */
export const DARK = {
  name:        'dark',
  bg:          '#0a0d14',
  bg2:         '#0f1117',
  panel:       'rgba(255,255,255,0.04)',
  panelSolid:  '#141824',
  border:      'rgba(255,255,255,0.08)',
  borderHover: 'rgba(255,255,255,0.18)',
  text:        '#ffffff',
  textSub:     'rgba(255,255,255,0.65)',
  muted:       'rgba(255,255,255,0.35)',
  veryMuted:   'rgba(255,255,255,0.18)',
  navbar:      'rgba(10,13,20,0.9)',
  input:       'rgba(255,255,255,0.05)',
  inputBorder: 'rgba(255,255,255,0.1)',
  shadow:      '0 4px 24px rgba(0,0,0,0.4)',
  // Accents (identiques dark/light)
  accent:  '#ff6b35',
  red:     '#ff6b6b',
  blue:    '#74c0fc',
  green:   '#69db7c',
  orange:  '#ffa94d',
  purple:  '#da77f2',
};

export const LIGHT = {
  name:        'light',
  bg:          '#fbfcfd',
  bg2:         '#f3f5f8',
  panel:       'rgba(255,255,255,0.9)',
  panelSolid:  '#ffffff',
  border:      'rgba(0,0,0,0.08)',
  borderHover: 'rgba(0,0,0,0.2)',
  text:        '#0f1117',
  textSub:     'rgba(0,0,0,0.7)',
  muted:       'rgba(0,0,0,0.45)',
  veryMuted:   'rgba(0,0,0,0.25)',
  navbar:      'rgba(251,252,253,0.95)',
  input:       'rgba(0,0,0,0.04)',
  inputBorder: 'rgba(0,0,0,0.12)',
  shadow:      '0 4px 24px rgba(0,0,0,0.08)',
  // Accents
  accent:  '#e85a1a',
  red:     '#e53e3e',
  blue:    '#2b7fc3',
  green:   '#2d9a4e',
  orange:  '#d97706',
  purple:  '#9333ea',
};

/* ── Context ─────────────────────────────────────────────────── */
const ThemeContext = createContext({ theme: DARK, toggle: () => {}, isDark: true });

export function ThemeProvider({ children }) {
  const saved = localStorage.getItem('dtk_theme') || 'dark';
  const [mode, setMode] = useState(saved);
  const isDark  = mode === 'dark';
  const theme   = isDark ? DARK : LIGHT;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    document.body.style.background = theme.bg;
    document.body.style.color = theme.text;
    localStorage.setItem('dtk_theme', mode);

    // Injecter les CSS custom properties pour que les inline styles puissent les utiliser
    const styleId = 'dtk-theme-vars';
    let el = document.getElementById(styleId);
    if (!el) { el = document.createElement('style'); el.id = styleId; document.head.appendChild(el); }
    el.textContent = `
      :root {
        --dtk-bg:      ${theme.bg};
        --dtk-bg2:     ${theme.bg2};
        --dtk-panel:   ${theme.panel};
        --dtk-solid:   ${theme.panelSolid};
        --dtk-border:  ${theme.border};
        --dtk-text:    ${theme.text};
        --dtk-sub:     ${theme.textSub};
        --dtk-muted:   ${theme.muted};
        --dtk-vmuted:  ${theme.veryMuted};
        --dtk-navbar:  ${theme.navbar};
        --dtk-input:   ${theme.input};
        --dtk-shadow:  ${theme.shadow};
      }
      /* Force le texte des pages décideurs en mode light */
      [data-theme="light"] .dtk-page {
        background: ${theme.bg} !important;
        color: ${theme.text} !important;
      }
      [data-theme="light"] .dtk-card {
        background: ${theme.panelSolid} !important;
        border-color: ${theme.border} !important;
      }
      [data-theme="light"] .dtk-navbar {
        background: ${theme.navbar} !important;
        border-color: ${theme.border} !important;
      }
      [data-theme="light"] .dtk-text   { color: ${theme.text} !important; }
      [data-theme="light"] .dtk-muted  { color: ${theme.muted} !important; }

      /* Liste déroulante des <select> natifs : forcer fond + texte lisibles
         (le navigateur ignore souvent le background transparent/rgba inline
         pour le popup d'options et retombe sur un fond système blanc, ce qui
         rendait le texte clair illisible en dark mode) */
      select option {
        background: ${theme.panelSolid} !important;
        color: ${theme.text} !important;
      }
    `;
  }, [mode, theme]);

  const toggle = () => setMode(m => m === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggle, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
