// PROTOTYPE, throwaway (ticket #13), round 3. Layout is fixed (Workbench v2); the bar now cycles
// the final two paper styles via ?style= (round 3), plus light/dark and fake scenarios.
// Round 1 layouts B (Journey path) and C (Campaign table) live in commit 95bb107.
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { SessionProvider, scenarios } from './shared.jsx';
import { IconSetCtx } from './icons.jsx';
import { VariantA } from './variants/A.jsx';

const styles = [
  { key: 'scriptorium', name: 'Scriptorium', icons: 'phosphor-duotone', blurb: 'Cormorant · Inter · sepia · Phosphor duotone' },
  { key: 'gilded', name: 'Scriptorium Gilded', icons: 'phosphor-duotone', blurb: 'Scriptorium fonts + Illuminated palette (ultramarine + gold)' },
  // round 2 losers, still reachable via ?style=
  { key: 'cartographer', name: 'Cartographer', icons: 'game', blurb: 'IM Fell · Source Sans · verdigris + rust · game-icons', hidden: true },
  { key: 'ledger', name: 'Ledger', icons: 'lucide', blurb: 'Fraunces · IBM Plex · wax-seal red · Lucide', hidden: true },
  { key: 'illuminated', name: 'Illuminated', icons: 'phosphor-fill', blurb: 'Alegreya SC · ultramarine + gold · Phosphor fill', hidden: true },
];
const shown = styles.filter((x) => !x.hidden);

const osMode = () => (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

function useParam(name, fallback) {
  const [v, setV] = useState(() => new URLSearchParams(location.search).get(name) ?? fallback);
  const set = (next) => {
    const p = new URLSearchParams(location.search);
    p.set(name, next);
    history.replaceState(null, '', `?${p}`);
    setV(next);
  };
  return [v, set];
}

function App() {
  const [style, setStyle] = useParam('style', 'scriptorium');
  const [mode, setMode] = useParam('mode', osMode());
  const [scenario, setScenario] = useParam('scenario', 'implement');
  const idx = Math.max(0, styles.findIndex((v) => v.key === style));
  const S = styles[idx];

  useEffect(() => {
    document.documentElement.dataset.style = S.key;
    document.documentElement.dataset.mode = mode;
  }, [S.key, mode]);

  const si = Math.max(0, shown.findIndex((v) => v.key === S.key));
  const cycle = (d) => setStyle(shown[(si + d + shown.length) % shown.length].key);
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'ArrowLeft') cycle(-1);
      if (e.key === 'ArrowRight') cycle(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <IconSetCtx.Provider value={S.icons}>
      <SessionProvider key={scenario} scenario={scenario}>
        <VariantA />
      </SessionProvider>
      {import.meta.env.DEV && (
        <div className="proto-bar">
          <button onClick={() => cycle(-1)}>←</button>
          <span className="lbl" title={S.blurb}>{S.hidden ? '·' : `${si + 1}/${shown.length}`} {S.name}<br /><span style={{ fontWeight: 400, fontSize: 10, opacity: .7 }}>{S.blurb}</span></span>
          <button onClick={() => cycle(1)}>→</button>
          <span className="div" />
          <button className={mode === 'light' ? 'on' : ''} onClick={() => setMode('light')}>Light</button>
          <button className={mode === 'dark' ? 'on' : ''} onClick={() => setMode('dark')}>Dark</button>
          <span className="div" />
          <select value={scenario} onChange={(e) => setScenario(e.target.value)} style={{ background: '#2a2a2a', color: '#fff', border: 0, borderRadius: 999, padding: '5px 8px' }}>
            {Object.entries(scenarios).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      )}
    </IconSetCtx.Provider>
  );
}

createRoot(document.getElementById('root')).render(<App />);
