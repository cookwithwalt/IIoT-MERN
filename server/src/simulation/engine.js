const STATION_DEFS = [
  { id: 'infeed', name: 'Conveyor Infeed', type: 'CONVEYOR', bufferCapacity: 20, cycleSeconds: 1.2, sensors: ['speed', 'motorLoad', 'temperature', 'vibration'] },
  { id: 'filler', name: 'Filling Station', type: 'FILLER', bufferCapacity: 12, cycleSeconds: 2.1, sensors: ['cycleTime', 'temperature', 'fillDeviation'] },
  { id: 'capper', name: 'Capping Station', type: 'CAPPER', bufferCapacity: 10, cycleSeconds: 1.7, sensors: ['motorLoad', 'temperature', 'vibration', 'cycleTime'] },
  { id: 'inspection', name: 'Quality Inspection', type: 'INSPECTION', bufferCapacity: 16, cycleSeconds: 0.9, sensors: ['rejectionRate', 'cycleTime'] }
];
export class SeededRandom {
  constructor(seed = 20261023) { this.state = seed >>> 0; }
  next() { this.state = (1664525 * this.state + 1013904223) >>> 0; return this.state / 4294967296; }
  range(min, max) { return min + this.next() * (max - min); }
}
export class SimulationEngine {
  constructor({ seed = 20261023 } = {}) { this.seed = seed; this.random = new SeededRandom(seed); this.reset(); }
  reset() {
    this.clockSeconds = 0; this.status = 'PAUSED'; this.ticks = 0; this.goodProducts = 0; this.rejectedProducts = 0; this.totalIntroduced = 0; this.totalProcessed = 0; this.lineDowntimeSeconds = 0; this.expectedGood = 0;
    this.buffers = [0, 0, 0, 0]; this.activeFaults = []; this.events = []; this.telemetry = []; this.nextId = 1;
    this.machines = STATION_DEFS.map(d => ({ ...d, state: 'IDLE', processed: 0, inputBuffer: 0, outputBuffer: 0, activeFault: false, elapsed: 0, blockedSeconds: 0, starvedSeconds: 0, faultSeconds: 0, readings: {} }));
    this.record('info', 'Simulation reset', 'A new simulation run was initialized.', 'SYSTEM');
    return this.snapshot();
  }
  record(severity, title, message, sourceStation, extra = {}) {
    const event = { id: String(this.nextId++), simulationTime: this.clockSeconds, severity, title, message, sourceStation, ...extra };
    this.events.unshift(event); if (this.events.length > 500) this.events.length = 500; return event;
  }
  injectFault({ station, type, severity = 'critical', durationSeconds = 120 }) {
    const m = this.machines.find(x => x.name === station || x.id === station);
    const valid = ['CONVEYOR_JAM', 'FILLING_SLOWDOWN', 'CAPPER_FAILURE', 'HIGH_MOTOR_LOAD', 'REJECTION_SPIKE', 'SENSOR_ANOMALY'];
    if (!m) throw new Error('Unknown station');
    if (!valid.includes(type)) throw new Error('Unsupported fault type');
    if (!Number.isFinite(durationSeconds) || durationSeconds < 5 || durationSeconds > 3600) throw new Error('Duration must be 5–3600 simulation seconds');
    if (this.activeFaults.some(f => f.stationId === m.id && f.type === type)) throw new Error('This fault is already active on the selected station');
    if (type === 'CONVEYOR_JAM' && m.id !== 'infeed') throw new Error('Conveyor jam applies to Conveyor Infeed');
    if (type === 'FILLING_SLOWDOWN' && m.id !== 'filler') throw new Error('Filling slowdown applies to Filling Station');
    if (type === 'CAPPER_FAILURE' && m.id !== 'capper') throw new Error('Capper failure applies to Capping Station');
    if (type === 'REJECTION_SPIKE' && m.id !== 'inspection') throw new Error('Rejection spike applies to Quality Inspection');
    const fault = { id: 'F' + this.nextId++, stationId: m.id, station: m.name, type, severity, startTime: this.clockSeconds, endTime: this.clockSeconds + durationSeconds, status: 'ACTIVE' };
    this.activeFaults.push(fault); m.activeFault = true;
    this.record(severity, 'Fault injected: ' + type.replaceAll('_', ' ').toLowerCase(), 'Operator injected ' + type + ' for ' + durationSeconds + ' simulated seconds.', m.name, { category: 'INITIATING_FAULT', faultId: fault.id, parentEventId: null, affectedStations: [] });
    if (this.status !== 'RUNNING') this.status = 'RUNNING';
    return fault;
  }
  clearFault(id) {
    const fault = this.activeFaults.find(f => f.id === id);
    if (!fault) throw new Error('Active fault not found');
    fault.status = 'RESOLVED'; fault.resolutionTime = this.clockSeconds; this.activeFaults = this.activeFaults.filter(f => f.id !== id);
    const m = this.machines.find(x => x.id === fault.stationId); if (m) m.activeFault = this.activeFaults.some(f => f.stationId === m.id);
    this.record('info', 'Fault cleared', fault.type.replaceAll('_', ' ') + ' cleared by operator.', fault.station, { category: 'RECOVERY', faultId: id });
    return fault;
  }
  applyScenario(name) {
    if (name === 'normal-production') { this.status = 'RUNNING'; this.record('info', 'Normal production started', 'Line running with baseline operating parameters.', 'SYSTEM'); return; }
    if (name === 'downstream-failure') return this.injectFault({ station: 'Capping Station', type: 'CAPPER_FAILURE', severity: 'critical', durationSeconds: 120 });
    if (name === 'quality-degradation') return this.injectFault({ station: 'Quality Inspection', type: 'REJECTION_SPIKE', severity: 'warning', durationSeconds: 120 });
    if (name === 'conveyor-jam') return this.injectFault({ station: 'Conveyor Infeed', type: 'CONVEYOR_JAM', severity: 'critical', durationSeconds: 60 });
    throw new Error('Unknown scenario');
  }
  tick(seconds = 1) {
    if (this.status !== 'RUNNING') return this.snapshot();
    for (let step = 0; step < seconds; step++) this._step();
    return this.snapshot();
  }
  _step() {
    this.clockSeconds++; this.ticks++;
    for (const fault of [...this.activeFaults]) if (this.clockSeconds >= fault.endTime) { this.clearFault(fault.id); }
    const faultFor = id => this.activeFaults.find(f => f.stationId === id);
    const capperDown = Boolean(faultFor('capper')?.type === 'CAPPER_FAILURE');
    const fillerSlow = Boolean(faultFor('filler')?.type === 'FILLING_SLOWDOWN');
    const conveyorDown = Boolean(faultFor('infeed')?.type === 'CONVEYOR_JAM');
    const inspectionDown = false;
    const arrival = !conveyorDown && this.random.next() < 0.88 && this.buffers[0] < this.machines[0].bufferCapacity ? 1 : 0;
    this.buffers[0] += arrival; this.totalIntroduced += arrival;
    if (arrival) this.expectedGood += 0.88;
    for (let i = this.machines.length - 1; i >= 0; i--) {
      const m = this.machines[i], fault = faultFor(m.id), blocked = i < 3 && this.buffers[i + 1] >= this.machines[i + 1].bufferCapacity;
      const starved = this.buffers[i] <= 0;
      let isFaulted = Boolean(fault && ['CONVEYOR_JAM', 'CAPPER_FAILURE'].includes(fault.type));
      if (fault?.type === 'FILLING_SLOWDOWN') m.elapsed += 0.5;
      else m.elapsed += 1;
      const interval = m.cycleSeconds * (fillerSlow && m.id === 'filler' ? 2.6 : 1);
      let processedNow = 0;
      if (!isFaulted && !blocked && !starved && m.elapsed >= interval) {
        m.elapsed = 0; this.buffers[i]--; processedNow = 1;
        if (i < 3 && this.buffers[i + 1] < this.machines[i + 1].bufferCapacity) this.buffers[i + 1]++;
        m.processed++; this.totalProcessed++;
        if (i === 3) {
          const rejected = fault?.type === 'REJECTION_SPIKE' ? this.random.next() < 0.45 : this.random.next() < 0.04;
          if (rejected) this.rejectedProducts++; else this.goodProducts++;
        }
      }
      if (isFaulted) { m.state = 'FAULT'; m.faultSeconds++; }
      else if (blocked) { m.state = 'BLOCKED'; m.blockedSeconds++; }
      else if (starved) { m.state = 'STARVED'; m.starvedSeconds++; }
      else if (fault?.type === 'HIGH_MOTOR_LOAD' || fault?.type === 'SENSOR_ANOMALY') m.state = 'WARNING';
      else m.state = processedNow ? 'RUNNING' : 'IDLE';
      m.inputBuffer = this.buffers[i]; m.outputBuffer = i < 3 ? this.buffers[i + 1] : 0;
      if (m.state === 'BLOCKED' && this.ticks % 5 === 0) this.record('warning', m.name + ' blocked', 'Output buffer is full; upstream station cannot transfer another unit.', m.name, { category: 'PROPAGATED_CONSEQUENCE', parentEventId: this.events.find(e => e.category === 'INITIATING_FAULT' && e.faultId === this.activeFaults[0]?.id)?.id || null, affectedStations: [m.id] });
      const noise = () => this.random.range(-1, 1);
      m.readings = { motorLoad: Math.max(0, Math.min(100, 42 + noise() * 4 + (fault?.type === 'HIGH_MOTOR_LOAD' ? 38 : 0) + (isFaulted ? 30 : 0))), temperature: 41 + noise() * 2 + (isFaulted ? 10 : 0), vibration: Math.max(0, 2.2 + noise() * 0.7 + (isFaulted ? 5 : 0)), speed: conveyorDown && m.id === 'infeed' ? 0 : 0.45 + noise() * 0.04, cycleTime: interval, fillDeviation: noise() * (fault?.type === 'SENSOR_ANOMALY' ? 9 : 1.8), rejectionRate: m.id === 'inspection' ? (fault?.type === 'REJECTION_SPIKE' ? 45 : 4) : null };
      this.telemetry.push({ simulationTime: this.clockSeconds, machineId: m.id, readings: { ...m.readings }, state: m.state });
    }
    if (this.telemetry.length > 2000) this.telemetry.splice(0, this.telemetry.length - 2000);
    if (this.machines.some(m => ['FAULT', 'BLOCKED'].includes(m.state))) this.lineDowntimeSeconds++;
    if (this.ticks % 10 === 0) this.record('info', 'Simulation heartbeat', 'Simulation advanced; machine states and sensor values updated.', 'SYSTEM', { category: 'HEARTBEAT' });
  }
  snapshot() {
    const activeFaults = this.activeFaults.length;
    const minutes = this.clockSeconds / 60;
    const metrics = { totalIntroduced: this.totalIntroduced, totalProcessed: this.totalProcessed, goodProducts: this.goodProducts, rejectedProducts: this.rejectedProducts, throughput: minutes > 0 ? this.goodProducts / minutes : 0, activeFaults, productionLoss: Math.max(0, Math.round(this.expectedGood - this.goodProducts)), availability: this.clockSeconds ? Math.max(0, 1 - this.lineDowntimeSeconds / this.clockSeconds) : null };
    return { status: this.status, clockSeconds: this.clockSeconds, seed: this.seed, metrics, machines: this.machines.map(m => ({ ...m, sensors: undefined })), activeFaults: [...this.activeFaults], events: this.events.slice(0, 50) };
  }
}
export { STATION_DEFS };
