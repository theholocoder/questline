// PROTOTYPE, throwaway. Shared fake state + small widgets. Layouts live in variants/.
import { createContext, useContext, useState } from 'react';
import { quests, columns, sessions, stages, tags, transcript, planTranscript, reviewFiles, reviewFindings, runs } from './data.js';

// ---------- Fake session state ----------
export const scenarios = {
  plan: { label: 'Plan · grilling', stageIdx: 0, checkpoints: 1, runStatus: 'running' },
  planDone: { label: 'Plan · awaiting confirm', stageIdx: 0, checkpoints: 3, runStatus: 'gate' },
  implement: { label: 'Implement · running', stageIdx: 1, runStatus: 'approval' },
  errored: { label: 'Implement · Run errored', stageIdx: 1, runStatus: 'errored' },
  levelUp: { label: 'Level gained → Review', stageIdx: 2, runStatus: 'idle', celebrate: 'Level 3 reached · Review. The Objectives are done; time to inspect the spoils.' },
  review: { label: 'Review', stageIdx: 2, runStatus: 'idle' },
  complete: { label: 'Session complete', stageIdx: 3, runStatus: 'idle', complete: true, celebrate: 'Quest fulfilled. The Main Quest is complete and the branch awaits your push.' },
  empty: { label: 'Empty Project', empty: true, stageIdx: 0, runStatus: 'idle' },
};

const Ctx = createContext(null);

export function SessionProvider({ scenario, children }) {
  // mounted with key={scenario}, so switching scenario resets everything
  const [s, setState] = useState(() => ({
    ...(scenarios[scenario] ?? scenarios.implement),
    dialog: null, drawer: null, protoPanel: false, accepted: [], viewIdx: null, view: 'session', sessionId: 's1', comments: {},
  }));
  const set = (patch) => setState((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));
  const actions = {
    openDialog: (d) => set({ dialog: d }),
    close: () => set({ dialog: null, drawer: null }),
    openQuest: (id) => set({ drawer: id }),
    view: (v) => set({ view: v }),
    viewStage: (i) => set({ viewIdx: i }),
    toggleProto: () => set((p) => ({ protoPanel: !p.protoPanel })),
    approve: () => set({ runStatus: 'running' }),
    deny: () => set({ runStatus: 'running' }),
    recover: () => set({ runStatus: 'running' }),
    confirmPlan: () => set({ stageIdx: 1, runStatus: 'running', celebrate: 'Level 2 reached · Implement. The party marches on.', viewIdx: null }),
    rewind: () => set({ stageIdx: 0, runStatus: 'running', checkpoints: 3, dialog: null, viewIdx: null, celebrate: null }),
    complete: () => set({ stageIdx: 3, complete: true, dialog: null, celebrate: scenarios.complete.celebrate }),
    abandon: () => set({ dialog: null, abandoned: true }),
    dismissCelebrate: () => set({ celebrate: null }),
    accept: (id) => set((p) => ({ accepted: [...p.accepted, id] })),
    comment: (k, t) => set((p) => ({ comments: { ...p.comments, [k]: t } })),
    pickSession: (id) => set({ sessionId: id }),
  };
  return <Ctx.Provider value={{ s, ...actions }}>{children}</Ctx.Provider>;
}
export const useSession = () => useContext(Ctx);

export function stageState(s, i) {
  if (s.complete || i < s.stageIdx) return 'done';
  if (i === s.stageIdx) return 'active';
  return 'locked';
}
export const shownStage = (s) => stages[Math.min(s.viewIdx ?? s.stageIdx, 2)];

export { Icon } from './icons.jsx';
import { Icon } from './icons.jsx';

// ---------- Widgets ----------
export function Gauge({ used, window: w, label = true }) {
  const pct = Math.round((used / w) * 100);
  const tone = pct > 80 ? 'danger' : pct > 55 ? 'warn' : '';
  return (
    <span className="gauge" title={`${used.toLocaleString()} / ${w.toLocaleString()} tokens`}>
      <span className="gauge-track"><span className={`gauge-fill ${tone}`} style={{ width: pct + '%', display: 'block' }} /></span>
      {label && <span>{pct}% ctx</span>}
    </span>
  );
}

