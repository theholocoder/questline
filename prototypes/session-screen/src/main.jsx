// PROTOTYPE, throwaway (ticket #13): three structurally different Session screen layouts,
// switchable via ?variant=A|B|C, plus a 2 genres x 2 modes theme switch and fake scenarios.
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { SessionProvider, scenarios } from './shared.jsx';
import { VariantA } from './variants/A.jsx';
import { VariantB } from './variants/B.jsx';
import { VariantC } from './variants/C.jsx';

const variants = [
  { key: 'A', name: 'Workbench', C: VariantA },
  { key: 'B', name: 'Journey path', C: VariantB },
  { key: 'C', name: 'Campaign table', C: VariantC },
];

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
  const [variant, setVariant] = useParam('variant', 'A');
  const [genre, setGenre] = useParam('genre', 'paper');
  const [mode, setMode] = useParam('mode', osMode());
  const [scenario, setScenario] = useParam('scenario', 'implement');
  const idx = Math.max(0, variants.findIndex((v) => v.key === variant));
  const V = variants[idx];

  useEffect(() => {
    document.documentElement.dataset.genre = genre;
    document.documentElement.dataset.mode = mode;
  }, [genre, mode]);

  const cycle = (d) => setVariant(variants[(idx + d + variants.length) % variants.length].key);
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t.closest?.('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'ArrowLeft') cycle(-1);
      if (e.key === 'ArrowRight') cycle(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <>
      <SessionProvider key={scenario} scenario={scenario}>
        <V.C />
      </SessionProvider>
      {import.meta.env.DEV && (
        <div className="proto-bar">
          <button onClick={() => cycle(-1)}>←</button>
          <span className="lbl">{V.key} ({V.name})</span>
          <button onClick={() => cycle(1)}>→</button>
          <span className="div" />
          <button className={genre === 'paper' ? 'on' : ''} onClick={() => setGenre('paper')}>Paper</button>
          <button className={genre === 'fantasy' ? 'on' : ''} onClick={() => setGenre('fantasy')}>Dark fantasy</button>
          <span className="div" />
          <button className={mode === 'light' ? 'on' : ''} onClick={() => setMode('light')}>Light</button>
          <button className={mode === 'dark' ? 'on' : ''} onClick={() => setMode('dark')}>Dark</button>
          <span className="div" />
          <select value={scenario} onChange={(e) => setScenario(e.target.value)} style={{ background: '#2a2a2a', color: '#fff', border: 0, borderRadius: 999, padding: '5px 8px' }}>
            {Object.entries(scenarios).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
