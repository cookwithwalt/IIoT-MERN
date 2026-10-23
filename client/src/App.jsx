import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, CircleHelp, Factory, Gauge, Play, Pause, RotateCcw, Zap, Thermometer, Waves, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const stations = ['Conveyor Infeed', 'Filling Station', 'Capping Station', 'Quality Inspection'];
const faultTypes = [
  { value: 'CONVEYOR_JAM', label: 'Conveyor jam' },
  { value: 'FILLING_SLOWDOWN', label: 'Filling slowdown' },
  { value: 'CAPPER_FAILURE', label: 'Capper failure' },
  { value: 'HIGH_MOTOR_LOAD', label: 'High motor load' },
  { value: 'REJECTION_SPIKE', label: 'Inspection rejection spike' },
  { value: 'SENSOR_ANOMALY', label: 'Intermittent sensor anomaly' }
];
const fmt = (n, digits = 0) => Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: digits });
function Metric({ label, value, unit, note, icon: Icon, tone = '' }) {
  return <article className="metric"><div className="metric-top"><span>{label}</span><span className={'metric-icon ' + tone}><Icon size={17}/></span></div><div className="metric-value">{value}<small>{unit}</small></div><div className="metric-note">{note}</div></article>;
}
function StatePill({ state }) { return <span className={'state state-' + String(state || 'IDLE').toLowerCase()}><i />{state || 'IDLE'}</span>; }

