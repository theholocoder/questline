// PROTOTYPE, throwaway. Variant C "Campaign table": the Quest Log board is the main surface.
// Sessions are tabs across the top; a literal full-width XP Bar fills as Levels are gained;
// the active Run is a docked console at the bottom; Review opens as a full-screen table.
import { useState } from 'react';
import { sessions, stages, runs } from '../data.js';
import { useSession, stageState, shownStage, Icon, Gauge, StageTranscript, Composer, DiffView, Findings, CommitDraft, QuestLog, Overlays, EmptyProject, ProtoPanel, RunList } from '../shared.jsx';

function XpBar() {
  const { s } = useSession();
  // Plan checkpoints give partial XP inside Level 1.
  const planPart = s.stageIdx > 0 ? 1 : (s.checkpoints ?? 0) / 3;
  const pct = s.complete ? 100 : s.stageIdx === 0 ? planPart * 33 : s.stageIdx === 1 ? 33 + 0.25 * 33 : 66 + 10;
  return (
    <div className="col" style={{ gap: 4 }}>
      <div style={{ position: 'relative', height: 16, background: 'var(--xp-track)', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--parchment-edge)' }}>
        <div style={{ width: pct + '%', height: '100%', background: 'var(--xp-fill)' }} />
        {[33.3, 66.6].map((x) => <div key={x} style={{ position: 'absolute', left: x + '%', top: 0, bottom: 0, width: 2, background: 'var(--bg)' }} />)}
      </div>
      <div className="row" style={{ gap: 0 }}>
        {stages.map((st, i) => {
          const state = stageState(s, i);
          return (
            <div key={st.id} className="row" style={{ flex: 1, gap: 6, opacity: state === 'locked' ? .5 : 1 }}>
              <span className="display" style={{ fontSize: 13 }}>Lv {st.level} · {st.label}</span>
              {state === 'done' && <span style={{ color: 'var(--ok)' }}>✓</span>}
              {state === 'active' && <span className="chip accent">current</span>}
              {st.checkpoints && state !== 'locked' && <span className="muted" style={{ fontSize: 11 }}>{st.checkpoints.map((c, ci) => (state === 'done' || ci < (s.checkpoints ?? 3) ? '◆' : '◇')).join(' ')}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function VariantC() {
  const { s, openDialog, confirmPlan, toggleProto } = useSession();
  const [dock, setDock] = useState('open'); // open | min | max
  const [review, setReview] = useState(false);
  const st = shownStage(s);
  const activeRun = runs.find((r) => r.status === 'running');
  const dockH = dock === 'min' ? 42 : dock === 'max' ? '75%' : '42%';

  return (
    <div className="col" style={{ height: '100%', gap: 0 }}>
      {/* Session tabs */}
      <div className="row" style={{ gap: 0, background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', paddingLeft: 8 }}>
        <span className="display" style={{ padding: '0 12px', color: 'var(--accent)' }}><Icon n="sword" /> questline ▾</span>
        {sessions.filter((x) => !x.archived).map((x) => (
          <div key={x.id} className="row" style={{ padding: '8px 14px', borderRight: '1px solid var(--border)', background: x.id === 's1' ? 'var(--surface)' : undefined, fontWeight: x.id === 's1' ? 600 : 400, fontSize: 13 }}>
            {x.title}<span className="muted" style={{ fontSize: 11 }}>Lv {stages.findIndex((t) => t.id === x.stage) + 1}</span>
          </div>
        ))}
        <button className="btn ghost sm" style={{ margin: '0 8px' }}>+ New Session</button>
        <span className="grow" />
        <button className="btn ghost sm"><Icon n="grimoire" /> Grimoire</button>
        <button className="btn ghost sm"><Icon n="gear" /></button>
      </div>

      {s.empty ? <EmptyProject /> : (
        <>
          {/* Banner */}
          <header className="col" style={{ padding: '12px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', gap: 10 }}>
            <div className="row">
              <Icon n="main" style={{ color: 'var(--accent)', fontSize: 20 }} />
              <h1 className="display" style={{ margin: 0, fontSize: 24 }}>Dark mode toggle</h1>
              <span className="chip mono">feat/dark-mode ← main</span>
              <span className="grow" />
              {st.id === 'plan' && <button className="btn sm" onClick={toggleProto}>⚗ Prototype</button>}
              {s.stageIdx === 1 && <button className="btn sm" onClick={() => openDialog('rewind')}>↶ Rewind</button>}
              {s.stageIdx >= 2 && <button className="btn sm" onClick={() => setReview(true)}>⚖ Open Review table</button>}
              {!s.complete && <button className="btn sm danger" onClick={() => openDialog('abandon')}>Abandon</button>}
              {s.stageIdx === 2 && !s.complete && <button className="btn primary sm" onClick={() => openDialog('complete')}>Complete</button>}
            </div>
            <XpBar />
          </header>

          {/* Board */}
          <div className="row grow" style={{ minHeight: 0, alignItems: 'stretch', gap: 0 }}>
            <section className="grow" style={{ padding: 16, minHeight: 0 }}>
              <QuestLog dense />
            </section>
            <ProtoPanel />
          </div>

          {/* Run dock */}
          <section className="col" style={{ height: dockH, borderTop: '2px solid var(--accent)', background: 'var(--surface)', gap: 0, minHeight: 42 }}>
            <div className="row" style={{ padding: '6px 14px', borderBottom: dock === 'min' ? 0 : '1px solid var(--border)' }}>
              <span style={{ color: s.runStatus === 'errored' ? 'var(--danger)' : 'var(--warn)' }}>●</span>
              <strong>{st.id === 'plan' ? 'Plan Run' : activeRun ? activeRun.title : 'Review Run'}</strong>
              {s.runStatus === 'approval' && <span className="chip warn">needs approval</span>}
              {s.runStatus === 'errored' && <span className="chip danger">errored</span>}
              {s.runStatus === 'gate' && <span className="chip ok">gate passed · confirm</span>}
              <span className="grow" />
              <Gauge used={activeRun?.tokens ?? 142000} window={200000} />
              <button className="btn ghost sm" onClick={() => setDock('min')}>▁</button>
              <button className="btn ghost sm" onClick={() => setDock('open')}>▭</button>
              <button className="btn ghost sm" onClick={() => setDock('max')}>▔</button>
            </div>
            {dock !== 'min' && (
              <div className="row grow" style={{ minHeight: 0, alignItems: 'stretch', gap: 0 }}>
                <div className="col" style={{ width: 240, padding: 10, borderRight: '1px solid var(--border)' }}><div className="eyebrow">Runs</div><RunList /></div>
                <div className="col grow" style={{ padding: 10, minHeight: 0 }}>
                  <div className="scroll grow"><StageTranscript /></div>
                  {s.runStatus === 'gate' && <div className="callout ok row"><span className="grow">Plan gate passed.</span><button className="btn primary sm" onClick={confirmPlan}>Confirm Plan</button></div>}
                  <Composer />
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {review && (
        <div className="backdrop" style={{ placeItems: 'stretch', padding: 20 }}>
          <div className="panel col" style={{ padding: 16, height: '100%' }}>
            <div className="row"><h2 className="display grow" style={{ margin: 0 }}>⚖ Review table</h2><button className="btn sm" onClick={() => setReview(false)}>✕ Back to board</button></div>
            <div className="row grow" style={{ minHeight: 0, alignItems: 'stretch', gap: 16 }}>
              <div className="scroll grow"><DiffView /></div>
              <div className="col scroll" style={{ width: 340 }}>
                <Findings />
                <div className="eyebrow">Commit draft</div>
                <CommitDraft />
                <button className="btn primary" onClick={() => { setReview(false); openDialog('complete'); }}>Complete</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Overlays />
    </div>
  );
}