export function Tag({ t }) {
  const d = tags[t] ?? { label: t, tone: '' };
  return <span className={`chip ${d.tone}`}>{d.label}</span>;
}

export function Transcript({ items }) {
  const { s, approve, deny, recover } = useSession();
  return (
    <div className="col" style={{ gap: 2 }}>
      {items.map((m, i) => {
        if (m.kind === 'tool') return (
          <div key={i} className={`tool ${m.failed ? 'failed' : ''}`}>
            <span className="name">{m.name}</span><span className="grow">{m.arg}</span><span className="res">{m.result}</span>
          </div>
        );
        if (m.kind === 'approval') return s.runStatus === 'approval' ? (
          <div key={i} className="callout" style={{ margin: '8px 0' }}>
            <div className="row"><strong className="grow">Approval needed</strong><span className="muted" style={{ fontSize: 12 }}>{m.reason}</span></div>
            <pre style={{ margin: '6px 0' }}>{m.command}</pre>
            <div className="row"><button className="btn primary sm" onClick={approve}>Approve once</button><button className="btn sm" onClick={approve}>Always for this Session</button><button className="btn sm danger" onClick={deny}>Deny</button></div>
          </div>
        ) : <div key={i} className="tool"><span className="name">shell</span><span className="grow">{m.command}</span><span className="res">approved</span></div>;
        if (m.kind === 'ask') return (
          <div key={i} className="callout ok" style={{ margin: '8px 0' }}>
            <strong>The agent asks</strong>
            <div style={{ margin: '4px 0 8px' }}>{m.text}</div>
            <div className="row">{m.options.map((o) => <button key={o} className="btn sm">{o}</button>)}<button className="btn sm ghost">Answer freely…</button></div>
          </div>
        );
        return <div key={i} className={`msg ${m.kind}`}><div className="bubble">{m.text}</div></div>;
      })}
      {s.runStatus === 'errored' && (
        <div className="callout danger" style={{ marginTop: 8 }}>
          <strong>Run errored</strong> <span className="muted">· provider returned 529 overloaded after 3 retries. The worktree is untouched.</span>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn primary sm" onClick={recover}>Resume</button>
            <button className="btn sm" onClick={recover}>Retry last turn</button>
            <button className="btn sm" onClick={recover}>Start a fresh Run</button>
          </div>
        </div>
      )}
      {s.runStatus === 'running' && <div className="tool"><span className="name">…</span><span className="muted">working</span></div>}
    </div>
  );
}

export function Composer({ placeholder = 'Steer the agent… (/ for Skills)' }) {
  const { s } = useSession();
  return (
    <div className="composer">
      <textarea rows={2} placeholder={placeholder} />
      <div className="col" style={{ gap: 4 }}>
        {s.runStatus === 'running' ? <button className="btn sm danger">Abort</button> : null}
        <button className="btn primary sm">Send</button>
      </div>
    </div>
  );
}

export function StageTranscript() {
  const { s } = useSession();
  const st = shownStage(s);
  if (st.id === 'plan') return <Transcript items={planTranscript} />;
  return <Transcript items={transcript} />;
}