export default function App() {
  const [snapshot, setSnapshot] = useState(null);
  const [history, setHistory] = useState([]);
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState('Connecting');
  const [faultType, setFaultType] = useState('CAPPER_FAILURE');
  const [station, setStation] = useState('Capping Station');
  const [severity, setSeverity] = useState('critical');
  const [duration, setDuration] = useState(120);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useCallback(async (path, options = {}) => {
    const res = await fetch(API + path, { headers: { 'Content-Type': 'application/json' }, ...options });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || 'Request failed (' + res.status + ')');
    return data;
  }, []);
  const refresh = useCallback(async () => {
    try {
      const [s, e] = await Promise.all([request('/api/simulation/status'), request('/api/events?limit=8')]);
      setSnapshot(s); setEvents(e.events || []); setStatus('Connected'); setError('');
      const point = { time: new Date().toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }), throughput: s.metrics?.throughput || 0, good: s.metrics?.goodProducts || 0, rejected: s.metrics?.rejectedProducts || 0 };
      setHistory(old => [...old.slice(-29), point]);
    } catch (err) { setStatus('API unavailable'); setError(err.message); }
  }, [request]);
  useEffect(() => { refresh(); const id = setInterval(refresh, 1500); return () => clearInterval(id); }, [refresh]);
  const action = async (path, body) => { setBusy(true); setError(''); try { await request(path, { method: 'POST', body: JSON.stringify(body || {}) }); await refresh(); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  const injectFault = () => action('/api/simulation/faults', { station, type: faultType, severity, durationSeconds: Number(duration) });
  const clearFault = async id => { setBusy(true); try { await request('/api/simulation/faults/' + encodeURIComponent(id), { method: 'DELETE' }); await refresh(); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  const machines = snapshot?.machines || [];
  const metrics = snapshot?.metrics || {};
  const running = snapshot?.status === 'RUNNING';
  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><div className="brand-mark"><Activity size={22}/></div><div><b>LinePulse</b><span>INDUSTRIAL SIMULATOR</span></div></div>
      <div className="nav-label">OPERATIONS</div><div className="nav-item active"><Gauge size={17}/>Overview</div><div className="nav-item"><Factory size={17}/>Virtual factory</div><div className="nav-item"><Waves size={17}/>Telemetry</div><div className="nav-item"><AlertTriangle size={17}/>Incident investigation</div>
      <div className="sidebar-bottom"><div className="sim-tag"><span className="live-dot"/><div><b>Software simulation</b><small>No physical devices connected</small></div></div><div className="version">LINEPULSE / 1.0.0</div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">PLANT 01 / PACKAGING</div><h1>Operations overview</h1></div><div className="top-actions"><span className={'connection ' + (status === 'Connected' ? 'ok' : 'bad')}><i/>{status}</span><button className="btn secondary" disabled={busy} onClick={() => action('/api/simulation/reset')}><RotateCcw size={15}/> Reset run</button><button className="btn primary" disabled={busy || !snapshot} onClick={() => action(running ? '/api/simulation/pause' : '/api/simulation/start')} >{running ? <Pause size={15}/> : <Play size={15}/>} {running ? 'Pause line' : 'Start line'}</button></div></header>
      {error && <div className="error-banner"><AlertTriangle size={16}/>{error}<button onClick={() => setError('')}>Dismiss</button></div>}
      <section className="summary-strip"><div><span className="eyebrow">SIMULATED CLOCK</span><strong>{fmt(snapshot?.clockSeconds)} <small>sec</small></strong></div><div><span className="eyebrow">RUN STATUS</span><StatePill state={snapshot?.status}/></div><div><span className="eyebrow">LINE HEALTH</span><strong className={metrics.activeFaults ? 'text-warn' : 'text-good'}>{metrics.activeFaults ? 'Attention required' : 'Nominal'}</strong></div><div><span className="eyebrow">ACTIVE FAULTS</span><strong>{fmt(metrics.activeFaults)}</strong></div></section>
      <section className="metrics-grid"><Metric label="Good products" value={fmt(metrics.goodProducts)} unit=" units" note="Accepted at final inspection" icon={CheckCircle2} tone="green"/><Metric label="Rejected products" value={fmt(metrics.rejectedProducts)} unit=" units" note="Quality inspection rejects" icon={AlertTriangle} tone="orange"/><Metric label="Current throughput" value={fmt(metrics.throughput, 1)} unit=" /min" note="Good units, last simulated minute" icon={Gauge}/><Metric label="Est. production loss" value={fmt(metrics.productionLoss)} unit=" units" note="Against configured baseline" icon={Zap} tone="red"/></section>
      <section className="content-grid">
        <article className="panel factory-panel"><div className="panel-heading"><div><h2>Virtual factory floor</h2><p>Finite-buffer production flow · infeed to inspection</p></div><span className="simulation-label"><span className="live-dot"/> LIVE MODEL</span></div>
          <div className="factory-line">{stations.map((name, i) => { const m = machines.find(x => x.name === name) || machines[i]; return <div className="station-wrap" key={name}>{i > 0 && <div className={'conveyor ' + (m?.state === 'BLOCKED' ? 'blocked' : '')}><span/></div>}<div className={'station ' + String(m?.state || 'IDLE').toLowerCase()}><div className="station-number">0{i + 1}</div><div className="machine-symbol">{i === 0 ? '⇢' : i === 1 ? '◉' : i === 2 ? '⊙' : '✓'}</div><b>{name}</b><StatePill state={m?.state}/><div className="station-stats"><span>Processed</span><strong>{fmt(m?.processed)}</strong><span>Queue</span><strong>{fmt(m?.inputBuffer)} / {fmt(m?.bufferCapacity)}</strong></div>{m?.activeFault && <span className="fault-chip"><AlertTriangle size={12}/> Fault active</span>}</div></div>; })}</div>
          <div className="legend"><span><i className="legend-dot green"/>Running</span><span><i className="legend-dot orange"/>Warning / blocked</span><span><i className="legend-dot red"/>Fault</span></div>
        </article>
        <article className="panel"><div className="panel-heading"><div><h2>Production trend</h2><p>Backend samples · refreshes every 1.5 seconds</p></div></div><div className="chart-wrap">{history.length < 2 ? <div className="chart-empty">Waiting for simulation samples…</div> : <ResponsiveContainer width="100%" height="100%"><AreaChart data={history}><defs><linearGradient id="throughputFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopOpacity={0.22} stopColor="#16866c"/><stop offset="100%" stopOpacity={0} stopColor="#16866c"/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9edf0"/><XAxis dataKey="time" tick={{fontSize:10, fill:'#77838d'}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:10, fill:'#77838d'}} axisLine={false} tickLine={false} width={30}/><Tooltip/><Area type="monotone" dataKey="throughput" name="Good units/min" stroke="#16866c" fill="url(#throughputFill)" strokeWidth={2} isAnimationActive={false}/></AreaChart></ResponsiveContainer>}</div><div className="chart-foot"><span><i className="legend-dot green"/> Good units per minute</span><span>Rolling view</span></div></article>
      </section>
      <section className="content-grid lower-grid">
        <article className="panel fault-panel"><div className="panel-heading"><div><h2>Fault lab</h2><p>Inject a fault into the active simulation</p></div><span className="panel-icon"><Zap size={17}/></span></div><div className="form-grid"><label>Station<select value={station} onChange={e => setStation(e.target.value)}>{stations.map(s => <option key={s}>{s}</option>)}</select></label><label>Fault type<select value={faultType} onChange={e => setFaultType(e.target.value)}>{faultTypes.map(f => <option value={f.value} key={f.value}>{f.label}</option>)}</select></label><label>Severity<select value={severity} onChange={e => setSeverity(e.target.value)}><option value="warning">Warning</option><option value="critical">Critical</option></select></label><label>Duration (sim sec)<input type="number" min="5" max="3600" value={duration} onChange={e => setDuration(e.target.value)}/></label></div><button className="btn primary full" disabled={busy || status !== 'Connected'} onClick={injectFault}><Zap size={15}/> Inject fault</button><div className="scenario-row"><span>Quick scenarios</span><button className="btn secondary small" disabled={busy} onClick={() => action('/api/simulation/scenarios', { name: 'downstream-failure' })}>Capper failure</button><button className="btn secondary small" disabled={busy} onClick={() => action('/api/simulation/scenarios', { name: 'quality-degradation' })}>Quality drop</button></div></article>
        <article className="panel incidents-panel"><div className="panel-heading"><div><h2>Recent events</h2><p>Recorded by the simulation rule engine</p></div><span className="count-badge">{events.length}</span></div>{events.length === 0 ? <div className="empty-events"><CircleHelp size={22}/><span>No events recorded yet.</span><small>Start the line or inject a fault to generate evidence.</small></div> : <div className="event-list">{events.slice(0, 7).map((event, i) => <div className="event-row" key={event._id || event.id || i}><span className={'event-icon ' + String(event.severity || 'info').toLowerCase()}><AlertTriangle size={14}/></span><div className="event-copy"><b>{event.title || event.type || 'Simulation event'}</b><p>{event.message || event.explanation || event.sourceStation || 'Recorded state transition'}</p><small>SIM +{fmt(event.simulationTime ?? event.timestamp)}s · {event.category || event.severity || 'INFO'}</small></div></div>)}</div>}</article>
      </section>
      <footer>LinePulse is a deterministic, software-only teaching simulation. All telemetry is synthetic and does not represent measurements from real industrial equipment.</footer>
    </main>
  </div>;
}
