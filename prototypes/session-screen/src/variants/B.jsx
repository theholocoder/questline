// PROTOTYPE, throwaway. Variant B "Journey path": the XP Bar is a vertical quest path on the left.
// Each Level owns a purpose-built workspace: Plan = chat column + Main Quest scroll,
// Implement = Objective list driving the Run view, Review = full-width diff table.
// Sessions live in a header dropdown; Quest Log opens full-screen from the path.
import { useState } from 'react';
import { sessions, stages, runs, quests } from '../data.js';
import { useSession, stageState, shownStage, Icon, Gauge, StageTranscript, Composer, DiffView, Findings, CommitDraft, QuestLog, Overlays, EmptyProject, ProtoPanel, Tag } from '../shared.jsx';

function PathRail({ onLog }) {
  const { s, viewStage } = useSession();
  const viewing = s.viewIdx ?? Math.min(s.stageIdx, 2);
  return (
    <nav className="col" style={{ width: 176, padding: '18px 12px', borderRight: '1px solid var(--border)', background: 'var(--surface)', alignItems: 'center', gap: 0 }}>
      <div className="display" style={{ fontSize: 18, color: 'var(--accent)', marginBottom: 18 }}>Questline</div>
      {stages.map((st, i) => {
        const state = stageState(s, i);
        return (
          <div key={st.id} className="col" style={{ alignItems: 'center', gap: 0 }}>
            {i > 0 && <div style={{ width: 2, height: 28, background: state === 'locked' ? 'var(--border)' : 'var(--accent)' }} />}
            <button onClick={() => state !== 'locked' && viewStage(i)} title={st.label}
              style={{ width: 68, height: 68, borderRadius: '50%', border: `3px ${state === 'locked' ? 'dashed' : 'solid'} ${state === 'locked' ? 'var(--border)' : 'var(--accent)'}`,
                background: state === 'done' ? 'var(--xp-fill)' : state === 'active' ? 'var(--accent-soft)' : 'var(--surface-2)',
                color: state === 'done' ? 'var(--accent-ink)' : 'var(--text)', boxShadow: viewing === i ? '0 0 0 4px var(--accent-soft)' : 'var(--panel-shadow)' }}>
              <div className="display" style={{ fontSize: 11 }}>Lv {st.level}</div>
              <div style={{ fontSize: 20 }}>{state === 'locked' ? '🔒' : <Icon n={st.id} />}</div>
            </button>
            <div className="display" style={{ fontSize: 14, marginTop: 4, fontWeight: viewing === i ? 700 : 500 }}>{st.label}</div>
            {st.checkpoints && (
              <div className="col" style={{ gap: 0, marginTop: 2, alignItems: 'flex-start' }}>
                {st.checkpoints.map((c, ci) => {
                  const hit = state === 'done' || ci < (s.checkpoints ?? 3);
                  return <span key={c} style={{ fontSize: 11, color: hit ? 'var(--ok)' : 'var(--muted)' }}>{hit ? '◆' : '◇'} {c}</span>;
                })}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ width: 2, height: 28, background: s.complete ? 'var(--accent)' : 'var(--border)' }} />
      <div style={{ fontSize: 26, opacity: s.complete ? 1 : .35 }}>🏆</div>
      <span className="grow" />
      <button className="btn ghost" style={{ width: '100%' }} onClick={onLog}><Icon n="quest" /> Quest Log</button>
      <button className="btn ghost" style={{ width: '100%' }}><Icon n="grimoire" /> Grimoire</button>
      <button className="btn ghost" style={{ width: '100%' }}><Icon n="gear" /> Settings</button>
    </nav>
  );
}

function PlanWorkspace() {
  const { s, confirmPlan, toggleProto } = useSession();
  const spec = quests.find((q) => q.id === 'Q-3f2a9c1');
  return (
    <div className="row grow" style={{ alignItems: 'stretch', minHeight: 0, gap: 0 }}>
      <section className="col grow" style={{ padding: '16px 24px', minHeight: 0, alignItems: 'center' }}>
        <div className="col grow" style={{ width: '100%', maxWidth: 720, minHeight: 0 }}>
          <div className="row"><span className="muted grow" style={{ fontSize: 12 }}>Plan Run · Opus · deep</span><Gauge used={142000} window={200000} /><button className="btn ghost sm" onClick={toggleProto}>⚗ Prototype</button></div>
          <div className="scroll grow"><StageTranscript /></div>
          {s.runStatus === 'gate' && <div className="callout ok row"><span className="grow">Gate passed. Confirm the Main Quest and its Objectives to begin Implement.</span><button className="btn primary sm" onClick={confirmPlan}>Confirm Plan</button></div>}
          <Composer />
        </div>
      </section>
      <aside className="parchment col scroll" style={{ width: 320, margin: 16, padding: 16, alignSelf: 'flex-start', maxHeight: 'calc(100% - 32px)' }}>
        <div className="eyebrow" style={{ color: 'inherit' }}>Main Quest · being written</div>
        <div className="display" style={{ fontSize: 20 }}>{spec.title}</div>
        <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{(s.checkpoints ?? 3) >= 2 ? spec.body : <i>The scribe awaits the end of the grilling…</i>}</div>
        <div className="sep" />
        <div className="eyebrow" style={{ color: 'inherit' }}>Objectives</div>
        {(s.checkpoints ?? 3) >= 3 ? quests.filter((q) => q.parent === spec.id).map((q) => <div key={q.id}>○ {q.title}</div>) : <i style={{ fontSize: 13 }}>Not cut yet.</i>}
      </aside>
      <ProtoPanel />
    </div>
  );
}

function ImplementWorkspace() {
  const { openQuest } = useSession();
  const objectives = quests.filter((q) => q.parent === 'Q-3f2a9c1');
  const [sel, setSel] = useState('Q-b2c93f0');
  const q = objectives.find((o) => o.id === sel);
  const run = runs.find((r) => r.title.includes(sel));
  return (
    <div className="row grow" style={{ alignItems: 'stretch', minHeight: 0, gap: 0 }}>
      <aside className="col" style={{ width: 300, borderRight: '1px solid var(--border)', padding: 14 }}>
        <div className="eyebrow">Objectives · 1 of 4 done</div>
        {objectives.map((o, i) => {
          const st = o.status === 'closed' ? 'done' : o.tags.includes('in-progress') ? 'active' : o.blockedBy ? 'blocked' : 'ready';
          return (
            <button key={o.id} onClick={() => setSel(o.id)} className="panel" style={{ textAlign: 'left', padding: 10, borderColor: sel === o.id ? 'var(--accent)' : undefined, opacity: st === 'done' ? .65 : 1 }}>
              <div className="row"><span className="display" style={{ fontSize: 12, color: 'var(--accent)' }}>{i + 1}</span><span className="grow" style={{ fontWeight: 500 }}>{o.title}</span></div>
              <div className="row" style={{ marginTop: 4 }}>
                <span className={`chip ${st === 'done' ? 'ok' : st === 'active' ? 'warn' : ''}`}>{st === 'blocked' ? '⛓ blocked' : st}</span>
                {st === 'active' && <span className="muted" style={{ fontSize: 11 }}>review round 0/3</span>}
              </div>
            </button>
          );
        })}
        <div className="muted" style={{ fontSize: 12 }}>One Objective at a time. Implement advances by itself when all are closed.</div>
      </aside>
      <section className="col grow" style={{ padding: 16, minHeight: 0 }}>
        <div className="row">
          <h2 className="display grow" style={{ margin: 0, fontSize: 18 }}>{q.title}</h2>
          <button className="btn ghost sm" onClick={() => openQuest(q.id)}>Details</button>
          {run && <Gauge used={run.tokens} window={run.window} />}
        </div>
        {run ? (
          <>
            <div className="scroll grow"><StageTranscript /></div>
            <div className="row" style={{ fontSize: 12 }}><span className="muted grow">Next: checks <code>pnpm test</code>, <code>pnpm lint</code> → code-review child Run</span></div>
            <Composer />
          </>
        ) : (
          <div className="muted" style={{ fontStyle: 'italic', textAlign: 'center', marginTop: 60 }}>
            {q.status === 'closed' ? 'Objective complete. Its Run transcript is kept here.' : 'This Objective has not been taken yet.'}
          </div>
        )}
      </section>
    </div>
  );
}

function ReviewWorkspace() {
  const { s, openDialog } = useSession();
  return (
    <div className="row grow" style={{ alignItems: 'stretch', minHeight: 0, gap: 0 }}>
      <section className="col grow scroll" style={{ padding: 16 }}>
        <div className="row"><span className="display grow" style={{ fontSize: 18 }}>Changes on feat/dark-mode vs main</span><span className="muted" style={{ fontSize: 12 }}>click a line to comment</span></div>
        <DiffView />
      </section>
      <aside className="col scroll" style={{ width: 360, borderLeft: '1px solid var(--border)', padding: 14 }}>
        <div className="eyebrow">Review Run findings</div>
        <Findings />
        <div className="sep" />
        <div className="eyebrow">Commit draft</div>
        <CommitDraft />
        {!s.complete && <button className="btn primary" disabled={s.accepted.length > 0} onClick={() => openDialog('complete')}>{s.accepted.length ? 'Open Objectives remain' : 'Complete Session'}</button>}
        <div className="sep" />
        <div className="eyebrow">Ask the reviewer</div>
        <Composer placeholder="Ask about the diff…" />
      </aside>
    </div>
  );
}

export function VariantB() {
  const { s, openDialog } = useSession();
  const [log, setLog] = useState(false);
  const st = shownStage(s);
  return (
    <div className="row" style={{ height: '100%', alignItems: 'stretch', gap: 0 }}>
      <PathRail onLog={() => setLog(true)} />
      <main className="col grow" style={{ minHeight: 0, gap: 0 }}>
        <header className="row" style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <select defaultValue="s1" style={{ background: 'transparent', color: 'var(--text)', border: 0, fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>
            {sessions.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
          </select>
          <span className="chip mono">feat/dark-mode ← main</span>
          <span className="muted" style={{ fontSize: 12 }}>questline</span>
          <span className="grow" />
          <span className="display" style={{ fontSize: 14 }}>Lv {st.level} · {st.label}</span>
          {s.stageIdx === 1 && <button className="btn sm" onClick={() => openDialog('rewind')}>↶ Rewind</button>}
          {!s.complete && <button className="btn sm danger" onClick={() => openDialog('abandon')}>Abandon</button>}
        </header>
        {s.empty ? <EmptyProject /> : st.id === 'plan' ? <PlanWorkspace /> : st.id === 'implement' ? <ImplementWorkspace /> : <ReviewWorkspace />}
      </main>
      {log && (
        <div className="backdrop" style={{ placeItems: 'stretch', padding: 24 }} onClick={() => setLog(false)}>
          <div className="panel" style={{ padding: 16, height: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn ghost sm" onClick={() => setLog(false)}>✕ Close</button></div>
            <div style={{ height: 'calc(100% - 30px)' }}><QuestLog /></div>
          </div>
        </div>
      )}
      <Overlays />
    </div>
  );
}