export function DiffView({ files = reviewFiles }) {
  const { s, comment } = useSession();
  const [editing, setEditing] = useState(null);
  return (
    <div className="col" style={{ gap: 12 }}>
      {files.map((f) => (
        <div key={f.path} className="diff">
          <div className="row" style={{ padding: '6px 10px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-ui)' }}>
            <span className="mono grow">{f.path}</span><span style={{ color: 'var(--ok)' }}>+{f.add}</span><span style={{ color: 'var(--danger)' }}>−{f.del}</span>
          </div>
          {f.hunks.length === 0 && <div className="hunk">Collapsed · test file</div>}
          {f.hunks.map((h, hi) => (
            <div key={hi}>
              <div className="hunk">{h.h}</div>
              {h.lines.map(([sign, text], li) => {
                const k = `${f.path}:${hi}:${li}`;
                const kind = sign === '+' ? 'add' : sign === '-' ? 'del' : '';
                return (
                  <div key={li}>
                    <div className={`ln ${kind}`} onClick={() => setEditing(k)} title="Click to comment"><span className="sign">{sign}</span>{text}</div>
                    {s.comments[k] && <div className="comment-inline callout ok">You: {s.comments[k]}</div>}
                    {editing === k && (
                      <div className="comment-inline row">
                        <input autoFocus className="grow" placeholder="Comment for the agent…" style={{ padding: 4, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4 }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { comment(k, e.currentTarget.value); setEditing(null); } if (e.key === 'Escape') setEditing(null); }} />
                        <span className="muted" style={{ fontSize: 11 }}>Enter to add</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function Findings() {
  const { s, accept } = useSession();
  return (
    <div className="col">
      {reviewFindings.map((f) => (
        <div key={f.id} className="panel" style={{ padding: 10 }}>
          <div className="row"><span className={`chip ${f.severity === 'major' ? 'danger' : 'warn'}`}>{f.severity}</span><span className="mono muted grow" style={{ fontSize: 11 }}>{f.file.split('/').pop()}:{f.line}</span></div>
          <div style={{ margin: '6px 0' }}>{f.text}</div>
          {s.accepted.includes(f.id)
            ? <span className="chip ok">Became an Objective · Implement will rerun</span>
            : <div className="row"><button className="btn sm primary" onClick={() => accept(f.id)}>Accept → new Objective</button><button className="btn sm ghost">Dismiss</button></div>}
        </div>
      ))}
    </div>
  );
}

export function CommitDraft() {
  return (
    <div className="col">
      <input defaultValue="feat: add theme setting with System / Light / Dark" style={{ padding: 6, fontFamily: 'var(--font-mono)', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4 }} />
      <textarea rows={4} defaultValue={'Replace the boolean darkMode setting with a theme enum persisted in the\nLocal store. System follows prefers-color-scheme.'} style={{ padding: 6, fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4 }} />
    </div>
  );
}

export function Objectives({ compact }) {
  const { openQuest } = useSession();
  const list = quests.filter((q) => q.parent === 'Q-3f2a9c1');
  return (
    <div className="col" style={{ gap: compact ? 4 : 8 }}>
      {list.map((q) => {
        const st = q.status === 'closed' ? 'done' : q.tags.includes('in-progress') ? 'active' : q.blockedBy ? 'blocked' : 'ready';
        return (
          <div key={q.id} className="row" style={{ cursor: 'pointer', opacity: st === 'done' ? .6 : 1 }} onClick={() => openQuest(q.id)}>
            <span style={{ width: 16, color: st === 'done' ? 'var(--ok)' : st === 'active' ? 'var(--warn)' : 'var(--muted)' }}>{st === 'done' ? '✓' : st === 'active' ? '▸' : st === 'blocked' ? '⛓' : '○'}</span>
            <span className="grow" style={{ textDecoration: st === 'done' ? 'line-through' : 'none' }}>{q.title}</span>
            {!compact && <span className="mono muted" style={{ fontSize: 11 }}>{q.id}</span>}
          </div>
        );
      })}
    </div>
  );
}

export function RunList() {
  return (
    <div className="col" style={{ gap: 4 }}>
      {runs.map((r) => (
        <div key={r.id} className="row" style={{ paddingLeft: r.parent ? 16 : 0, fontSize: 12.5 }}>
          <span style={{ color: r.status === 'running' ? 'var(--warn)' : r.status === 'done' ? 'var(--ok)' : 'var(--muted)' }}>●</span>
          <span className="grow">{r.parent ? '↳ ' : ''}{r.title}</span>
          {r.tokens > 0 && <Gauge used={r.tokens} window={r.window} label={false} />}
        </div>
      ))}
    </div>
  );
}

// ---------- Quest Log (own screen; each variant decides how to reach it) ----------
export function QuestLog({ dense }) {
  const { openQuest } = useSession();
  const [filter, setFilter] = useState('s1');
  const [showClosed, setShowClosed] = useState(false);
  const visible = quests.filter((q) => (filter === 'all' || q.session === filter) && (showClosed || q.status === 'open'));
  return (
    <div className="col" style={{ height: '100%', gap: 12 }}>
      <div className="row">
        <h2 className="display" style={{ margin: 0, fontSize: dense ? 18 : 22 }}><Icon n="quest" /> Quest Log</h2>
        <span className="grow" />
        <label className="muted" style={{ fontSize: 12 }}>Session&nbsp;
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 3 }}>
            <option value="all">All Sessions</option>
            {sessions.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
          </select>
        </label>
        <label className="muted row" style={{ fontSize: 12, gap: 4 }}><input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />Show closed</label>
        <button className="btn sm">+ Quest</button>
      </div>
      <div className="row grow" style={{ alignItems: 'stretch', gap: 10, overflowX: 'auto', minHeight: 0 }}>
        {columns.map((c) => {
          const items = visible.filter((q) => c.tag ? q.tags.includes(c.tag) : !columns.some((cc) => cc.tag && q.tags.includes(cc.tag)));
          return (
            <div key={c.label} className="col" style={{ minWidth: dense ? 190 : 230, flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 8 }}>
              <div className="row"><strong className="display grow" style={{ fontSize: 14 }}>{c.label}</strong><span className="muted" style={{ fontSize: 11 }}>{c.tag ? `#${c.tag}` : ''}</span><span className="chip">{items.length}</span></div>
              <div className="col scroll">
                {items.length === 0 && <div className="muted" style={{ fontStyle: 'italic', fontSize: 12.5, textAlign: 'center', padding: 16 }}>No adventurer has taken up this charge.</div>}
                {items.map((q) => <QuestCard key={q.id} q={q} onClick={() => openQuest(q.id)} />)}
              </div>
            </div>
          );
        })}
        <button className="btn ghost" style={{ alignSelf: 'flex-start', whiteSpace: 'nowrap' }}>+ Column</button>
      </div>
    </div>
  );
}

export function QuestCard({ q, onClick }) {
  const parent = q.parent && quests.find((p) => p.id === q.parent);
  return (
    <div className={`panel quest-card ${q.status}`} onClick={onClick}>
      <div className="row"><span className="qid grow">{q.id}</span>{q.blockedBy && <span className="chip warn"><Icon n="blocked" /> blocked</span>}{q.status === 'closed' && <span className="chip">closed</span>}</div>
      <div style={{ fontWeight: 500 }}>{q.tags.includes('spec') && <Icon n="main" style={{ color: 'var(--accent)' }} />}{q.title}</div>
      {parent && <div className="muted" style={{ fontSize: 11.5 }}>↳ {parent.title}</div>}
      <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>{q.tags.map((t) => <Tag key={t} t={t} />)}</div>
    </div>
  );
}

// ---------- Overlays ----------
export function Overlays() {
  const { s, close, complete, abandon, rewind, dismissCelebrate } = useSession();
  const q = s.drawer && quests.find((x) => x.id === s.drawer);
  return (
    <>
      {q && (
        <>
          <div className="backdrop" style={{ background: 'rgba(0,0,0,.2)' }} onClick={close} />
          <aside className="panel drawer">
            <div className="row"><span className="mono muted grow">{q.id}</span><button className="btn ghost sm" onClick={close}>✕</button></div>
            <h2 className="display" style={{ margin: 0 }}>{q.title}</h2>
            <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>{q.status === 'open' ? <span className="chip ok">open</span> : <span className="chip">closed</span>}{q.tags.map((t) => <Tag key={t} t={t} />)}<button className="btn ghost sm">+ tag</button></div>
            {q.parent && <div className="muted">Parent: <span className="mono">{q.parent}</span></div>}
            {q.blockedBy && <div className="muted">Blocked by: <span className="mono">{q.blockedBy.join(', ')}</span></div>}
            <div className="sep" />
            <div style={{ whiteSpace: 'pre-wrap' }}>{q.body || <span className="muted">No description.</span>}</div>
            <div className="sep" />
            <div className="eyebrow">Comments</div>
            {(q.comments ?? []).map((c, i) => <div key={i} className="panel" style={{ padding: 8 }}><strong>{c.who}</strong> · {c.text}</div>)}
            <textarea rows={2} placeholder="Comment…" style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 6 }} />
            <span className="grow" />
            <div className="row"><button className="btn sm">Close as done</button><button className="btn sm">Close as won't do</button><span className="grow" /><button className="btn sm danger">Delete</button></div>
          </aside>
        </>
      )}
      {s.dialog === 'complete' && (
        <div className="backdrop" onClick={close}>
          <div className="panel dialog" onClick={(e) => e.stopPropagation()}>
            <h2 className="display" style={{ margin: 0 }}>Complete Session</h2>
            <div className="muted">Makes one commit on <span className="mono">feat/dark-mode</span>, then removes the worktree. Questline never pushes or merges.</div>
            <CommitDraft />
            <div className="callout">Worktree is clean. 3 files changed, +61 −14.</div>
            <div className="row"><span className="grow" /><button className="btn" onClick={close}>Cancel</button><button className="btn primary" onClick={complete}>Commit &amp; complete</button></div>
          </div>
        </div>
      )}
      {s.dialog === 'abandon' && (
        <div className="backdrop" onClick={close}>
          <div className="panel dialog" onClick={(e) => e.stopPropagation()}>
            <h2 className="display" style={{ margin: 0 }}>Abandon Session</h2>
            <div>Aborts the running Run and removes the worktree. No XP is gained.</div>
            <label className="row"><input type="checkbox" /> Also delete branch <span className="mono">feat/dark-mode</span></label>
            <div className="row"><span className="grow" /><button className="btn" onClick={close}>Keep going</button><button className="btn primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={abandon}>Abandon</button></div>
          </div>
        </div>
      )}
      {s.dialog === 'rewind' && (
        <div className="backdrop" onClick={close}>
          <div className="panel dialog" onClick={(e) => e.stopPropagation()}>
            <h2 className="display" style={{ margin: 0 }}>Rewind to Plan</h2>
            <div>The Plan Run resumes with your note. The Implement level is taken back; worktree changes stay.</div>
            <textarea rows={3} placeholder="What came up? e.g. 'Toggle also needs to live in the title bar'" style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: 6 }} />
            <div className="row"><span className="grow" /><button className="btn" onClick={close}>Cancel</button><button className="btn primary" onClick={rewind}>Rewind</button></div>
          </div>
        </div>
      )}
      {s.celebrate && (
        <div className="backdrop" onClick={dismissCelebrate}>
          <div className="parchment dialog banner-celebrate" style={{ boxShadow: 'var(--panel-shadow)' }}>
            <div style={{ fontSize: 40, color: 'var(--accent)' }}><Icon n={s.complete ? 'trophy' : 'main'} size="1em" /></div>
            <h2 className="display" style={{ margin: 0 }}>{s.complete ? 'Quest fulfilled' : 'Level gained'}</h2>
            <div style={{ fontStyle: 'italic' }}>{s.celebrate}</div>
            <button className="btn primary" style={{ alignSelf: 'center' }}>Onward</button>
          </div>
        </div>
      )}
    </>
  );
}

export function EmptyProject() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
      <div className="parchment" style={{ padding: 32, textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 44, color: 'var(--accent)' }}><Icon n="map" size="1em" /></div>
        <h2 className="display">The map is blank</h2>
        <p style={{ fontStyle: 'italic' }}>No Sessions yet in <b>questline</b>. Every adventure starts with a single question.</p>
        <button className="btn primary">New Session</button>
      </div>
    </div>
  );
}

export function ProtoPanel() {
  const { s, toggleProto } = useSession();
  if (!s.protoPanel) return null;
  return (
    <aside className="panel col" style={{ width: 360, padding: 12, borderRadius: 0, borderTop: 0, borderBottom: 0 }}>
      <div className="row"><strong className="grow">↳ Prototype: toggle placement</strong><Gauge used={38000} window={200000} /><button className="btn ghost sm" onClick={toggleProto}>✕</button></div>
      <div className="muted" style={{ fontSize: 12 }}>Child Run of Plan · summary returns to Plan on close</div>
      <div className="sep" />
      <div className="col scroll grow">
        <div className="tool"><span className="name">write_file</span><span className="grow">prototypes/toggle/index.html</span><span>new</span></div>
        <div className="msg agent"><div className="bubble">Three placements ready: Settings only, title bar, command palette. Open the preview to compare.</div></div>
        <button className="btn sm" style={{ alignSelf: 'flex-start' }}>Open preview ↗</button>
      </div>
      <Composer placeholder="Talk to the prototype Run…" />
    </aside>
  );
}
