// PROTOTYPE, throwaway. Variant A "Workbench": IDE-like three panes.
// Sidebar (Projects/Sessions) · centre tabs (Run / Review / Quest Log) · right inspector.
// XP Bar is a horizontal segmented strip in the Session header.
import { useState } from 'react';
import { projects, sessions, stages, runs, grimoire } from '../data.js';
import { useSession, stageState, shownStage, Icon, Gauge, StageTranscript, Composer, DiffView, Findings, CommitDraft, Objectives, RunList, QuestLog, Overlays, EmptyProject, ProtoPanel } from '../shared.jsx';

function XpStrip() {
  const { s, viewStage } = useSession();
  return (
    <div className="row" style={{ gap: 4 }}>
      {stages.map((st, i) => {
        const state = stageState(s, i);
        const viewing = (s.viewIdx ?? s.stageIdx) === i;
        return (
          <button key={st.id} onClick={() => state !== 'locked' && viewStage(i)} className="parchment"
            style={{ padding: '4px 12px', opacity: state === 'locked' ? .45 : 1, cursor: state === 'locked' ? 'default' : 'pointer',
              background: state === 'active' ? 'var(--accent-soft)' : state === 'done' ? 'var(--parchment)' : 'var(--surface-2)',
              outline: viewing ? '2px solid var(--accent)' : undefined, minWidth: 150, textAlign: 'left' }}>
            <div className="row" style={{ gap: 6 }}>
              <span className="display" style={{ fontSize: 12, color: 'var(--accent)' }}>Lv {st.level}</span>
              <span className="display" style={{ fontSize: 15 }}>{st.label}</span>
              <span className="grow" />
              {state === 'done' ? '✓' : state === 'locked' ? <Icon n="lock" /> : <span className="chip accent">active</span>}
            </div>
            {st.checkpoints && (
              <div className="row" style={{ gap: 6, marginTop: 2 }}>
                {st.checkpoints.map((c, ci) => {
                  const hit = state === 'done' || ci < (s.checkpoints ?? 3);
                  return <span key={c} style={{ fontSize: 10.5, color: hit ? 'var(--ok)' : 'var(--muted)' }}>{hit ? '◆' : '◇'} {c}</span>;
                })}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function VariantA() {
  const { s, openDialog, toggleProto, confirmPlan, view } = useSession();
  const st = shownStage(s);
  const [tab, setTab] = useState(null);
  const current = tab ?? (st.id === 'review' ? 'review' : 'run');
  const activeRun = runs.find((r) => r.status === 'running') ?? runs[0];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr auto', height: '100%' }}>
      {/* Sidebar */}
      <nav className="col" style={{ borderRight: '1px solid var(--border)', padding: 12, background: 'var(--surface)', gap: 14 }}>
        <div className="display" style={{ fontSize: 20, color: 'var(--accent)' }}><Icon n="sword" /> Questline</div>
        <div>
          <div className="eyebrow">Projects</div>
          {projects.map((p) => <div key={p.name} className="row" style={{ padding: '3px 6px', borderRadius: 4, background: p.active ? 'var(--accent-soft)' : undefined, fontWeight: p.active ? 600 : 400 }}>{p.name}</div>)}
        </div>
        <div>
          <div className="row"><span className="eyebrow grow">Sessions</span><button className="btn ghost sm">+</button></div>
          {!s.empty && sessions.map((x) => (
            <div key={x.id} className="row" style={{ padding: '4px 6px', borderRadius: 4, background: x.id === 's1' ? 'var(--surface-2)' : undefined, opacity: x.archived ? .5 : 1 }}>
              <span className="grow" style={{ fontSize: 13 }}>{x.title}</span>
              <span className="muted" style={{ fontSize: 11 }}>{x.stage === 'complete' ? '✓' : `Lv ${stages.findIndex((t) => t.id === x.stage) + 1}`}</span>
            </div>
          ))}
          {s.empty && <div className="muted" style={{ fontStyle: 'italic', fontSize: 12 }}>No Sessions yet.</div>}
        </div>
        <span className="grow" />
        <button className="btn ghost" style={{ textAlign: 'left' }} onClick={() => setTab('log')}><Icon n="quest" /> Quest Log</button>
        <button className="btn ghost" style={{ textAlign: 'left' }}><Icon n="grimoire" /> Grimoire</button>
        <button className="btn ghost" style={{ textAlign: 'left' }}><Icon n="gear" /> Settings</button>
      </nav>

      {/* Centre */}
      {s.empty ? <EmptyProject /> : (
        <main className="col" style={{ minWidth: 0, minHeight: 0, gap: 0 }}>
          <header className="col" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', gap: 10 }}>
            <div className="row">
              <h1 className="display" style={{ margin: 0, fontSize: 22 }}>Dark mode toggle</h1>
              <span className="chip mono">feat/dark-mode ← main</span>
              <span className="grow" />
              {s.stageIdx === 1 && <button className="btn sm" onClick={() => openDialog('rewind')}>↶ Rewind to Plan</button>}
              {!s.complete && <button className="btn sm danger" onClick={() => openDialog('abandon')}>Abandon</button>}
              {s.stageIdx === 2 && !s.complete && <button className="btn primary sm" onClick={() => openDialog('complete')}>Complete</button>}
            </div>
            <XpStrip />
          </header>
          <div className="row" style={{ padding: '0 16px', borderBottom: '1px solid var(--border)', gap: 0 }}>
            {[['run', `Run · ${st.id === 'plan' ? 'Plan' : activeRun.title}`], ['review', 'Review'], ['log', 'Quest Log']].map(([k, l]) => (
              <button key={k} className="btn ghost" onClick={() => setTab(k)} style={{ borderRadius: 0, borderBottom: current === k ? '2px solid var(--accent)' : '2px solid transparent' }}>{l}</button>
            ))}
            <span className="grow" />
            {current === 'run' && <Gauge used={st.id === 'plan' ? 142000 : activeRun.tokens} window={200000} />}
            {current === 'run' && <button className="btn ghost sm">Compact</button>}
            {current === 'run' && <button className="btn ghost sm">Clear</button>}
          </div>
          <div className="row grow" style={{ minHeight: 0, alignItems: 'stretch', gap: 0 }}>
            <section className="col grow" style={{ padding: 16, minHeight: 0 }}>
              {current === 'run' && (
                <>
                  <div className="scroll grow" style={{ maxWidth: 820 }}><StageTranscript /></div>
                  {st.id === 'plan' && s.runStatus === 'gate' && (
                    <div className="callout ok row"><span className="grow">Plan gate passed: Spec written, 4 Objectives cut. Confirm to start Implement.</span><button className="btn primary sm" onClick={confirmPlan}>Confirm Plan</button></div>
                  )}
                  <div style={{ maxWidth: 820 }}><Composer /></div>
                </>
              )}
              {current === 'review' && (st.id === 'review' || s.stageIdx >= 2 ? (
                <div className="row scroll grow" style={{ alignItems: 'flex-start', gap: 16 }}>
                  <div className="grow"><DiffView /></div>
                  <div className="col" style={{ width: 320 }}>
                    <div className="eyebrow">Findings from Review</div>
                    <Findings />
                    <div className="eyebrow" style={{ marginTop: 8 }}>Commit draft</div>
                    <CommitDraft />
                  </div>
                </div>
              ) : (
                <div className="muted" style={{ fontStyle: 'italic', textAlign: 'center', marginTop: 60 }}>The Review Level is still locked. Finish the Objectives first.</div>
              ))}
              {current === 'log' && <QuestLog />}
            </section>
            <ProtoPanel />
          </div>
        </main>
      )}

      {/* Inspector */}
      {!s.empty && (
        <aside className="col scroll" style={{ width: 280, borderLeft: '1px solid var(--border)', padding: 14, background: 'var(--surface)', gap: 14 }}>
          <div>
            <div className="eyebrow">Main Quest</div>
            <div className="parchment" style={{ padding: 10, marginTop: 4 }}>
              <div className="display" style={{ fontSize: 16 }}><Icon n="main" /> Dark mode toggle</div>
              <div style={{ fontSize: 12.5, marginTop: 4 }}>System / Light / Dark from Settings. Follows OS; dark fallback.</div>
            </div>
          </div>
          <div>
            <div className="eyebrow">Objectives</div>
            <div style={{ marginTop: 6 }}><Objectives compact /></div>
          </div>
          <div>
            <div className="eyebrow">Runs</div>
            <div style={{ marginTop: 6 }}><RunList /></div>
          </div>
          <div>
            <div className="eyebrow">Stage</div>
            <div className="col" style={{ gap: 2, fontSize: 12.5, marginTop: 6 }}>
              <div className="row"><span className="muted grow">Model Profile</span>{st.modelProfile}</div>
              <div className="row"><span className="muted grow">Approvals</span>{st.id === 'implement' ? 'worktree + jailed shell' : st.id === 'plan' ? 'domain docs only' : 'inspect only'}</div>
              <div className="row"><span className="muted grow">Skills</span>{st.id === 'plan' ? '/grill-with-docs …' : st.id === 'implement' ? '/tdd …' : '/code-review'}</div>
            </div>
          </div>
          {st.id === 'plan' && <button className="btn" onClick={toggleProto}>⚗ Prototype…</button>}
          <div>
            <div className="eyebrow">Grimoire</div>
            <ul style={{ paddingLeft: 16, margin: '6px 0', fontSize: 12.5 }}>{grimoire.map((g) => <li key={g}>{g}</li>)}</ul>
          </div>
        </aside>
      )}
      <Overlays />
    </div>
  );
}
