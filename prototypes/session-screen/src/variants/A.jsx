// PROTOTYPE, throwaway. Workbench v2 (picked from round 1): A's shell + C's XP Bar + B's Objectives column.
// Runs, Stage info and Grimoire moved off-screen into header popovers.
import { useState } from 'react';
import { projects, sessions, stages, runs, grimoire, quests } from '../data.js';
import { useSession, stageState, shownStage, Icon, Gauge, StageTranscript, Composer, DiffView, Findings, CommitDraft, RunList, QuestLog, Overlays, EmptyProject, ProtoPanel } from '../shared.jsx';

// ---------- XP Bar (from variant C) ----------
function XpBar() {
  const { s, viewStage } = useSession();
  const planPart = s.stageIdx > 0 ? 1 : (s.checkpoints ?? 0) / 3;
  const pct = s.complete ? 100 : s.stageIdx === 0 ? planPart * 33.3 : s.stageIdx === 1 ? 33.3 + 0.25 * 33.3 : 76;
  return (
    <div className="col" style={{ gap: 5 }}>
      <div style={{ position: 'relative', height: 14, background: 'var(--xp-track)', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--parchment-edge)' }}>
        <div style={{ width: pct + '%', height: '100%', background: 'var(--xp-fill)' }} />
        {[33.3, 66.6].map((x) => <div key={x} style={{ position: 'absolute', left: x + '%', top: 0, bottom: 0, width: 2, background: 'var(--surface)' }} />)}
      </div>
      <div className="row" style={{ gap: 0 }}>
        {stages.map((st, i) => {
          const state = stageState(s, i);
          const viewing = (s.viewIdx ?? s.stageIdx) === i;
          return (
            <button key={st.id} className="row" onClick={() => state !== 'locked' && viewStage(i)}
              style={{ flex: 1, gap: 6, opacity: state === 'locked' ? .5 : 1, background: 'none', border: 0, padding: 0, cursor: state === 'locked' ? 'default' : 'pointer', textAlign: 'left' }}>
              <Icon n={state === 'locked' ? 'lock' : st.id} style={{ color: 'var(--accent)' }} />
              <span className="display" style={{ fontSize: 15, textDecoration: viewing && state !== 'locked' ? 'underline' : 'none', textUnderlineOffset: 4 }}>Lv {st.level} · {st.label}</span>
              {state === 'done' && <Icon n="check" style={{ color: 'var(--ok)' }} />}
              {state === 'active' && <span className="chip accent">current</span>}
              {st.checkpoints && state !== 'locked' && (
                <span className="row" style={{ gap: 6 }}>
                  {st.checkpoints.map((c, ci) => {
                    const hit = state === 'done' || ci < (s.checkpoints ?? 3);
                    return <span key={c} style={{ fontSize: 11, color: hit ? 'var(--ok)' : 'var(--muted)' }}>{hit ? '◆' : '◇'} {c}</span>;
                  })}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Objectives column (from variant B) ----------
function ObjectivesColumn({ sel, onSel }) {
  const { s, openQuest } = useSession();
  const spec = quests.find((q) => q.id === 'Q-3f2a9c1');
  const objectives = quests.filter((q) => q.parent === spec.id);
  const cut = s.stageIdx > 0 || (s.checkpoints ?? 3) >= 3;
  const done = objectives.filter((o) => o.status === 'closed').length;
  return (
    <aside className="col scroll" style={{ width: 290, borderRight: '1px solid var(--border)', padding: 14, background: 'var(--surface-2)' }}>
      <div className="eyebrow">Main Quest</div>
      <div className="parchment" style={{ padding: 12, cursor: 'pointer' }} onClick={() => openQuest(spec.id)}>
        <div className="display" style={{ fontSize: 18 }}><Icon n="main" /> {spec.title}</div>
        <div className="dropcap" style={{ fontSize: 12.5, marginTop: 4 }}>
          {(s.stageIdx > 0 || (s.checkpoints ?? 3) >= 2) ? 'Users switch between System, Light and Dark from Settings. Follows the OS; dark is the fallback.' : <i>The scribe awaits the end of the grilling…</i>}
        </div>
      </div>
      <div className="row" style={{ marginTop: 8 }}><span className="eyebrow grow">Objectives</span>{cut && <span className="muted" style={{ fontSize: 11 }}>{done} of {objectives.length} done</span>}</div>
      {!cut && <div className="muted" style={{ fontStyle: 'italic', fontSize: 12.5 }}>Not cut yet. They appear here once Plan reaches “Tickets cut”.</div>}
      {cut && objectives.map((o, i) => {
        const st = o.status === 'closed' ? 'done' : o.tags.includes('in-progress') ? 'active' : o.blockedBy ? 'blocked' : 'ready';
        return (
          <button key={o.id} onClick={() => onSel(o.id)} className="panel" style={{ textAlign: 'left', padding: 10, borderColor: sel === o.id ? 'var(--accent)' : undefined, boxShadow: sel === o.id ? '0 0 0 1px var(--accent)' : undefined, opacity: st === 'done' ? .65 : 1 }}>
            <div className="row"><span className="display" style={{ fontSize: 13, color: 'var(--accent)' }}>{i + 1}</span><span className="grow" style={{ fontWeight: 500 }}>{o.title}</span></div>
            <div className="row" style={{ marginTop: 4 }}>
              <span className={`chip ${st === 'done' ? 'ok' : st === 'active' ? 'warn' : ''}`}>{st === 'blocked' ? <><Icon n="blocked" /> blocked</> : st}</span>
              {st === 'active' && <span className="muted" style={{ fontSize: 11 }}>review round 0/3</span>}
            </div>
          </button>
        );
      })}
      {cut && s.accepted.length > 0 && <div className="chip warn" style={{ alignSelf: 'flex-start' }}>+{s.accepted.length} from Review</div>}
      {cut && <div className="muted" style={{ fontSize: 12 }}>One Objective at a time. Implement advances by itself when all are closed.</div>}
    </aside>
  );
}

// ---------- Header popovers ----------
function Popover({ title, onClose, children }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={onClose} />
      <div className="panel col" style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', width: 320, padding: 14, zIndex: 31, boxShadow: '0 8px 28px rgba(0,0,0,.18)' }}>
        <div className="row"><strong className="display grow" style={{ fontSize: 16 }}>{title}</strong><button className="btn ghost sm" onClick={onClose}>✕</button></div>
        {children}
      </div>
    </>
  );
}

function IconButton({ n, label, onClick, on }) {
  return <button className="btn ghost sm" title={label} aria-label={label} onClick={onClick} style={{ fontSize: 16, padding: '4px 7px', borderColor: on ? 'var(--accent)' : undefined }}><Icon n={n} /></button>;
}

function Toolbox() {
  const { s } = useSession();
  const st = shownStage(s);
  const [open, setOpen] = useState(null);
  const toggle = (k) => setOpen(open === k ? null : k);
  return (
    <div className="row" style={{ position: 'relative', gap: 2 }}>
      <IconButton n="runs" label="Runs" on={open === 'runs'} onClick={() => toggle('runs')} />
      <IconButton n="info" label="Stage details" on={open === 'stage'} onClick={() => toggle('stage')} />
      <IconButton n="grimoire" label="Grimoire" on={open === 'grim'} onClick={() => toggle('grim')} />
      {open === 'runs' && <Popover title="Runs" onClose={() => setOpen(null)}><RunList /></Popover>}
      {open === 'stage' && (
        <Popover title={`Lv ${st.level} · ${st.label}`} onClose={() => setOpen(null)}>
          <div className="col" style={{ gap: 4, fontSize: 13 }}>
            <div className="row"><span className="muted grow">Model Profile</span>{st.modelProfile}</div>
            <div className="row"><span className="muted grow">Approvals</span>{st.id === 'implement' ? 'worktree + jailed shell' : st.id === 'plan' ? 'domain docs only' : 'inspect only'}</div>
            <div className="row"><span className="muted grow">Skills</span>{st.id === 'plan' ? '/grill-with-docs, /to-spec, /to-tickets' : st.id === 'implement' ? '/tdd' : '/code-review'}</div>
            <div className="row"><span className="muted grow">Gate</span>{st.id === 'implement' ? 'all Objectives closed · auto' : 'user confirms'}</div>
          </div>
        </Popover>
      )}
      {open === 'grim' && (
        <Popover title="Grimoire" onClose={() => setOpen(null)}>
          <ul style={{ paddingLeft: 16, margin: 0, fontSize: 13 }}>{grimoire.map((g) => <li key={g}>{g}</li>)}</ul>
          <button className="btn sm" style={{ alignSelf: 'flex-start' }}>Open Grimoire</button>
        </Popover>
      )}
    </div>
  );
}

export function VariantA() {
  const { s, openDialog, toggleProto, confirmPlan } = useSession();
  const st = shownStage(s);
  const [tab, setTab] = useState(null);
  const [sel, setSel] = useState('Q-b2c93f0');
  const current = tab ?? (st.id === 'review' ? 'review' : 'run');
  const selRun = runs.find((r) => r.title.includes(sel));
  const selQuest = quests.find((q) => q.id === sel);
  const runLabel = st.id === 'plan' ? 'Plan' : st.id === 'review' ? 'Review' : selQuest.title;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', height: '100%' }}>
      {/* Sidebar */}
      <nav className="col" style={{ borderRight: '1px solid var(--border)', padding: 12, background: 'var(--surface)', gap: 14 }}>
        <div className="display" style={{ fontSize: 22, color: 'var(--accent)' }}><Icon n="logo" /> Questline</div>
        <div>
          <div className="eyebrow">Projects</div>
          {projects.map((p) => <div key={p.name} className="row" style={{ padding: '3px 6px', borderRadius: 4, background: p.active ? 'var(--accent-soft)' : undefined, fontWeight: p.active ? 600 : 400 }}>{p.name}</div>)}
        </div>
        <div>
          <div className="row"><span className="eyebrow grow">Sessions</span><button className="btn ghost sm">+</button></div>
          {!s.empty && sessions.map((x) => (
            <div key={x.id} className="row" style={{ padding: '4px 6px', borderRadius: 4, background: x.id === 's1' ? 'var(--surface-2)' : undefined, opacity: x.archived ? .5 : 1 }}>
              <span className="grow" style={{ fontSize: 13 }}>{x.title}</span>
              <span className="muted" style={{ fontSize: 11 }}>{x.stage === 'complete' ? <Icon n="check" /> : `Lv ${stages.findIndex((t) => t.id === x.stage) + 1}`}</span>
            </div>
          ))}
          {s.empty && <div className="muted" style={{ fontStyle: 'italic', fontSize: 12 }}>No Sessions yet.</div>}
        </div>
        <span className="grow" />
        <button className="btn ghost" style={{ textAlign: 'left' }} onClick={() => setTab('log')}><Icon n="quest" /> Quest Log</button>
        <button className="btn ghost" style={{ textAlign: 'left' }}><Icon n="grimoire" /> Grimoire</button>
        <button className="btn ghost" style={{ textAlign: 'left' }}><Icon n="gear" /> Settings</button>
      </nav>

      {s.empty ? <EmptyProject /> : (
        <main className="col" style={{ minWidth: 0, minHeight: 0, gap: 0 }}>
          <header className="col" style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', gap: 12, background: 'var(--surface)' }}>
            <div className="row">
              <h1 className="display" style={{ margin: 0, fontSize: 26 }}>Dark mode toggle</h1>
              <span className="chip" style={{ fontFamily: 'var(--font-mono)' }}>feat/dark-mode ← main</span>
              <span className="grow" />
              <Toolbox />
              <span style={{ width: 1, height: 20, background: 'var(--border)' }} />
              {st.id === 'plan' && !s.complete && <button className="btn sm" onClick={toggleProto}><Icon n="flask" /> Prototype</button>}
              {s.stageIdx === 1 && <button className="btn sm" onClick={() => openDialog('rewind')}><Icon n="rewind" /> Rewind to Plan</button>}
              {!s.complete && <button className="btn sm danger" onClick={() => openDialog('abandon')}><Icon n="flag" /> Abandon</button>}
              {s.stageIdx === 2 && !s.complete && <button className="btn primary sm" onClick={() => openDialog('complete')}><Icon n="trophy" /> Complete</button>}
            </div>
            <XpBar />
          </header>

          <div className="row grow" style={{ minHeight: 0, alignItems: 'stretch', gap: 0 }}>
            <ObjectivesColumn sel={sel} onSel={(id) => { setSel(id); setTab('run'); }} />
            <section className="col grow" style={{ minWidth: 0, minHeight: 0, gap: 0 }}>
              <div className="row" style={{ padding: '0 16px', borderBottom: '1px solid var(--border)', gap: 0 }}>
                {[['run', `Run · ${runLabel}`], ['review', 'Review'], ['log', 'Quest Log']].map(([k, l]) => (
                  <button key={k} className="btn ghost" onClick={() => setTab(k)} style={{ borderRadius: 0, borderBottom: current === k ? '2px solid var(--accent)' : '2px solid transparent' }}>{l}</button>
                ))}
                <span className="grow" />
                {current === 'run' && <Gauge used={st.id === 'plan' ? 142000 : selRun?.tokens ?? 0} window={200000} />}
                {current === 'run' && <button className="btn ghost sm">Compact</button>}
                {current === 'run' && <button className="btn ghost sm">Clear</button>}
              </div>
              <div className="col grow" style={{ padding: 16, minHeight: 0 }}>
                {current === 'run' && (st.id !== 'implement' || selRun ? (
                  <>
                    <div className="scroll grow" style={{ maxWidth: 860 }}><StageTranscript /></div>
                    {st.id === 'plan' && s.runStatus === 'gate' && (
                      <div className="callout ok row"><span className="grow">Plan gate passed: Spec written, 4 Objectives cut. Confirm to start Implement.</span><button className="btn primary sm" onClick={confirmPlan}>Confirm Plan</button></div>
                    )}
                    {st.id === 'implement' && <div className="muted" style={{ fontSize: 12 }}>Next: checks <code>pnpm test</code>, <code>pnpm lint</code> → code-review child Run</div>}
                    <div style={{ maxWidth: 860 }}><Composer /></div>
                  </>
                ) : (
                  <div className="muted" style={{ fontStyle: 'italic', textAlign: 'center', marginTop: 60 }}>
                    {selQuest.status === 'closed' ? 'Objective complete. Its Run transcript is kept here.' : 'This Objective has not been taken yet.'}
                  </div>
                ))}
                {current === 'review' && (s.stageIdx >= 2 ? (
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
              </div>
            </section>
            <ProtoPanel />
          </div>
        </main>
      )}
      <Overlays />
    </div>
  );
}
